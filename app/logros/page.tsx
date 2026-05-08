import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import RewardCard from '@/components/rewards/RewardCard'
import type { Reward, Redemption, UserState } from '@/lib/types'

function getLimiteMensual(costo: number): number {
  if (costo >= 201) return 1
  if (costo >= 51)  return 1
  if (costo >= 21)  return 2
  return 4
}

export default async function LogrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const inicioTrimestre = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).toISOString().split('T')[0]

  const [stateRes, rewardsRes, redemptionsRes, historialRes] = await Promise.all([
    supabase.from('user_state').select('puntos').eq('user_id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id).order('costo'),
    supabase.from('redemptions').select('*').eq('user_id', user.id).gte('fecha', inicioTrimestre),
    supabase.from('redemptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const state = stateRes.data as UserState
  const rewards = (rewardsRes.data ?? []) as Reward[]
  const redemptionsMes = (redemptionsRes.data ?? []) as Redemption[]
  const historial = (historialRes.data ?? []) as Redemption[]

  // Contar canjes por reward_id en el período relevante
  const canjesPorReward: Record<string, number> = {}
  redemptionsMes.forEach(r => {
    if (r.reward_id) {
      canjesPorReward[r.reward_id] = (canjesPorReward[r.reward_id] ?? 0) + 1
    }
  })

  return (
    <div className="min-h-dvh bg-app-bg pb-20">
      <TopBar titulo="Logros" puntos={state?.puntos} />

      <main className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Puntos disponibles */}
        <div className="bg-surface border border-amber/20 rounded-xl3 p-6 text-center">
          <p className="text-text-dim text-sm mb-1">Puntos disponibles</p>
          <p className="font-mono font-bold text-5xl text-amber">{state?.puntos ?? 0}</p>
        </div>

        {/* Recompensas */}
        <section>
          <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
            Recompensas
          </h2>
          {rewards.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>No tenés recompensas</p>
              <p className="text-sm mt-1">Agregá una desde Configuración</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map(reward => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  puntosDisponibles={state?.puntos ?? 0}
                  canjesMes={canjesPorReward[reward.id] ?? 0}
                  limiteMes={getLimiteMensual(reward.costo)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Historial */}
        {historial.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
              Historial de canjes
            </h2>
            <div className="space-y-2">
              {historial.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-surface border border-surface-3 rounded-xl2 px-4 py-3">
                  <span className="text-xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{r.nombre}</p>
                    <p className="text-text-muted text-xs">{r.fecha}</p>
                  </div>
                  <span className="font-mono text-red-soft text-sm font-bold">-{r.pts}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
