'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { LoginSchema, RegisterSchema } from '@/lib/validation/schemas'


export async function loginAction(formData: FormData) {
  const raw = { email: formData.get('email'), password: formData.get('password') }
  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Credenciales incorrectas' }

  // Si el usuario no tiene hábitos aún, mandarlo al onboarding
  const userId = data.user?.id
  if (userId) {
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activo', true)
    if (!count || count === 0) redirect('/onboarding')
  }

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

  redirect('/onboarding')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
