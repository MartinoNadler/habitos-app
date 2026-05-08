'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function exportDataAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [habits, records, state, rewards, redemptions, badges] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase.from('records').select('*').eq('user_id', user.id),
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id),
    supabase.from('redemptions').select('*').eq('user_id', user.id),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
  ])

  return {
    ok: true,
    data: {
      exportado_en: new Date().toISOString(),
      email: user.email,
      estado: state.data,
      habitos: habits.data,
      registros: records.data,
      recompensas: rewards.data,
      canjes: redemptions.data,
      insignias: badges.data,
    },
  }
}

export async function deleteAccountAction(formData: FormData) {
  const confirmacion = formData.get('confirmacion')
  if (confirmacion !== 'CONFIRMAR') return { error: 'Escribí CONFIRMAR para proceder' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Usar service role para eliminar el usuario de auth
  // Los datos relacionados se eliminan por CASCADE
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.auth.signOut()

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return { error: 'Error al eliminar cuenta' }

  redirect('/login')
}
