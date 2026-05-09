import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import LogrosContent from './LogrosContent'
import type { Reward, Redemption, UserState } from '@/lib/types'

export default async function LogrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]

  const [stateRes, rewardsRes, redemptionsMesRes, historialRes] = await Promise.all([
    supabase.from('user_state').select('puntos').eq('user_id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id).order('costo'),
    supabase.from('redemptions').select('reward_id').eq('user_id', user.id).gte('fecha', inicioMes),
    supabase.from('redemptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const state = stateRes.data as UserState
  const rewards = (rewardsRes.data ?? []) as Reward[]
  const redemptionsMes = (redemptionsMesRes.data ?? []) as { reward_id: string }[]
  const historial = (historialRes.data ?? []) as Redemption[]

  // Canjes este mes por reward_id
  const canjesPorReward: Record<string, number> = {}
  redemptionsMes.forEach(r => {
    if (r.reward_id) {
      canjesPorReward[r.reward_id] = (canjesPorReward[r.reward_id] ?? 0) + 1
    }
  })

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(circle at top left, #161A35, #090B14)' }}>
      <TopBar titulo="Logros" puntos={state?.puntos} />
      <LogrosContent
        puntos={state?.puntos ?? 0}
        rewards={rewards}
        canjesPorReward={canjesPorReward}
        historial={historial}
      />
      <BottomNav />
    </div>
  )
}
