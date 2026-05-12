import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('activo', true)
    redirect(!count || count === 0 ? '/onboarding' : '/hoy')
  } else {
    redirect('/login')
  }
}
