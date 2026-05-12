import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingContent from './OnboardingContent'
import { HABITOS_DISPONIBLES } from '@/lib/onboarding'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si ya tiene hábitos, no necesita onboarding
  const { count } = await supabase
    .from('habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('activo', true)

  if (count && count > 0) redirect('/hoy')

  const nombre: string | undefined = user.user_metadata?.display_name || undefined

  return <OnboardingContent habitos={[...HABITOS_DISPONIBLES]} nombre={nombre} />
}
