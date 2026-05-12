'use client'

import { useEffect, useState } from 'react'
import Heatmap from '@/components/progress/Heatmap'
import TrendChart from '@/components/progress/TrendChart'
import ProgressRing from '@/components/ui/ProgressRing'
import { BADGES } from '@/lib/logic/badges'
import type { Habit, UserState, UserBadge } from '@/lib/types'

const HABIT_PALETTE = [
  '#FF7A3D', '#4D8DFF', '#B26BFF', '#59E1FF',
  '#5CFF7B', '#FFC857', '#FF6B9D', '#00E5CC',
]

const DIAS_ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

interface HabitStats {
  habit: Habit
  completados: number
  promedio: number | null
  mejorRacha: number
  rachaActual: number
  pctCumplimiento: number
  diasEsteMes: number
}

interface StatsContentProps {
  state: UserState
  habitStats: HabitStats[]
  diasConRegistros: number
  badges: UserBadge[]
  heatmapData: Record<string, number>
  pctPromedioGeneral: number
  mejoraMensual: number
  completadosEsteMes: number
  completadosMesPasado: number
  actividadPorDia: { dia: string; count: number; pct: number }[]
  mejorDia: { nombre: string; count: number }
  mejorHabitoNombre: string | null
  mejorHabitoPct: number
  puntosSemanales: { label: string; value: number }[]
}

function ZapIcon({ size = 12, color = '#FFC857' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3"
      style={{ color: 'rgba(255,255,255,.22)' }}>
      {children}
    </h2>
  )
}

function frecuenciaLabel(h: Habit): string {
  if (h.frecuencia === 'veces_semana') return `${h.meta_semanal ?? '?'}×/sem`
  if (h.frecuencia === 'dias_semana') {
    const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    return (h.dias_semana ?? []).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DIAS[d]).join(' ')
  }
  return 'diario'
}

function plural(n: number, singular: string, pluralStr: string) {
  return `${n} ${n === 1 ? singular : pluralStr}`
}

