'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { LoginSchema, RegisterSchema } from '@/lib/validation/schemas'

const HABITOS_INICIALES = [
  { nombre: 'Ejercicio', emoji: '🏃', categoria: 'salud',   esfuerzo: 'dificil',  frecuencia: 'diario', campo_extra: 'ninguno', meta_semanal: 1 },
  { nombre: 'Estudio',   emoji: '📚', categoria: 'estudio', esfuerzo: 'moderado', frecuencia: 'diario', campo_extra: 'minutos', meta_semanal: 1 },
  { nombre: 'Sueño',     emoji: '😴', categoria: 'sueño',   esfuerzo: 'facil',    frecuencia: 'diario', campo_extra: 'horas',   meta_semanal: 1 },
  { nombre: 'Agua',      emoji: '💧', categoria: 'salud',   esfuerzo: 'facil',    frecuencia: 'diario', campo_extra: 'vasos',   meta_semanal: 1 },
] as const

const RECOMPENSAS_INICIALES = [
  { nombre: 'Serie extra',      emoji: '🎬', costo: 20,  descripcion: 'Ver un capítulo extra' },
  { nombre: 'Comida favorita',  emoji: '🍕', costo: 35,  descripcion: 'Pedir o cocinar tu comida favorita' },
  { nombre: 'Compra personal',  emoji: '🛍️', costo: 100, descripcion: 'Algo que quieras comprarte' },
  { nombre: 'Día libre',        emoji: '🏖️', costo: 200, descripcion: 'Un día sin obligaciones' },
] as const

export async function loginAction(formData: FormData) {
  const raw = { email: formData.get('email'), password: formData.get('password') }
  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Credenciales incorrectas' }

  redirect('/hoy')
}

export async function registerAction(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  }
  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { error: error.message }

  const userId = data.user?.id
  if (!userId) return { error: 'Error al crear cuenta' }

  // Usamos service role para los inserts iniciales porque la sesión del usuario
  // aún no está disponible en cookies al momento del signUp server-side
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await admin.from('user_state').upsert({ user_id: userId })

  await admin.from('habits').insert(
    HABITOS_INICIALES.map(h => ({ ...h, user_id: userId }))
  )

  await admin.from('rewards').insert(
    RECOMPENSAS_INICIALES.map(r => ({ ...r, user_id: userId }))
  )

  redirect('/hoy')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
