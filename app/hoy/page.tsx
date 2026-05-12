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

/** ¿Debe mostrarse este hábito hoy? */
function esHabitoDeHoy(habit: Habit, hoy: string): boolean {
  if (habit.frecuencia !== 'dias_semana') return true
  const dow = new Date(hoy + 'T00:00:00').getDay()
  return (habit.dias_semana ?? []).includes(dow)
}

/** Lunes de la semana que contiene la fecha dada */
function getLunes(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  const lunes = new Date(d)
  lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return lunes.toISOString().split('T')[0]
}

/**
 * Calcula el valor de "streakActual" según el tipo de frecuencia:
 * - diario / semanal: días consecutivos completados
 * - dias_semana: días programados consecutivos completados
 * - veces_semana: completions de la semana actual (para mostrar X/N)
 */
function calcularStreakHabito(
  habit: Habit,
  records: { habit_id: string; fecha: string }[],
  today: string,
): number {
  const fechas = new Set(records.filter(r => r.habit_id === habit.id).map(r => r.fecha))

  // Para veces_semana: devolvemos el conteo de esta semana
  if (habit.frecuencia === 'veces_semana') {
    const lunesActual = getLunes(today)
    return records.filter(r => r.habit_id === habit.id && r.fecha >= lunesActual).length
  }

  // Para dias_semana: racha sobre días programados
  if (habit.frecuencia === 'dias_semana') {
    const programados = habit.dias_semana ?? []
    if (programados.length === 0) return 0
    let streak = 0
    const d = new Date(today + 'T00:00:00')
    // Si hoy está programado pero no completado, empezar desde ayer
    if (programados.includes(d.getDay()) && !fechas.has(today)) {
      d.setDate(d.getDate() - 1)
    }
    let guard = 0
    while (guard++ < 90) {
      const ds = d.toISOString().split('T')[0]
      const dow = d.getDay()
      if (!programados.includes(dow)) { d.setDate(d.getDate() - 1); continue }
      if (!fechas.has(ds)) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  // Diario (y 'semanal' legacy): días consecutivos
  const start = new Date(today + 'T00:00:00')
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
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true).order('orden', { ascending: true, nullsFirst: false }).order('creado_en'),
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

  // Solo hábitos programados para hoy
  const habitsProgramadosHoy = habits.filter(h => esHabitoDeHoy(h, hoy))

  const habitDatos = habitsProgramadosHoy.map((h, index) => {
    const habit: HabitWithRecord = { ...h, record: recordMap.get(h.id) }

    // Streak/conteo según tipo de frecuencia
    const streakActual = calcularStreakHabito(h, recordsRecientes, hoy)

    // Días de la semana completados
    const weekCompleted = recordsRecientes
      .filter(r => r.habit_id === h.id && weekDateSet.has(r.fecha))
      .map(r => r.fecha)

    return { habit, index, streakActual, weekCompleted }
  })

  // Completados hoy = registros que corresponden a hábitos programados para hoy
  const habitIdsProgramados = new Set(habitsProgramadosHoy.map(h => h.id))
  const completadosHoy = recordsHoy.filter(r => habitIdsProgramados.has(r.habit_id)).length
  const totalHabitos = habitsProgramadosHoy.length
  const displayName: string | undefined = user.user_metadata?.display_name || undefined

  // ── Resumen semanal ───────────────────────────────────────────────────────
  const lunesEstaSemana = getLunes(hoy)
  const lunesSemanaPasada = (() => {
    const d = new Date(lunesEstaSemana + 'T00:00:00'); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })()
  const domingoSemanaPasada = (() => {
    const d = new Date(lunesEstaSemana + 'T00:00:00'); d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()

  const recEstaSemana   = recordsRecientes.filter(r => r.fecha >= lunesEstaSemana)
  const recSemanaPasada = recordsRecientes.filter(r => r.fecha >= lunesSemanaPasada && r.fecha <= domingoSemanaPasada)

  // Completados por día de esta semana [Lun=0 … Dom=6]
  const porDia = Array(7).fill(0) as number[]
  recEstaSemana.forEach(r => { porDia[(new Date(r.fecha + 'T00:00:00').getDay() + 6) % 7]++ })

  // Hábito con más completaciones esta semana
  const habitCount: Record<string, number> = {}
  recEstaSemana.forEach(r => { habitCount[r.habit_id] = (habitCount[r.habit_id] ?? 0) + 1 })
  const mejorHabitoId  = Object.entries(habitCount).sort(([,a],[,b]) => b - a)[0]?.[0]
  const mejorHabitoObj = mejorHabitoId ? habits.find(h => h.id === mejorHabitoId) ?? null : null

  const resumenSemanal = {
    estaSemanaCumplidos:  recEstaSemana.length,
    semanaPasadaCumplidos: recSemanaPasada.length,
    porDia,
    mejorHabito: mejorHabitoObj ? { nombre: mejorHabitoObj.nombre, emoji: mejorHabitoObj.emoji } : null,
  }

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
        totalHabitosActivos={habits.length}
        displayName={displayName}
        resumenSemanal={resumenSemanal}
      />
      <BottomNav />
    </div>
  )
}
