'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Heatmap from '@/components/progress/Heatmap'
import TrendChart from '@/components/progress/TrendChart'
import ProgressRing from '@/components/ui/ProgressRing'
import { BADGES } from '@/lib/logic/badges'
import type { Habit, UserState, UserBadge } from '@/lib/types'

// ── Paleta ───────────────────────────────────────────────────────────────────
const HABIT_PALETTE = ['#FF7A3D','#4D8DFF','#B26BFF','#59E1FF','#5CFF7B','#FFC857','#FF6B9D','#00E5CC']
const DIAS_ORDEN    = [1,2,3,4,5,6,0]   // Lun → Dom
const DIAS_CORTOS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES         = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const PERIODOS = [
  { label: '7 días',  dias: 7   },
  { label: '30 días', dias: 30  },
  { label: '3 meses', dias: 90  },
  { label: 'Año',     dias: 365 },
] as const
type Periodo = 7 | 30 | 90 | 365

// ── Tipos ────────────────────────────────────────────────────────────────────
type RawRecord = { habit_id: string; fecha: string; pts: number; valor: number | null }

interface StatsContentProps {
  state:      UserState
  habits:     Habit[]
  allRecords: RawRecord[]
  badges:     UserBadge[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fechaDesde(dias: number): string {
  const d = new Date(); d.setDate(d.getDate() - (dias - 1))
  return d.toISOString().split('T')[0]
}

function hoyStr(): string { return new Date().toISOString().split('T')[0] }

function ocurrenciasEsperadas(h: Habit, desde: string, hasta: string): number {
  const d1 = new Date(desde + 'T00:00:00'), d2 = new Date(hasta + 'T00:00:00')
  const totalDias = Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1
  if (h.frecuencia === 'veces_semana')
    return Math.max(Math.round((totalDias / 7) * (h.meta_semanal ?? 1)), 1)
  if (h.frecuencia === 'dias_semana') {
    const p = h.dias_semana ?? []; if (!p.length) return 1
    let n = 0; const d = new Date(d1)
    while (d <= d2) { if (p.includes(d.getDay())) n++; d.setDate(d.getDate() + 1) }
    return Math.max(n, 1)
  }
  return Math.max(totalDias, 1)
}

function calcularMejorRacha(records: RawRecord[], habitId: string): number {
  const fechas = records.filter(r => r.habit_id === habitId).map(r => r.fecha).sort()
  if (!fechas.length) return 0
  let max = 1, curr = 1
  for (let i = 1; i < fechas.length; i++) {
    const diff = Math.round(
      (new Date(fechas[i]+'T00:00:00').getTime() - new Date(fechas[i-1]+'T00:00:00').getTime()) / 86_400_000
    )
    if (diff === 1) { curr++; max = Math.max(max, curr) } else curr = 1
  }
  return max
}

function calcularRachaActual(habit: Habit, records: RawRecord[], hoy: string): number {
  const fechas = new Set(records.filter(r => r.habit_id === habit.id).map(r => r.fecha))
  if (habit.frecuencia === 'veces_semana') {
    const d = new Date(hoy + 'T00:00:00'), lunes = new Date(d)
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return records.filter(r => r.habit_id === habit.id && r.fecha >= lunes.toISOString().split('T')[0]).length
  }
  if (habit.frecuencia === 'dias_semana') {
    const p = habit.dias_semana ?? []; if (!p.length) return 0
    let streak = 0; const d = new Date(hoy + 'T00:00:00')
    if (p.includes(d.getDay()) && !fechas.has(hoy)) d.setDate(d.getDate() - 1)
    let g = 0
    while (g++ < 90) {
      const ds = d.toISOString().split('T')[0]
      if (!p.includes(d.getDay())) { d.setDate(d.getDate() - 1); continue }
      if (!fechas.has(ds)) break; streak++; d.setDate(d.getDate() - 1)
    }
    return streak
  }
  const start = new Date(hoy + 'T00:00:00')
  if (!fechas.has(hoy)) start.setDate(start.getDate() - 1)
  let streak = 0; const d = new Date(start)
  while (streak < 365) {
    const ds = d.toISOString().split('T')[0]; if (!fechas.has(ds)) break
    streak++; d.setDate(d.getDate() - 1)
  }
  return streak
}

function frecLabel(h: Habit): string {
  if (h.frecuencia === 'veces_semana') return `${h.meta_semanal ?? '?'}×/sem`
  if (h.frecuencia === 'dias_semana') {
    const D = ['D','L','M','M','J','V','S']
    return (h.dias_semana ?? []).sort((a,b) => ((a+6)%7)-((b+6)%7)).map(d => D[d]).join(' ')
  }
  return 'diario'
}

function plural(n: number, s: string, p: string) { return `${n} ${n === 1 ? s : p}` }

function complianceColor(pct: number): string {
  if (pct >= 75) return '#5CFF7B'
  if (pct >= 50) return '#7c6fff'
  if (pct >= 25) return '#FFC857'
  return '#FF6B9D'
}

// ── SVG helpers ──────────────────────────────────────────────────────────────
function ZapIcon({ size=12, color='#FFC857' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.22)' }}>{children}</h2>
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StatsContent({ state, habits, allRecords, badges }: StatsContentProps) {
  const [periodo, setPeriodo]         = useState<Periodo>(30)
  const [habitFiltro, setHabitFiltro] = useState<string | null>(null)
  const [visible, setVisible]         = useState(false)
  const [barsVisible, setBarsVisible] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const badgesDesbloqueados = new Set(badges.map(b => b.badge_id))
  const hoy = hoyStr()

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => setBarsVisible(true), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  function cambiarPeriodo(p: Periodo) {
    setBarsVisible(false); setPeriodo(p); setTimeout(() => setBarsVisible(true), 80)
  }
  function cambiarHabito(id: string | null) {
    setBarsVisible(false); setHabitFiltro(id); setTimeout(() => setBarsVisible(true), 80)
  }

  // ── Records del período ──────────────────────────────────────────────────
  const desde = useMemo(() => fechaDesde(periodo), [periodo])

  const recordsPeriodo = useMemo(
    () => allRecords.filter(r => r.fecha >= desde && r.fecha <= hoy),
    [allRecords, desde, hoy]
  )

  // Records filtrados por hábito seleccionado (para actividad por día, puntos, etc.)
  const recordsVista = useMemo(
    () => habitFiltro ? recordsPeriodo.filter(r => r.habit_id === habitFiltro) : recordsPeriodo,
    [recordsPeriodo, habitFiltro]
  )

  // ── Heatmap — 90d fijo, filtra por hábito si hay uno seleccionado ────────
  const heatmapData = useMemo(() => {
    const d90 = fechaDesde(90)
    const base = habitFiltro
      ? allRecords.filter(r => r.habit_id === habitFiltro && r.fecha >= d90)
      : allRecords.filter(r => r.fecha >= d90)
    const map: Record<string, number> = {}
    base.forEach(r => { map[r.fecha] = (map[r.fecha] ?? 0) + 1 })
    return map
  }, [allRecords, habitFiltro])

  // ── Actividad por día ────────────────────────────────────────────────────
  const { actividadPorDia, mejorDia } = useMemo(() => {
    const dow = [0,0,0,0,0,0,0]
    recordsVista.forEach(r => { dow[new Date(r.fecha+'T00:00:00').getDay()]++ })
    const max = Math.max(...dow, 1)
    const actividadPorDia = dow.map((count, i) => ({
      dia: DIAS_CORTOS[i], count, pct: Math.round((count / max) * 100),
    }))
    const mejorIdx = dow.indexOf(Math.max(...dow))
    return { actividadPorDia, mejorDia: { nombre: DIAS_CORTOS[mejorIdx], count: dow[mejorIdx] } }
  }, [recordsVista])

  // ── Puntos semanales ─────────────────────────────────────────────────────
  const puntosSemanales = useMemo(() => {
    const map: Record<string, number> = {}
    recordsVista.forEach(r => {
      const d = new Date(r.fecha+'T00:00:00'), lunes = new Date(d)
      lunes.setDate(d.getDate() - ((d.getDay()+6)%7))
      const k = lunes.toISOString().split('T')[0]
      map[k] = (map[k] ?? 0) + r.pts
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b))
      .map(([fecha, pts]) => {
        const d = new Date(fecha+'T00:00:00')
        return { label: `${d.getDate()}/${d.getMonth()+1}`, value: pts }
      })
  }, [recordsVista])

  // ── Stats por hábito ─────────────────────────────────────────────────────
  const habitStats = useMemo(() => habits.map(h => {
    const hRec = allRecords.filter(r => r.habit_id === h.id)
    const creacion = h.creado_en.split('T')[0]
    const desdeEfectivo = creacion > desde ? creacion : desde
    const completadosVentana = hRec.filter(r => r.fecha >= desdeEfectivo && r.fecha <= hoy).length
    const esperados = ocurrenciasEsperadas(h, desdeEfectivo, hoy)
    const pctCumplimiento = Math.min(Math.round((completadosVentana / esperados) * 100), 100)
    const conValor = hRec.filter(r => r.valor != null)
    const promedio = conValor.length > 0
      ? conValor.reduce((s, r) => s + (r.valor ?? 0), 0) / conValor.length : null
    const mejorRacha  = calcularMejorRacha(allRecords, h.id)
    const rachaActual = calcularRachaActual(h, allRecords, hoy)
    return {
      habit: h,
      completados:        hRec.length,
      completadosPeriodo: completadosVentana,
      promedio, mejorRacha, rachaActual, pctCumplimiento,
    }
  }), [habits, allRecords, desde, hoy])

  const habitStatsSorted = useMemo(
    () => [...habitStats].sort((a, b) => b.pctCumplimiento - a.pctCumplimiento),
    [habitStats]
  )

  const habitSeleccionado = useMemo(
    () => habitFiltro ? habitStats.find(s => s.habit.id === habitFiltro) ?? null : null,
    [habitFiltro, habitStats]
  )

  // ── Métricas generales ───────────────────────────────────────────────────
  const pctPromedioGeneral = habitStats.length > 0
    ? Math.round(habitStats.reduce((s, h) => s + h.pctCumplimiento, 0) / habitStats.length) : 0
  const diasConActividad   = new Set(recordsVista.map(r => r.fecha)).size
  const ptsSemanaActual    = puntosSemanales[puntosSemanales.length - 1]?.value ?? 0
  const ptsSemanaAnterior  = puntosSemanales[puntosSemanales.length - 2]?.value ?? 0
  const deltaSemana = ptsSemanaAnterior > 0
    ? Math.round(((ptsSemanaActual - ptsSemanaAnterior) / ptsSemanaAnterior) * 100) : 0
  const tengoHabits = habitStats.length > 0

  const periodoLabel = PERIODOS.find(p => p.dias === periodo)?.label ?? ''

  // ── Animaciones ──────────────────────────────────────────────────────────
  const fadeIn = (delay = 0) => ({
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    opacity:   visible ? 1 : 0,
    transition: `all 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
  })

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 pt-4 pb-6 space-y-4 max-w-2xl mx-auto">

        {/* ── SELECTOR DE PERÍODO ─────────────────────────────────────── */}
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.06)',
          ...fadeIn(0),
        }}>
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              onClick={() => cambiarPeriodo(p.dias as Periodo)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: periodo === p.dias ? 'rgba(124,111,255,.2)' : 'transparent',
                color:      periodo === p.dias ? '#9B8FFF' : 'rgba(255,255,255,.35)',
                border:    `1px solid ${periodo === p.dias ? 'rgba(124,111,255,.35)' : 'transparent'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── FILTRO DE HÁBITO ─────────────────────────────────────────── */}
        {tengoHabits && (
          <div
            ref={filterRef}
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', paddingBottom: 2, ...fadeIn(20) }}
          >
            <button
              onClick={() => cambiarHabito(null)}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: habitFiltro === null ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)',
                color:      habitFiltro === null ? '#fff' : 'rgba(255,255,255,.4)',
                border:    `1px solid ${habitFiltro === null ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)'}`,
              }}
            >
              Todos
            </button>
            {habits.map((h, i) => {
              const isSelected = habitFiltro === h.id
              const color = HABIT_PALETTE[i % HABIT_PALETTE.length]
              return (
                <button
                  key={h.id}
                  onClick={() => cambiarHabito(isSelected ? null : h.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: isSelected ? `${color}20` : 'rgba(255,255,255,.04)',
                    color:      isSelected ? color : 'rgba(255,255,255,.4)',
                    border:    `1px solid ${isSelected ? `${color}40` : 'rgba(255,255,255,.06)'}`,
                  }}
                >
                  <span>{h.emoji}</span>
                  <span className="max-w-[80px] truncate">{h.nombre}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            VISTA: HÁBITO ESPECÍFICO
        ══════════════════════════════════════════════════════════════ */}
        {habitSeleccionado ? (() => {
          const s = habitSeleccionado
          const idx = habits.indexOf(s.habit)
          const color = HABIT_PALETTE[idx % HABIT_PALETTE.length]
          const cc = complianceColor(s.pctCumplimiento)

          // Calendario del hábito
          const diasCal = Math.min(periodo, 90)
          const desdeGrid = fechaDesde(diasCal)
          const doneSet = new Set(allRecords.filter(r => r.habit_id === s.habit.id).map(r => r.fecha))
          const calDates: { date: string; scheduled: boolean; done: boolean }[] = []
          const dCal = new Date(desdeGrid + 'T00:00:00')
          const endCal = new Date(hoy + 'T00:00:00')
          while (dCal <= endCal) {
            const ds = dCal.toISOString().split('T')[0]
            const dow = dCal.getDay()
            const scheduled = s.habit.frecuencia !== 'dias_semana' || (s.habit.dias_semana ?? []).includes(dow)
            calDates.push({ date: ds, scheduled, done: scheduled && doneSet.has(ds) })
            dCal.setDate(dCal.getDate() + 1)
          }
          const firstDow = calDates.length > 0 ? new Date(calDates[0].date + 'T00:00:00').getDay() : 0
          const padStart = (firstDow + 6) % 7

          return (
            <>
              {/* Hero hábito individual */}
              <div style={{
                background: `linear-gradient(160deg, ${color}0e, rgba(11,12,22,1))`,
                border: `1px solid ${color}22`,
                borderRadius: 24, padding: '20px',
                boxShadow: '0 8px 40px rgba(0,0,0,.5)',
                ...fadeIn(40),
              }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: `${color}15` }}>
                    {s.habit.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-base leading-tight">{s.habit.nombre}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${color}15`, color: `${color}cc` }}>
                        {frecLabel(s.habit)}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{s.habit.categoria}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-end gap-0.5 leading-none">
                      <span className="font-black" style={{ fontSize: 42, color: cc, letterSpacing: '-2px', lineHeight: 1 }}>
                        {s.pctCumplimiento}
                      </span>
                      <span className="font-bold mb-1" style={{ fontSize: 16, color: cc, opacity: 0.5, letterSpacing: 0 }}>%</span>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{periodoLabel}</p>
                  </div>
                </div>

                {/* Barra de cumplimiento */}
                <div className="h-2 rounded-full overflow-hidden mb-5"
                  style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div style={{
                    height: '100%',
                    width: barsVisible ? `${s.pctCumplimiento}%` : '0%',
                    borderRadius: 'inherit',
                    background: `linear-gradient(90deg, ${cc}99, ${cc})`,
                    boxShadow: `0 0 10px ${cc}50`,
                    transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { emoji: '🔥', label: 'Racha actual', value: s.rachaActual > 0 ? `${s.rachaActual}d` : '—' },
                    { emoji: '🏆', label: 'Mejor racha',  value: s.mejorRacha  > 0 ? `${s.mejorRacha}d`  : '—' },
                    { emoji: '✅', label: 'En período',   value: `${s.completadosPeriodo}` },
                  ].map(({ emoji, label, value }) => (
                    <div key={label} className="rounded-xl p-3 text-center"
                      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <span style={{ fontSize: 18 }}>{emoji}</span>
                      <p className="font-bold text-white text-sm mt-1">{value}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {s.promedio != null && s.habit.campo_extra !== 'ninguno' && (
                  <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ fontSize: 14 }}>📊</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                      Promedio: <span className="font-bold text-white">{s.promedio.toFixed(1)}</span> {s.habit.campo_extra}
                    </span>
                  </div>
                )}
              </div>

              {/* Calendario del hábito */}
              <section style={fadeIn(80)}>
                <SectionTitle>Historial · {periodoLabel}</SectionTitle>
                <div className="rounded-2xl p-4" style={{
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)',
                }}>
                  {/* Cabecera días */}
                  <div className="grid mb-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {['L','M','M','J','V','S','D'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,.25)' }}>{d}</div>
                    ))}
                  </div>
                  {/* Grid de días */}
                  <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {Array(padStart).fill(null).map((_, i) => <div key={`pad-${i}`} style={{ aspectRatio: '1' }} />)}
                    {calDates.map(({ date, scheduled, done }) => (
                      <div key={date} title={date} style={{
                        aspectRatio: '1',
                        borderRadius: 4,
                        background: !scheduled
                          ? 'rgba(255,255,255,.02)'
                          : done ? color : 'rgba(255,255,255,.06)',
                        boxShadow: done ? `0 0 5px ${color}55` : 'none',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 justify-end">
                    {[
                      { bg: color,                      label: 'Completado'     },
                      { bg: 'rgba(255,255,255,.06)',     label: 'No completado'  },
                      { bg: 'rgba(255,255,255,.02)',     label: 'No programado'  },
                    ].map(({ bg, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: bg }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Actividad por día — filtrada al hábito */}
              <section style={fadeIn(120)}>
                <SectionTitle>Actividad por día</SectionTitle>
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
                  {DIAS_ORDEN.map((dowIdx, pos) => {
                    const d = actividadPorDia[dowIdx]
                    const isBest = d.dia === mejorDia.nombre && d.count > 0
                    return (
                      <div key={d.dia} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-8 flex-shrink-0 text-right"
                          style={{ color: isBest ? color : 'rgba(255,255,255,.35)' }}>
                          {d.dia}
                        </span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                          <div style={{
                            height: '100%',
                            width: barsVisible ? `${d.pct}%` : '0%',
                            borderRadius: 'inherit',
                            background: `linear-gradient(90deg, ${color}66, ${color})`,
                            transition: `width 0.85s cubic-bezier(0.4,0,0.2,1) ${pos * 55}ms`,
                          }} />
                        </div>
                        <span className="text-xs font-mono w-6 flex-shrink-0"
                          style={{ color: isBest ? color : 'rgba(255,255,255,.2)' }}>
                          {d.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          )
        })() : (

        /* ══════════════════════════════════════════════════════════════
            VISTA: TODOS LOS HÁBITOS
        ══════════════════════════════════════════════════════════════ */
        <>
          {/* Hero general */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(18,20,38,1) 0%, rgba(11,12,22,1) 100%)',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 24, padding: '22px',
            boxShadow: '0 8px 40px rgba(0,0,0,.5)',
            ...fadeIn(40),
          }}>
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-end gap-1 leading-none">
                  <span className="font-black" style={{ fontSize: 60, color: '#fff', letterSpacing: '-3px', lineHeight: 1 }}>
                    {pctPromedioGeneral}
                  </span>
                  <span className="font-bold mb-1.5" style={{ fontSize: 20, color: 'rgba(255,255,255,.35)', letterSpacing: 0 }}>%</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                  cumplimiento · {periodoLabel}
                </p>
                {diasConActividad > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,.25)' }}>
                    {plural(diasConActividad, 'día activo', 'días activos')} en el período
                  </p>
                )}
              </div>
              <ProgressRing value={pctPromedioGeneral} size={76} stroke={6} color="#7c6fff" />
              <div className="space-y-2.5 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <span className="font-bold text-sm text-white">{state.streak}
                    <span className="font-normal text-[10px] ml-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>d</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ZapIcon size={12} color="#FFC857" />
                  <span className="font-bold text-sm" style={{ color: '#FFC857' }}>{state.puntos}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 12 }}>📋</span>
                  <span className="font-bold text-sm text-white">{habitStats.length}
                    <span className="font-normal text-[10px] ml-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>hab.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Insights rápidos */}
          {tengoHabits && (
            <div className="grid grid-cols-3 gap-2" style={fadeIn(80)}>
              <div className="rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <p className="font-bold text-white text-sm leading-tight">{mejorDia.nombre}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>día más activo</p>
              </div>
              <div className="rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(92,255,123,.1)', cursor: 'pointer' }}
                onClick={() => cambiarHabito(habitStatsSorted[0]?.habit.id ?? null)}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <p className="font-bold text-white text-sm leading-tight truncate">{habitStatsSorted[0]?.habit.nombre ?? '—'}</p>
                <p style={{ fontSize: 10, color: 'rgba(92,255,123,.5)' }}>más cumplido · {habitStatsSorted[0]?.pctCumplimiento ?? 0}%</p>
              </div>
              <div className="rounded-2xl p-3 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,107,107,.1)', cursor: 'pointer' }}
                onClick={() => cambiarHabito(habitStatsSorted[habitStatsSorted.length - 1]?.habit.id ?? null)}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <p className="font-bold text-white text-sm leading-tight truncate">
                  {habitStatsSorted[habitStatsSorted.length - 1]?.habit.nombre ?? '—'}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,107,107,.5)' }}>
                  más fallado · {habitStatsSorted[habitStatsSorted.length - 1]?.pctCumplimiento ?? 0}%
                </p>
              </div>
            </div>
          )}

          {/* Ranking de hábitos */}
          {tengoHabits && (
            <section style={fadeIn(120)}>
              <SectionTitle>Ranking · {periodoLabel}</SectionTitle>
              <div className="space-y-2.5">
                {habitStatsSorted.map((s, rank) => {
                  const originalIdx = habits.indexOf(s.habit)
                  const color = HABIT_PALETTE[originalIdx % HABIT_PALETTE.length]
                  const cc = complianceColor(s.pctCumplimiento)
                  const isFirst = rank === 0
                  const isLast  = rank === habitStatsSorted.length - 1 && habitStatsSorted.length > 1
                  const rankEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

                  return (
                    <button
                      key={s.habit.id}
                      onClick={() => cambiarHabito(s.habit.id)}
                      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[.99]"
                      style={{
                        background: isFirst
                          ? 'linear-gradient(135deg, rgba(255,184,0,.06), rgba(16,18,32,.95))'
                          : isLast && s.pctCumplimiento < 50
                          ? 'linear-gradient(135deg, rgba(255,107,107,.04), rgba(16,18,32,.95))'
                          : 'rgba(16,18,32,.95)',
                        border: `1px solid ${
                          isFirst ? 'rgba(255,184,0,.18)'
                          : isLast && s.pctCumplimiento < 50 ? 'rgba(255,107,107,.14)'
                          : 'rgba(255,255,255,.06)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-7 text-center flex-shrink-0">
                          {rankEmoji ? (
                            <span style={{ fontSize: 18 }}>{rankEmoji}</span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.28)' }}>{rank + 1}</span>
                          )}
                        </div>

                        {/* Emoji */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${color}12` }}>
                          {s.habit.emoji}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <p className="font-semibold text-white text-sm leading-tight truncate">{s.habit.nombre}</p>
                            {isFirst && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(255,184,0,.15)', color: '#FFB800' }}>top</span>
                            )}
                            {isLast && s.pctCumplimiento < 50 && habitStatsSorted.length > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(255,107,107,.12)', color: '#FF7070' }}>crítico</span>
                            )}
                          </div>
                          {/* Barra */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: 'rgba(255,255,255,.06)' }}>
                              <div style={{
                                height: '100%',
                                width: barsVisible ? `${s.pctCumplimiento}%` : '0%',
                                borderRadius: 'inherit',
                                background: `linear-gradient(90deg, ${cc}80, ${cc})`,
                                transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${rank * 60}ms`,
                              }} />
                            </div>
                            <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: cc, minWidth: 32, textAlign: 'right' }}>
                              {s.pctCumplimiento}%
                            </span>
                          </div>
                          {/* Subtítulo */}
                          <div className="flex items-center gap-3 mt-1">
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>
                              {s.completadosPeriodo} cumplidos
                            </span>
                            {s.rachaActual > 0 && (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>
                                🔥 {s.rachaActual}d racha
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Heatmap */}
          <section style={fadeIn(160)}>
            <SectionTitle>Actividad — últimos 90 días</SectionTitle>
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              <Heatmap data={heatmapData} dias={90} />
            </div>
          </section>

          {/* Actividad por día */}
          <section style={fadeIn(200)}>
            <SectionTitle>Actividad por día</SectionTitle>
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              {DIAS_ORDEN.map((dowIdx, pos) => {
                const d = actividadPorDia[dowIdx]
                const isBest = d.dia === mejorDia.nombre && d.count > 0
                const barColor = isBest ? '#5CFF7B' : '#7c6fff'
                return (
                  <div key={d.dia} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-8 flex-shrink-0 text-right"
                      style={{ color: isBest ? '#5CFF7B' : 'rgba(255,255,255,.35)' }}>
                      {d.dia}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div style={{
                        height: '100%',
                        width: barsVisible ? `${d.pct}%` : '0%',
                        borderRadius: 'inherit',
                        background: isBest
                          ? 'linear-gradient(90deg, #5CFF7B99, #5CFF7B)'
                          : `linear-gradient(90deg, ${barColor}66, ${barColor}99)`,
                        boxShadow: isBest ? '0 0 6px rgba(92,255,123,.4)' : 'none',
                        transition: `width 0.85s cubic-bezier(0.4,0,0.2,1) ${pos * 55}ms`,
                      }} />
                    </div>
                    <span className="text-xs font-mono w-6 flex-shrink-0"
                      style={{ color: isBest ? '#5CFF7B' : 'rgba(255,255,255,.2)' }}>
                      {d.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Evolución de puntos */}
          <section style={fadeIn(240)}>
            <SectionTitle>Evolución de puntos</SectionTitle>
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <ZapIcon size={14} color="#FFC857" />
                    <span className="font-mono font-black text-xl text-white">{state.puntos}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>total</span>
                  </div>
                  {puntosSemanales.length > 0 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', marginTop: 2 }}>
                      Esta semana: <span className="text-white font-semibold">{ptsSemanaActual} pts</span>
                    </p>
                  )}
                </div>
                {deltaSemana !== 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                    background: deltaSemana > 0 ? 'rgba(92,255,123,.1)' : 'rgba(255,107,157,.1)',
                    color:      deltaSemana > 0 ? '#5CFF7B' : '#FF6B9D',
                    border:    `1px solid ${deltaSemana > 0 ? 'rgba(92,255,123,.2)' : 'rgba(255,107,157,.2)'}`,
                  }}>
                    {deltaSemana > 0 ? '↑' : '↓'} {Math.abs(deltaSemana)}% vs sem. ant.
                  </span>
                )}
              </div>
              {puntosSemanales.length >= 2 ? (
                <TrendChart data={puntosSemanales} color="#7c6fff" height={100} />
              ) : (
                <div className="flex items-center justify-center py-8"
                  style={{ color: 'rgba(255,255,255,.2)', fontSize: 13 }}>
                  Completá hábitos para ver la evolución
                </div>
              )}
            </div>
          </section>

          {/* Insignias */}
          <section style={fadeIn(280)}>
            <SectionTitle>Insignias</SectionTitle>
            <div className="grid grid-cols-3 gap-2.5">
              {BADGES.map((badge, i) => {
                const ok = badgesDesbloqueados.has(badge.id)
                return (
                  <div key={badge.id} className="flex flex-col items-center text-center rounded-2xl p-3.5 border"
                    style={{
                      background:   ok ? 'linear-gradient(180deg, rgba(255,184,79,.07), rgba(10,10,20,.98))' : 'rgba(255,255,255,.02)',
                      borderColor:  ok ? 'rgba(255,184,79,.18)' : 'rgba(255,255,255,.04)',
                      opacity:      ok ? 1 : 0.3,
                      transform:    visible ? 'translateY(0)' : 'translateY(12px)',
                      transition:  `all 0.4s cubic-bezier(0.4,0,0.2,1) ${180 + i * 35}ms`,
                    }}>
                    <span className="text-2xl mb-1.5">{badge.emoji}</span>
                    <span className="text-xs font-semibold text-white leading-tight">{badge.nombre}</span>
                    <span className="text-[10px] mt-1 leading-tight" style={{ color: 'rgba(255,255,255,.3)' }}>
                      {badge.descripcion}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
        )}

      </div>
    </div>
  )
}
