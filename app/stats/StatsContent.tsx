'use client'

import { useEffect, useState, useMemo } from 'react'
import Heatmap from '@/components/progress/Heatmap'
import TrendChart from '@/components/progress/TrendChart'
import ProgressRing from '@/components/ui/ProgressRing'
import { BADGES } from '@/lib/logic/badges'
import type { Habit, UserState, UserBadge } from '@/lib/types'

// ── Paleta ───────────────────────────────────────────────────────────────────
const HABIT_PALETTE = ['#FF7A3D','#4D8DFF','#B26BFF','#59E1FF','#5CFF7B','#FFC857','#FF6B9D','#00E5CC']
const DIAS_ORDEN    = [1,2,3,4,5,6,0]  // Lun→Dom
const DIAS_CORTOS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES         = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const PERIODOS = [
  { label: '7 días',  dias: 7  },
  { label: '30 días', dias: 30 },
  { label: '3 meses', dias: 90 },
] as const
type Periodo = 7 | 30 | 90

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
    const diff = Math.round((new Date(fechas[i]+'T00:00:00').getTime() - new Date(fechas[i-1]+'T00:00:00').getTime()) / 86_400_000)
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

// ── SVG helpers ──────────────────────────────────────────────────────────────
function ZapIcon({ size=12, color='#FFC857' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.22)' }}>{children}</h2>
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StatsContent({ state, habits, allRecords, badges }: StatsContentProps) {
  const [periodo, setPeriodo]       = useState<Periodo>(30)
  const [visible, setVisible]       = useState(false)
  const [barsVisible, setBarsVisible] = useState(false)
  const badgesDesbloqueados = new Set(badges.map(b => b.badge_id))
  const hoy = hoyStr()
  const mesActual = MESES[new Date().getMonth()]

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => setBarsVisible(true), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Re-animar barras al cambiar período
  function cambiarPeriodo(p: Periodo) {
    setBarsVisible(false)
    setPeriodo(p)
    setTimeout(() => setBarsVisible(true), 80)
  }

  // ── Records del período ──────────────────────────────────────────────────
  const desde = useMemo(() => fechaDesde(periodo), [periodo])

  const recordsPeriodo = useMemo(
    () => allRecords.filter(r => r.fecha >= desde && r.fecha <= hoy),
    [allRecords, desde, hoy]
  )

  // ── Heatmap (siempre 90 días para dar contexto) ──────────────────────────
  const heatmapData = useMemo(() => {
    const d90 = fechaDesde(90)
    const map: Record<string, number> = {}
    allRecords.filter(r => r.fecha >= d90).forEach(r => {
      map[r.fecha] = (map[r.fecha] ?? 0) + 1
    })
    return map
  }, [allRecords])

  // ── Actividad por día ────────────────────────────────────────────────────
  const { actividadPorDia, mejorDia } = useMemo(() => {
    const dow = [0,0,0,0,0,0,0]
    recordsPeriodo.forEach(r => { dow[new Date(r.fecha+'T00:00:00').getDay()]++ })
    const max = Math.max(...dow, 1)
    const actividadPorDia = dow.map((count, i) => ({
      dia: DIAS_CORTOS[i], count, pct: Math.round((count / max) * 100),
    }))
    const mejorIdx = dow.indexOf(Math.max(...dow))
    return { actividadPorDia, mejorDia: { nombre: DIAS_CORTOS[mejorIdx], count: dow[mejorIdx] } }
  }, [recordsPeriodo])

  // ── Puntos semanales ─────────────────────────────────────────────────────
  const puntosSemanales = useMemo(() => {
    const map: Record<string, number> = {}
    recordsPeriodo.forEach(r => {
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
  }, [recordsPeriodo])

  // ── Stats por hábito ─────────────────────────────────────────────────────
  const habitStats = useMemo(() => habits.map(h => {
    const hRec = allRecords.filter(r => r.habit_id === h.id)
    const completados = hRec.length

    // Período efectivo (no antes de creación)
    const creacion = h.creado_en.split('T')[0]
    const desdeEfectivo = creacion > desde ? creacion : desde
    const completadosVentana = hRec.filter(r => r.fecha >= desdeEfectivo && r.fecha <= hoy).length
    const esperados = ocurrenciasEsperadas(h, desdeEfectivo, hoy)
    const pctCumplimiento = Math.min(Math.round((completadosVentana / esperados) * 100), 100)

    // Promedios de valor
    const conValor = hRec.filter(r => r.valor != null)
    const promedio = conValor.length > 0
      ? conValor.reduce((s, r) => s + (r.valor ?? 0), 0) / conValor.length : null

    const mejorRacha  = calcularMejorRacha(allRecords, h.id)
    const rachaActual = calcularRachaActual(h, allRecords, hoy)

    // Completados en período para el subtítulo
    const completadosPeriodo = completadosVentana

    return { habit: h, completados, completadosPeriodo, promedio, mejorRacha, rachaActual, pctCumplimiento }
  }), [habits, allRecords, desde, hoy, periodo])

  // ── Métricas hero ────────────────────────────────────────────────────────
  const pctPromedioGeneral = habitStats.length > 0
    ? Math.round(habitStats.reduce((s, h) => s + h.pctCumplimiento, 0) / habitStats.length) : 0

  const mejorHabito = habitStats.length > 0
    ? habitStats.reduce((a, b) => a.pctCumplimiento >= b.pctCumplimiento ? a : b) : null

  const diasConActividad = new Set(recordsPeriodo.map(r => r.fecha)).size

  const ptsSemanaActual   = puntosSemanales[puntosSemanales.length - 1]?.value ?? 0
  const ptsSemanaAnterior = puntosSemanales[puntosSemanales.length - 2]?.value ?? 0
  const deltaSemana = ptsSemanaAnterior > 0
    ? Math.round(((ptsSemanaActual - ptsSemanaAnterior) / ptsSemanaAnterior) * 100) : 0

  const necesitanAtencion = habitStats.filter(s => s.rachaActual === 0 && s.completados > 0)
  const tengoHabits = habitStats.length > 0

  // ── UI ───────────────────────────────────────────────────────────────────
  const fadeIn = (delay = 0) => ({
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    opacity:   visible ? 1 : 0,
    transition: `all 0.45s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
  })

  return (
    <div className="min-h-screen pb-24" style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}>
      <div className="px-4 pt-4 pb-6 space-y-4 max-w-2xl mx-auto">

        {/* ── SELECTOR DE PERÍODO ─────────────────────────────────────────── */}
        <div
          className="flex gap-1.5 p-1 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.06)',
            ...fadeIn(0),
          }}
        >
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              onClick={() => cambiarPeriodo(p.dias as Periodo)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: periodo === p.dias ? 'rgba(124,111,255,.2)' : 'transparent',
                color:      periodo === p.dias ? '#9B8FFF' : 'rgba(255,255,255,.35)',
                border:     `1px solid ${periodo === p.dias ? 'rgba(124,111,255,.35)' : 'transparent'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── HERO CARD ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(18,20,38,1) 0%, rgba(11,12,22,1) 100%)',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 24,
            padding: '22px',
            boxShadow: '0 8px 40px rgba(0,0,0,.5)',
            ...fadeIn(40),
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-black leading-none" style={{ fontSize: 56, color: '#fff', letterSpacing: '-2px' }}>
                {pctPromedioGeneral}
                <span style={{ fontSize: 28, color: 'rgba(255,255,255,.4)', letterSpacing: '-1px' }}>%</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                cumplimiento · {PERIODOS.find(p => p.dias === periodo)?.label}
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

        {/* ── INSIGHTS ────────────────────────────────────────────────────── */}
        {tengoHabits && (
          <div className="grid grid-cols-3 gap-2" style={fadeIn(80)}>
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <p className="font-bold text-white text-sm leading-tight">{mejorDia.nombre}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>día más activo</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <p className="font-bold text-white text-sm leading-tight truncate">{mejorHabito?.habit.nombre ?? '—'}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{mejorHabito?.pctCumplimiento ?? 0}% cumpl.</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <p className="font-bold text-white text-sm leading-tight">{recordsPeriodo.length}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>completaciones</p>
            </div>
          </div>
        )}

        {/* ── ALERTA RACHAS ROTAS ──────────────────────────────────────────── */}
        {necesitanAtencion.length > 0 && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{
            background: 'rgba(255,107,107,.06)', border: '1px solid rgba(255,107,107,.15)', ...fadeIn(100),
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,150,150,.9)' }}>Racha interrumpida</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,120,120,.5)' }}>
                {necesitanAtencion.map(s => s.habit.nombre).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* ── HEATMAP ─────────────────────────────────────────────────────── */}
        <section style={fadeIn(120)}>
          <SectionTitle>Actividad — últimos 90 días</SectionTitle>
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
            <Heatmap data={heatmapData} dias={90} />
          </div>
        </section>

        {/* ── POR HÁBITO ──────────────────────────────────────────────────── */}
        {tengoHabits && (
          <section style={fadeIn(160)}>
            <SectionTitle>Por hábito · {PERIODOS.find(p => p.dias === periodo)?.label}</SectionTitle>
            <div className="space-y-3">
              {habitStats.map((s, i) => {
                const color = HABIT_PALETTE[i % HABIT_PALETTE.length]
                const rachaRota = s.rachaActual === 0 && s.completados > 0
                const esVecesSemana = s.habit.frecuencia === 'veces_semana'

                return (
                  <div key={s.habit.id} className="rounded-2xl p-4" style={{
                    background: 'rgba(16,18,32,.95)',
                    border: `1px solid ${rachaRota ? 'rgba(255,107,107,.15)' : 'rgba(255,255,255,.06)'}`,
                  }}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl flex-shrink-0">{s.habit.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm leading-tight truncate">{s.habit.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: `${color}15`, color: `${color}cc` }}>
                              {frecLabel(s.habit)}
                            </span>
                            {s.promedio != null && s.habit.campo_extra !== 'ninguno' && (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
                                prom. {s.promedio.toFixed(1)} {s.habit.campo_extra}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-base flex-shrink-0" style={{ color }}>
                        {s.pctCumplimiento}%
                      </span>
                    </div>

                    {/* Barra */}
                    <div className="h-2 rounded-full overflow-hidden mb-3"
                      style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div style={{
                        height: '100%',
                        width: barsVisible ? `${s.pctCumplimiento}%` : '0%',
                        borderRadius: 'inherit',
                        background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        boxShadow: `0 0 8px ${color}50`,
                        transition: `width 1s cubic-bezier(0.4,0,0.2,1) ${i * 70}ms`,
                      }} />
                    </div>

                    {/* Stats */}
                    {s.completados === 0 ? (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Sin registros aún</p>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: 11 }}>🔥</span>
                          {esVecesSemana ? (
                            <span style={{ fontSize: 11 }}>
                              <span className="font-semibold text-white">{s.rachaActual}</span>
                              <span style={{ color: 'rgba(255,255,255,.3)' }}>/{s.habit.meta_semanal ?? 1} sem.</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-sm" style={{
                              color: s.rachaActual > 0 ? '#FF7A3D' : 'rgba(255,255,255,.35)',
                            }}>
                              {plural(s.rachaActual, 'día', 'días')}
                            </span>
                          )}
                          {!esVecesSemana && s.mejorRacha > s.rachaActual && s.mejorRacha > 1 && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginLeft: 2 }}>
                              / {s.mejorRacha}d récord
                            </span>
                          )}
                        </div>
                        {s.completadosPeriodo > 0 && (
                          <>
                            <span style={{ color: 'rgba(255,255,255,.1)' }}>·</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                              <span className="font-semibold text-white">{s.completadosPeriodo}</span>
                              {' '}en {periodo === 7 ? 'la semana' : periodo === 30 ? mesActual : 'el período'}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── ACTIVIDAD POR DÍA ───────────────────────────────────────────── */}
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
                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,.06)' }}>
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

        {/* ── EVOLUCIÓN DE PUNTOS ─────────────────────────────────────────── */}
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

        {/* ── INSIGNIAS ───────────────────────────────────────────────────── */}
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

      </div>
    </div>
  )
}
