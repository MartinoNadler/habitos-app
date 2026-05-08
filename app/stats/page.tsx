import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { BADGES } from '@/lib/logic/badges'
import type { Habit, Record as HabitRecord, UserState, UserBadge } from '@/lib/types'

interface HabitStats {
  habit: Habit
  completados: number
  promedio: number | null
  mejorRacha: number
  pctCumplimiento: number
}

function calcularRachaPorHabito(records: HabitRecord[], habitId: string): number {
  const fechas = records
    .filter(r => r.habit_id === habitId)
    .map(r => r.fecha)
    .sort()

  if (fechas.length === 0) return 0

  let maxStreak = 1
  let curr = 1

  for (let i = 1; i < fechas.length; i++) {
    const prev = new Date(fechas[i - 1] + 'T00:00:00')
    const cur  = new Date(fechas[i] + 'T00:00:00')
    const diff = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 1) {
      curr++
      maxStreak = Math.max(maxStreak, curr)
    } else {
      curr = 1
    }
  }

  return maxStreak
}

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stateRes, habitsRes, recordsRes, badgesRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true),
    supabase.from('records').select('*').eq('user_id', user.id),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
  ])

  const state = stateRes.data as UserState
  const habits = (habitsRes.data ?? []) as Habit[]
  const records = (recordsRes.data ?? []) as HabitRecord[]
  const badgesDesbloqueados = new Set((badgesRes.data ?? []).map((b: UserBadge) => b.badge_id))

  // Stats por hábito
  const diasConRegistros = new Set(records.map(r => r.fecha)).size
  const diasDesdeCreacion = Math.max(
    ...habits.map(h => {
      const d = new Date(h.creado_en)
      const diff = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
      return diff
    }),
    1
  )

  const habitStats: HabitStats[] = habits.map(h => {
    const hRecords = records.filter(r => r.habit_id === h.id)
    const completados = hRecords.length
    const conValor = hRecords.filter(r => r.valor != null)
    const promedio = conValor.length > 0
      ? conValor.reduce((acc, r) => acc + (r.valor ?? 0), 0) / conValor.length
      : null
    const mejorRacha = calcularRachaPorHabito(records, h.id)
    const pctCumplimiento = Math.round((completados / diasDesdeCreacion) * 100)

    return { habit: h, completados, promedio, mejorRacha, pctCumplimiento }
  })

  return (
    <div className="min-h-dvh bg-app-bg pb-20">
      <TopBar titulo="Estadísticas" puntos={state?.puntos} />

      <main className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Cards resumen */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Días registrados', value: diasConRegistros, icon: '📅' },
            { label: 'Mejor racha', value: `${state?.best_streak ?? 0}d`, icon: '🔥' },
            { label: 'Puntos totales', value: state?.puntos ?? 0, icon: '⚡' },
            { label: 'Hábitos activos', value: habits.length, icon: '✅' },
          ].map(card => (
            <div key={card.label} className="bg-surface border border-surface-3 rounded-xl3 p-4">
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="font-mono font-bold text-2xl text-white">{card.value}</div>
              <div className="text-text-muted text-xs mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Stats por hábito */}
        {habitStats.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
              Por hábito
            </h2>
            <div className="space-y-3">
              {habitStats.map(({ habit, completados, promedio, mejorRacha, pctCumplimiento }) => (
                <div key={habit.id} className="bg-surface border border-surface-3 rounded-xl3 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{habit.emoji}</span>
                    <span className="font-semibold text-white">{habit.nombre}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="font-mono font-bold text-lg text-white">{completados}</div>
                      <div className="text-text-muted text-xs">días</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-lg text-amber">{mejorRacha}d</div>
                      <div className="text-text-muted text-xs">mejor racha</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-lg text-green">{pctCumplimiento}%</div>
                      <div className="text-text-muted text-xs">cumplimiento</div>
                    </div>
                  </div>
                  {promedio != null && habit.campo_extra !== 'ninguno' && (
                    <div className="mt-2 pt-2 border-t border-surface-3 text-center">
                      <span className="text-text-dim text-xs">
                        Promedio: <span className="font-mono text-white">{promedio.toFixed(1)}</span> {habit.campo_extra}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Grid de insignias */}
        <section>
          <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
            Insignias
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map(badge => {
              const desbloqueado = badgesDesbloqueados.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`bg-surface border rounded-xl3 p-3 text-center transition-all ${
                    desbloqueado ? 'border-amber/30 bg-amber/5' : 'border-surface-3 opacity-40'
                  }`}
                >
                  <div className="text-2xl mb-1">{badge.emoji}</div>
                  <div className="text-xs font-medium text-white leading-tight">{badge.nombre}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{badge.descripcion}</div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
