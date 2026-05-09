'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { HabitSchema, RecordSchema, UndoRecordSchema, UuidSchema } from '@/lib/validation/schemas'
import { calcularPuntos } from '@/lib/logic/points'
import { evaluarRacha } from '@/lib/logic/streak'
import { evaluarInsignias } from '@/lib/logic/badges'
import type { Esfuerzo } from '@/lib/types'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Rate limiting simple usando Supabase: máximo 30 operaciones/min por usuario */
async function checkRateLimit(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  return (count ?? 0) < 30
}

export async function checkHabitAction(formData: FormData) {
  const raw = {
    habit_id: formData.get('habit_id'),
    valor: formData.get('valor') ? Number(formData.get('valor')) : undefined,
    nota: formData.get('nota') ?? undefined,
  }

  const parsed = RecordSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Rate limiting
  const ok = await checkRateLimit(supabase, user.id)
  if (!ok) return { error: 'Demasiadas operaciones. Esperá un minuto.' }

  // Verificar que el hábito pertenece al usuario autenticado
  const { data: habit } = await supabase
    .from('habits')
    .select('id, esfuerzo, activo')
    .eq('id', parsed.data.habit_id)
    .eq('user_id', user.id)  // RLS + verificación explícita
    .single()

  if (!habit) return { error: 'Hábito no encontrado' }
  if (!habit.activo) return { error: 'Hábito inactivo' }

  // Obtener estado del usuario para calcular racha y puntos server-side
  const { data: state } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!state) return { error: 'Estado de usuario no encontrado' }

  const fechaHoy = today()
  const { nuevaRacha, rota } = evaluarRacha(state.last_active_date, fechaHoy, state.streak)
  const streakParaPuntos = rota ? 0 : nuevaRacha

  // Los puntos se calculan server-side con datos de la DB, nunca del cliente
  const pts = calcularPuntos(habit.esfuerzo as Esfuerzo, streakParaPuntos)

  // Insertar o actualizar registro (upsert por constraint unique)
  const { error: recordError } = await supabase
    .from('records')
    .upsert({
      user_id: user.id,
      habit_id: parsed.data.habit_id,
      fecha: fechaHoy,
      valor: parsed.data.valor ?? null,
      nota: parsed.data.nota ?? null,
      pts,
    }, { onConflict: 'habit_id,fecha' })

  if (recordError) return { error: 'Error al guardar registro' }

  // Actualizar user_state
  const nuevaRachaFinal = streakParaPuntos + 1
  const nuevosBestStreak = Math.max(state.best_streak, nuevaRachaFinal)

  await supabase
    .from('user_state')
    .update({
      puntos: state.puntos + pts,
      streak: nuevaRachaFinal,
      best_streak: nuevosBestStreak,
      last_active_date: fechaHoy,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  // Evaluar insignias nuevas
  const nuevoState = {
    ...state,
    puntos: state.puntos + pts,
    streak: nuevaRachaFinal,
    best_streak: nuevosBestStreak,
  }

  const { data: badgesExistentes } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id)

  const badgesYa = badgesExistentes?.map(b => b.badge_id) ?? []
  const nuevasInsignias = evaluarInsignias(nuevoState, badgesYa)

  if (nuevasInsignias.length > 0) {
    await supabase.from('user_badges').insert(
      nuevasInsignias.map(badge_id => ({ user_id: user.id, badge_id }))
    )
  }

  revalidatePath('/hoy')
  return { ok: true, pts, nuevasInsignias }
}

export async function undoCheckAction(formData: FormData) {
  const raw = {
    habit_id: formData.get('habit_id'),
    fecha: formData.get('fecha'),
  }

  const parsed = UndoRecordSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que el record pertenece al usuario
  const { data: record } = await supabase
    .from('records')
    .select('id, pts')
    .eq('habit_id', parsed.data.habit_id)
    .eq('fecha', parsed.data.fecha)
    .eq('user_id', user.id)
    .single()

  if (!record) return { error: 'Registro no encontrado' }

  // Eliminar record y descontar puntos
  await supabase.from('records').delete().eq('id', record.id)

  // Actualizar puntos manualmente
  const { data: state } = await supabase
    .from('user_state')
    .select('puntos, streak')
    .eq('user_id', user.id)
    .single()

  if (state) {
    await supabase
      .from('user_state')
      .update({
        puntos: Math.max(0, state.puntos - record.pts),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  }

  revalidatePath('/hoy')
  return { ok: true }
}

export async function createHabitAction(formData: FormData) {
  const raw = {
    nombre: formData.get('nombre'),
    emoji: formData.get('emoji'),
    categoria: formData.get('categoria'),
    esfuerzo: formData.get('esfuerzo'),
    frecuencia: formData.get('frecuencia'),
    meta_semanal: formData.get('meta_semanal') ? Number(formData.get('meta_semanal')) : undefined,
    campo_extra: formData.get('campo_extra'),
  }

  const parsed = HabitSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('habits').insert({ ...parsed.data, user_id: user.id })
  if (error) return { error: 'Error al crear hábito' }

  revalidatePath('/config')
  revalidatePath('/hoy')
  return { ok: true }
}

export async function updateHabitAction(formData: FormData) {
  const habitId = UuidSchema.safeParse(formData.get('id'))
  if (!habitId.success) return { error: 'ID inválido' }

  const raw = {
    nombre: formData.get('nombre'),
    emoji: formData.get('emoji'),
    categoria: formData.get('categoria'),
    esfuerzo: formData.get('esfuerzo'),
    frecuencia: formData.get('frecuencia'),
    meta_semanal: formData.get('meta_semanal') ? Number(formData.get('meta_semanal')) : undefined,
    campo_extra: formData.get('campo_extra'),
  }

  const parsed = HabitSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('habits')
    .update(parsed.data)
    .eq('id', habitId.data)
    .eq('user_id', user.id)  // RLS + verificación explícita

  if (error) return { error: 'Error al actualizar hábito' }

  revalidatePath('/config')
  revalidatePath('/hoy')
  return { ok: true }
}

export async function deleteHabitAction(formData: FormData) {
  const habitId = UuidSchema.safeParse(formData.get('id'))
  if (!habitId.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Error al eliminar hábito' }

  revalidatePath('/config')
  revalidatePath('/hoy')
  return { ok: true }
}
