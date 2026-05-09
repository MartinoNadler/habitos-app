import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import StatsContent from './StatsContent'
import type { Habit, Record as HabitRecord, UserState, UserBadge } from '@/lib/types'

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
    if (diff === 1) { curr++; maxStreak = Math.max(maxStreak, curr) }
    else { curr = 1 }
  }

  return maxStreak
}

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const inicioMes = new Date()
  inicioMes.setDate(1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]

  const [stateRes, habitsRes, recordsRes, recordsMesRes, badgesRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true),
    supabase.from('records').select('*').eq('user_id', user.id),
    supabase.from('records').select('habit_id, fecha').eq('user_id', user.id).gte('fecha', inicioMesStr),
    supabase.from('user_badges').select('*').eq('user_id', user.id),
  ])

  const state = stateRes.data as UserState
  const habits = (habitsRes.data ?? []) as Habit[]
  const records = (recordsRes.data ?? []) as HabitRecord[]
  const recordsMes = (recordsMesRes.data ?? []) as { habit_id: string; fecha: string }[]
  const badges = (badgesRes.data ?? []) as UserBadge[]

  const diasConRegistros = new Set(records.map(r => r.fecha)).size
  const diasDesdeCreacion = Math.max(
    ...habits.map(h => {
      const diff = Math.round((Date.now() - new Date(h.creado_en).getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(diff, 1)
    }),
    1
  )

  const habitStats = habits.map(h => {
    const hRecords = records.filter(r => r.habit_id === h.id)
    const completados = hRecords.length
    const conValor = hRecords.filter(r => r.valor != null)
    const promedio = conValor.length > 0
      ? conValor.reduce((acc, r) => acc + (r.valor ?? 0), 0) / conValor.length
      : null
    const mejorRacha = calcularRachaPorHabito(records, h.id)
    const pctCumplimiento = Math.min(Math.round((completados / diasDesdeCreacion) * 100), 100)
    const diasEsteMes = recordsMes.filter(r => r.habit_id === h.id).length

    return { habit: h, completados, promedio, mejorRacha, pctCumplimiento, diasEsteMes }
  })

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(circle at top left, #1B1F3A, #090B14)' }}>
      <TopBar titulo="Estadísticas" puntos={state?.puntos} />
      <StatsContent
        state={state}
        habitStats={habitStats}
        diasConRegistros={diasConRegistros}
        badges={badges}
      />
      <BottomNav />
    </div>
  )
}
