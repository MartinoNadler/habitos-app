import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import ProgresoContent from './ProgresoContent'
import type { Habit, UserState } from '@/lib/types'

export default async function ProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [stateRes, habitsRes, recordsRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase.from('records').select('habit_id, fecha, pts, valor').eq('user_id', user.id),
  ])

  const state   = (stateRes.data  ?? { puntos: 0, streak: 0, best_streak: 0, last_active_date: null }) as UserState
  const habits  = (habitsRes.data ?? []) as Habit[]
  const records = (recordsRes.data ?? []) as { habit_id: string; fecha: string; pts: number; valor: number | null }[]

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}>
      <TopBar titulo="Progreso" puntos={state?.puntos} />
      <ProgresoContent state={state} habits={habits} records={records} today={today} />
      <BottomNav />
    </div>
  )
}
