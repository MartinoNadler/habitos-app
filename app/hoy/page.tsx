import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import HoyContent from './HoyContent'
import { evaluarRachaDiaria } from '@/lib/logic/streak'
import { evaluarInsignias } from '@/lib/logic/badges'
import type { Habit, Record as HabitRecord, HabitWithRecord, UserState } from '@/lib/types'

function fechaHoy(): string {
  return new Date().toISOString().split('T')[0]
}

function formatearFecha(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Calcula la racha actual de un hábito (días consecutivos hacia atrás desde hoy o ayer) */
function calcularStreakHabito(
  habitId: string,
  records: { habit_id: string; fecha: string }[],
  today: string,
): number {
  const fechas = new Set(records.filter(r => r.habit_id === habitId).map(r => r.fecha))
  const start = new Date(today + 'T00:00:00')
  // Si no completó hoy, empezar desde ayer
  if (!fechas.has(today)) start.setDate(start.getDate() - 1)
  let streak = 0
  const d = new Date(start)
  while (streak < 30) {
    const ds = d.toISOString().split('T')[0]
    if (!fechas.has(ds)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

async function actualizarEstadoDiario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  state: UserState,
): Promise<UserState> {
  const hoy = fechaHoy()
  if (state.last_active_date === hoy) return state

  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const ayerStr = ayer.toISOString().split('T')[0]

  const [recordsAyer, habitsTotal] = await Promise.all([
    supabase.from('records').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('fecha', ayerStr),
    supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('activo', true),
  ])

  const { nuevaRacha, rota, bonusPts } = evaluarRachaDiaria({
    completadosAyer: recordsAyer.count ?? 0,
    totalHabitos: habitsTotal.count ?? 0,
    lastActiveDate: state.last_active_date,
    today: hoy,
    streakActual: state.streak,
  })

  const nuevosBestStreak = Math.max(state.best_streak, nuevaRacha)
  const nuevosPuntos = state.puntos + bonusPts

  const nuevoState: UserState = {
    ...state,
    streak: nuevaRacha,
    best_streak: nuevosBestStreak,
    puntos: nuevosPuntos,
    last_active_date: hoy,
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from('user_state')
    .update({
      streak: nuevaRacha,
      best_streak: nuevosBestStreak,
      puntos: nuevosPuntos,
      last_active_date: hoy,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  const { data: badgesExistentes } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId)
  const badgesYa = badgesExistentes?.map(b => b.badge_id) ?? []
  const nuevas = evaluarInsignias(nuevoState, badgesYa)
  if (nuevas.length > 0) {
    await supabase.from('user_badges').insert(nuevas.map(badge_id => ({ user_id: userId, badge_id })))
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`Racha: ${state.streak} → ${nuevaRacha}${rota ? ' (rota)' : ''}${bonusPts > 0 ? ` +${bonusPts}pts bonus` : ''}`)
  }

  return nuevoState
}

export default async function HoyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = fechaHoy()

  // Últimos 7 días (para mini barras semanales)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy + 'T00:00:00')
    d.setDate(d.getDate() - 6 + i) // de más viejo (0) a hoy (6)
    return d.toISOString().split('T')[0]
  })
  const hace7DiasStr = weekDates[0]

  // Últimos 30 días (para calcular streak por hábito con precisión)
  const hace30 = new Date(hoy + 'T00:00:00')
  hace30.setDate(hace30.getDate() - 29)
  const hace30DiasStr = hace30.toISOString().split('T')[0]

  const [stateRes, habitsRes, recordsHoyRes, recordsRecientesRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true).order('creado_en'),
    supabase.from('records').select('*').eq('user_id', user.id).eq('fecha', hoy),
    supabase.from('records').select('habit_id, fecha').eq('user_id', user.id).gte('fecha', hace30DiasStr),
  ])

  // Crear user_state si el trigger aún no lo generó
  if (!stateRes.data) {
    await supabase.from('user_state').insert({ user_id: user.id })
    stateRes.data = {
      user_id: user.id,
      puntos: 0, streak: 0, best_streak: 0,
      last_active_date: null,
      updated_at: new Date().toISOString(),
    }
  }

  const state = await actualizarEstadoDiario(supabase, user.id, stateRes.data as UserState)
  const habits = (habitsRes.data ?? []) as Habit[]
  const recordsHoy = (recordsHoyRes.data ?? []) as HabitRecord[]
  const recordsRecientes = (recordsRecientesRes.data ?? []) as { habit_id: string; fecha: string }[]

  const recordMap = new Map(recordsHoy.map(r => [r.habit_id, r]))
  const weekDateSet = new Set(weekDates)

  const habitDatos = habits.map((h, index) => {
    const habit: HabitWithRecord = { ...h, record: recordMap.get(h.id) }

    // Streak actual por hábito
    const streakActual = calcularStreakHabito(h.id, recordsRecientes, hoy)

    // Días de la semana completados
    const weekCompleted = recordsRecientes
      .filter(r => r.habit_id === h.id && weekDateSet.has(r.fecha))
      .map(r => r.fecha)

    return { habit, index, streakActual, weekCompleted }
  })

  const completadosHoy = recordsHoy.length
  const totalHabitos = habits.length

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(ellipse at top, #111827, #090B14)' }}>
      <TopBar titulo="Hoy" fecha={formatearFecha(hoy)} puntos={state.puntos} />
      <HoyContent
        state={state}
        habitDatos={habitDatos}
        weekDates={weekDates}
        today={hoy}
        completadosHoy={completadosHoy}
        totalHabitos={totalHabitos}
      />
      <BottomNav />
    </div>
  )
}
