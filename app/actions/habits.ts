'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { HabitSchema, RecordSchema, UndoRecordSchema, UuidSchema } from '@/lib/validation/schemas'
import { calcularPuntos } from '@/lib/logic/points'
import { evaluarInsignias } from '@/lib/logic/badges'
import { checkRateLimit } from '@/lib/ratelimit'
import type { Esfuerzo } from '@/lib/types'

function today(): string {
  return new Date().toISOString().split('T')[0]
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

  // Rate limiting: máximo 20 checks por minuto por usuario
  const { allowed } = checkRateLimit(user.id, 'check_habit', { maxRequests: 20, windowMs: 60_000 })
  if (!allowed) return { error: 'Demasiadas operaciones. Esperá un minuto.' }

  // Verificar que el hábito pertenece al usuario autenticado
  const { data: habit } = await supabase
    .from('habits')
    .select('id, esfuerzo, activo')
    .eq('id', parsed.data.habit_id)
    .eq('user_id', user.id)
    .single()

  if (!habit) return { error: 'Hábito no encontrado' }
  if (!habit.activo) return { error: 'Hábito inactivo' }

  // Obtener estado del usuario — la racha ya fue evaluada al cargar la página
  const { data: state } = await supabase
    .from('user_state')
    .select('puntos, streak, best_streak')
    .eq('user_id', user.id)
    .single()

  if (!state) return { error: 'Estado de usuario no encontrado' }

  // Puntos calculados server-side usando la racha actual (evaluada al inicio del día)
  const pts = calcularPuntos(habit.esfuerzo as Esfuerzo, state.streak)

  const fechaHoy = today()

  // Guardar registro — el constraint unique(habit_id, fecha) previene duplicados a nivel DB
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

  // Solo actualizar puntos — la racha NO se toca aquí, se evalúa al inicio del día
  const nuevosPuntos = state.puntos + pts
  await supabase
    .from('user_state')
    .update({
      puntos: nuevosPuntos,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  // Evaluar insignias con el estado actualizado
  const nuevoState = { ...state, puntos: nuevosPuntos }
  const { data: badgesExistentes } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id)

  const badgesYa = badgesExistentes?.map(b => b.badge_id) ?? []
  const nuevasInsignias = evaluarInsignias(nuevoState as Parameters<typeof evaluarInsignias>[0], badgesYa)

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
