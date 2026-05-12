import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import StatsContent from './StatsContent'
import type { Habit, UserState, UserBadge } from '@/lib/types'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stateRes, habitsRes, recordsRes, badgesRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true),
    supabase.from('records').select('habit_id, fecha, pts, valor').eq('user_id', user.id),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
  ])

  const state    = stateRes.data as UserState
  const habits   = (habitsRes.data  ?? []) as Habit[]
  const records  = (recordsRes.data ?? []) as { habit_id: string; fecha: string; pts: number; valor: number | null }[]
  const badges   = (badgesRes.data  ?? []) as UserBadge[]

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}>
      <TopBar titulo="Progreso" puntos={state?.puntos} />
      <StatsContent state={state} habits={habits} allRecords={records} badges={badges} />
      <BottomNav />
    </div>
  )
}