export default function StatsContent({
  state, habitStats, diasConRegistros, badges,
  heatmapData, pctPromedioGeneral, mejoraMensual,
  completadosEsteMes, completadosMesPasado,
  actividadPorDia, mejorDia, mejorHabitoNombre, mejorHabitoPct,
  puntosSemanales,
}: StatsContentProps) {
  const [visible, setVisible] = useState(false)
  const [barsVisible, setBarsVisible] = useState(false)
  const badgesDesbloqueados = new Set(badges.map(b => b.badge_id))

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => setBarsVisible(true), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const mejoraPositiva = mejoraMensual >= 0
  const tengoHabits = habitStats.length > 0
  const mesActual = MESES[new Date().getMonth()]

  const promPtsSemanal = puntosSemanales.length > 0
    ? Math.round(puntosSemanales.reduce((s, w) => s + w.value, 0) / puntosSemanales.length)
    : 0

  const ptsSemanaActual  = puntosSemanales[puntosSemanales.length - 1]?.value ?? 0
  const ptsSemanaAnterior = puntosSemanales[puntosSemanales.length - 2]?.value ?? 0
  const deltaSemana = ptsSemanaAnterior > 0
    ? Math.round(((ptsSemanaActual - ptsSemanaAnterior) / ptsSemanaAnterior) * 100)
    : 0

  // Hábitos que necesitan atención (racha = 0 y tienen historial)
  const necesitanAtencion = habitStats.filter(s => s.rachaActual === 0 && s.completados > 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}>
      <div className="px-4 pt-4 pb-6 space-y-5 max-w-2xl mx-auto">

        {/* ── HERO CARD ── */}
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(18,20,38,1) 0%, rgba(11,12,22,1) 100%)',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 24,
            padding: '22px',
            boxShadow: '0 8px 40px rgba(0,0,0,.5)',
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-black leading-none" style={{ fontSize: 56, color: '#fff', letterSpacing: '-2px' }}>
                {pctPromedioGeneral}
                <span style={{ fontSize: 28, color: 'rgba(255,255,255,.4)', letterSpacing: '-1px' }}>%</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                cumplimiento · últimos 30 días
              </p>
              {(completadosMesPasado > 0 || completadosEsteMes > 0) && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: mejoraPositiva ? '#5CFF7B' : '#FF6B9D' }}>
                    {mejoraPositiva ? '↑' : '↓'} {Math.abs(mejoraMensual)}%
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>vs mes pasado</span>
                </div>
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

          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}
          >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Días con actividad</span>
            <span className="font-mono font-bold text-sm text-white">{diasConRegistros}</span>
          </div>
        </div>

        {/* ── INSIGHTS CHIPS ── */}
        {tengoHabits && (
          <div
            className="grid grid-cols-3 gap-2"
            style={{
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 80ms',
            }}
          >
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <p className="font-bold text-white text-sm leading-tight">{mejorDia.nombre}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>día más activo</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <p className="font-bold text-white text-sm leading-tight truncate">{mejorHabitoNombre ?? '—'}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{mejorHabitoPct}% cumpl.</p>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize: 16 }}>📈</span>
              <p className="font-bold text-white text-sm leading-tight">{completadosEsteMes}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>este mes</p>
            </div>
          </div>
        )}

        {/* ── NECESITAN ATENCIÓN ── */}
        {necesitanAtencion.length > 0 && (
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{
              background: 'rgba(255,107,107,.06)',
              border: '1px solid rgba(255,107,107,.15)',
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 100ms',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,150,150,.9)' }}>
                Racha interrumpida
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,120,120,.5)' }}>
                {necesitanAtencion.map(s => s.habit.nombre).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* ── HEATMAP ── */}
        <section style={{
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 120ms',
        }}>
          <SectionTitle>Actividad — últimos 90 días</SectionTitle>
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
            <Heatmap data={heatmapData} dias={90} />
          </div>
        </section>

        {/* ── POR HÁBITO ── */}
        {tengoHabits && (
          <section style={{
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 160ms',
          }}>
            <SectionTitle>Por hábito · 30 días</SectionTitle>
            <div className="space-y-3">
              {habitStats.map((s, i) => {
                const color = HABIT_PALETTE[i % HABIT_PALETTE.length]
                const rachaRota = s.rachaActual === 0 && s.completados > 0
                const esVecesSemana = s.habit.frecuencia === 'veces_semana'

                return (
                  <div
                    key={s.habit.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(16,18,32,.95)',
                      border: `1px solid ${rachaRota ? 'rgba(255,107,107,.15)' : 'rgba(255,255,255,.06)'}`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl flex-shrink-0">{s.habit.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm leading-tight truncate">{s.habit.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: `${color}15`, color: `${color}cc` }}>
                              {frecuenciaLabel(s.habit)}
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

                    {/* Barra progreso */}
                    <div className="h-2 rounded-full overflow-hidden mb-3"
                      style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div style={{
                        height: '100%',
                        width: barsVisible ? `${s.pctCumplimiento}%` : '0%',
                        borderRadius: 'inherit',
                        background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        boxShadow: `0 0 8px ${color}50`,
                        transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                      }} />
                    </div>

                    {/* Stats row */}
                    {s.completados === 0 ? (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Sin registros aún</p>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Racha */}
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: 11 }}>🔥</span>
                          {esVecesSemana ? (
                            <span style={{ fontSize: 11 }}>
                              <span className="font-semibold text-white">{s.rachaActual}</span>
                              <span style={{ color: 'rgba(255,255,255,.3)' }}>/{s.habit.meta_semanal ?? 1} sem.</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-sm" style={{ color: s.rachaActual > 0 ? '#FF7A3D' : 'rgba(255,255,255,.35)' }}>
                              {plural(s.rachaActual, 'día', 'días')}
                            </span>
                          )}
                          {/* Mejor racha solo si es diferente */}
                          {!esVecesSemana && s.mejorRacha > s.rachaActual && s.mejorRacha > 1 && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginLeft: 2 }}>
                              / {s.mejorRacha}d mejor
                            </span>
                          )}
                        </div>

                        {s.diasEsteMes > 0 && (
                          <>
                            <span style={{ color: 'rgba(255,255,255,.1)' }}>·</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                              <span className="font-semibold text-white">{s.diasEsteMes}</span> en {mesActual}
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

        {/* ── ACTIVIDAD POR DÍA ── */}
        <section style={{
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 200ms',
        }}>
          <SectionTitle>Actividad por día</SectionTitle>
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
            {DIAS_ORDEN_SEMANA.map(dowIdx => {
              const d = actividadPorDia[dowIdx]
              const isBest = d.dia === mejorDia.nombre
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
                      transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${DIAS_ORDEN_SEMANA.indexOf(dowIdx) * 60}ms`,
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

        {/* ── EVOLUCIÓN DE PUNTOS ── */}
        <section style={{
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 240ms',
        }}>
          <SectionTitle>Evolución de puntos</SectionTitle>
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <ZapIcon size={14} color="#FFC857" />
                  <span className="font-mono font-black text-xl text-white">{state.puntos}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>pts totales</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', marginTop: 2 }}>
                  Promedio semanal: <span className="text-white font-semibold">{promPtsSemanal} pts</span>
                </p>
              </div>
              {deltaSemana !== 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                  background: deltaSemana > 0 ? 'rgba(92,255,123,.1)' : 'rgba(255,107,157,.1)',
                  color: deltaSemana > 0 ? '#5CFF7B' : '#FF6B9D',
                  border: `1px solid ${deltaSemana > 0 ? 'rgba(92,255,123,.2)' : 'rgba(255,107,157,.2)'}`,
                }}>
                  {deltaSemana > 0 ? '↑' : '↓'} {Math.abs(deltaSemana)}% esta semana
                </span>
              )}
            </div>
            {puntosSemanales.length >= 2 ? (
              <TrendChart data={puntosSemanales} color="#7c6fff" height={100} />
            ) : (
              <div className="flex items-center justify-center py-8"
                style={{ color: 'rgba(255,255,255,.2)', fontSize: 13 }}>
                Completá hábitos esta semana para ver la evolución
              </div>
            )}
          </div>
        </section>

        {/* ── INSIGNIAS ── */}
        <section style={{
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 280ms',
        }}>
          <SectionTitle>Insignias</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {BADGES.map((badge, i) => {
              const desbloqueado = badgesDesbloqueados.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center rounded-2xl p-3.5 border"
                  style={{
                    background: desbloqueado
                      ? 'linear-gradient(180deg, rgba(255,184,79,.07), rgba(10,10,20,.98))'
                      : 'rgba(255,255,255,.02)',
                    borderColor: desbloqueado ? 'rgba(255,184,79,.18)' : 'rgba(255,255,255,.04)',
                    opacity: desbloqueado ? 1 : 0.3,
                    transform: visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `all 0.4s cubic-bezier(0.4,0,0.2,1) ${180 + i * 35}ms`,
                  }}
                >
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
