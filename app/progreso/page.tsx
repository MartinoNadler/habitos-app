import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import StatsContent from '@/app/stats/StatsContent'
import type { Habit, Record as HabitRecord, UserState, UserBadge } from '@/lib/types'

const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function calcularMejorRacha(records: HabitRecord[], habitId: string): number {
  const fechas = records
    .filter(r => r.habit_id === habitId)
    .map(r => r.fecha)
    .sort()
  if (fechas.length === 0) return 0
  let maxStreak = 1, curr = 1
  for (let i = 1; i < fechas.length; i++) {
    const diff = Math.round(
      (new Date(fechas[i] + 'T00:00:00').getTime() - new Date(fechas[i - 1] + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    )
    if (diff === 1) { curr++; maxStreak = Math.max(maxStreak, curr) }
    else { curr = 1 }
  }
  return maxStreak
}

function calcularRachaActual(habit: Habit, records: HabitRecord[], hoyStr: string): number {
  const fechas = new Set(records.filter(r => r.habit_id === habit.id).map(r => r.fecha))

  if (habit.frecuencia === 'veces_semana') {
    // Devuelve el conteo de esta semana
    const d = new Date(hoyStr + 'T00:00:00')
    const lunes = new Date(d)
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const lunesStr = lunes.toISOString().split('T')[0]
    return records.filter(r => r.habit_id === habit.id && r.fecha >= lunesStr).length
  }

  if (habit.frecuencia === 'dias_semana') {
    const programados = habit.dias_semana ?? []
    if (programados.length === 0) return 0
    let streak = 0
    const d = new Date(hoyStr + 'T00:00:00')
    if (programados.includes(d.getDay()) && !fechas.has(hoyStr)) d.setDate(d.getDate() - 1)
    let guard = 0
    while (guard++ < 90) {
      const ds = d.toISOString().split('T')[0]
      if (!programados.includes(d.getDay())) { d.setDate(d.getDate() - 1); continue }
      if (!fechas.has(ds)) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  // Diario
  const start = new Date(hoyStr + 'T00:00:00')
  if (!fechas.has(hoyStr)) start.setDate(start.getDate() - 1)
  let streak = 0
  const d = new Date(start)
  while (streak < 365) {
    const ds = d.toISOString().split('T')[0]
    if (!fechas.has(ds)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default async function ProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioMesStr = inicioMes.toISOString().split('T')[0]
  const mesActualStr = hoy.toISOString().slice(0, 7)
  const mesPasadoStr = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 7)

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

  const hace90 = new Date(hoy)
  hace90.setDate(hace90.getDate() - 89)
  const hace90Str = hace90.toISOString().split('T')[0]

  const heatmapData: Record<string, number> = {}
  const actividadPorDow = [0, 0, 0, 0, 0, 0, 0]
  let completadosEsteMes = 0
  let completadosMesPasado = 0
  const puntosSemanalesMap: Record<string, number> = {}

  records.forEach(r => {
    if (r.fecha >= hace90Str) {
      heatmapData[r.fecha] = (heatmapData[r.fecha] ?? 0) + 1
    }
    const dow = new Date(r.fecha + 'T00:00:00').getDay()
    actividadPorDow[dow]++
    if (r.fecha.startsWith(mesActualStr)) completadosEsteMes++
    if (r.fecha.startsWith(mesPasadoStr)) completadosMesPasado++
    const d = new Date(r.fecha + 'T00:00:00')
    const lunes = new Date(d)
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const wKey = lunes.toISOString().split('T')[0]
    puntosSemanalesMap[wKey] = (puntosSemanalesMap[wKey] ?? 0) + r.pts
  })

  const maxDow = Math.max(...actividadPorDow, 1)
  const actividadPorDia = actividadPorDow.map((count, i) => ({
    dia: NOMBRES_DIA[i],
    count,
    pct: Math.round((count / maxDow) * 100),
  }))
  const mejorDowIdx = actividadPorDow.indexOf(Math.max(...actividadPorDow))
  const mejorDia = { nombre: NOMBRES_DIA[mejorDowIdx], count: actividadPorDow[mejorDowIdx] }

  const mejoraMensual = completadosMesPasado > 0
    ? Math.round(((completadosEsteMes - completadosMesPasado) / completadosMesPasado) * 100)
    : completadosEsteMes > 0 ? 100 : 0

  const puntosSemanales = Object.entries(puntosSemanalesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([fecha, pts]) => {
      const d = new Date(fecha + 'T00:00:00')
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: pts }
    })

  const diasConRegistros = new Set(records.map(r => r.fecha)).size

  const hoyStr = hoy.toISOString().split('T')[0]
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 29)
  const hace30Str = hace30.toISOString().split('T')[0]

  /**
   * Cuenta las ocurrencias esperadas de un hábito en el rango [desde, hasta].
   * Para 'diario': días del rango.
   * Para 'veces_semana': semanas del rango × meta.
   * Para 'dias_semana': días programados que caen en el rango.
   */
  function ocurrenciasEsperadas(h: (typeof habits)[number], desde: string, hasta: string): number {
    const d1 = new Date(desde + 'T00:00:00')
    const d2 = new Date(hasta + 'T00:00:00')
    const totalDias = Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1

    if (h.frecuencia === 'veces_semana') {
      const semanas = totalDias / 7
      return Math.max(Math.round(semanas * (h.meta_semanal ?? 1)), 1)
    }
    if (h.frecuencia === 'dias_semana') {
      const programados = h.dias_semana ?? []
      if (programados.length === 0) return 1
      let count = 0
      const d = new Date(d1)
      while (d <= d2) { if (programados.includes(d.getDay())) count++; d.setDate(d.getDate() + 1) }
      return Math.max(count, 1)
    }
    return Math.max(totalDias, 1) // diario / semanal legacy
  }

  const habitStats = habits.map(h => {
    const hRec = records.filter(r => r.habit_id === h.id)
    const completados = hRec.length
    const conValor = hRec.filter(r => r.valor != null)
    const promedio = conValor.length > 0
      ? conValor.reduce((acc, r) => acc + (r.valor ?? 0), 0) / conValor.length
      : null
    const mejorRacha = calcularMejorRacha(records, h.id)
    const rachaActual = calcularRachaActual(h, records, hoyStr)

    // Ventana: últimos 30 días, pero no antes de la fecha de creación
    const creacionStr = h.creado_en.split('T')[0]
    const desde = creacionStr > hace30Str ? creacionStr : hace30Str
    const completadosVentana = hRec.filter(r => r.fecha >= desde && r.fecha <= hoyStr).length
    const esperados = ocurrenciasEsperadas(h, desde, hoyStr)
    const pctCumplimiento = Math.min(Math.round((completadosVentana / esperados) * 100), 100)

    const diasEsteMes = recordsMes.filter(r => r.habit_id === h.id).length
    return { habit: h, completados, promedio, mejorRacha, rachaActual, pctCumplimiento, diasEsteMes }
  })

  const pctPromedioGeneral = habitStats.length > 0
    ? Math.round(habitStats.reduce((s, h) => s + h.pctCumplimiento, 0) / habitStats.length)
    : 0

  const mejorHabito = habitStats.length > 0
    ? habitStats.reduce((a, b) => a.pctCumplimiento >= b.pctCumplimiento ? a : b)
    : null

  return (
    <div className="min-h-dvh" style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}>
      <TopBar titulo="Progreso" puntos={state?.puntos} />
      <StatsContent
        state={state}
        habitStats={habitStats}
        diasConRegistros={diasConRegistros}
        badges={badges}
        heatmapData={heatmapData}
        pctPromedioGeneral={pctPromedioGeneral}
        mejoraMensual={mejoraMensual}
        completadosEsteMes={completadosEsteMes}
        completadosMesPasado={completadosMesPasado}
        actividadPorDia={actividadPorDia}
        mejorDia={mejorDia}
        mejorHabitoNombre={mejorHabito?.habit.nombre ?? null}
        mejorHabitoPct={mejorHabito?.pctCumplimiento ?? 0}
        puntosSemanales={puntosSemanales}
      />
      <BottomNav />
    </div>
  )
}
