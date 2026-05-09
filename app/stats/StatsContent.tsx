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

// Sunday=0
const DIAS_ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0] // Lun→Dom
const DIAS_FULL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface HabitStats {
  habit: Habit
  completados: number
  promedio: number | null
  mejorRacha: number
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
  const maxDowCount = Math.max(...actividadPorDia.map(d => d.count), 1)

  // Puntos promedio semanal
  const promPtsSemanal = puntosSemanales.length > 0
    ? Math.round(puntosSemanales.reduce((s, w) => s + w.value, 0) / puntosSemanales.length)
    : 0

  // Puntos esta semana vs semana anterior
  const ptsSemanaActual = puntosSemanales[puntosSemanales.length - 1]?.value ?? 0
  const ptsSemanaAnterior = puntosSemanales[puntosSemanales.length - 2]?.value ?? 0
  const deltaSemana = ptsSemanaAnterior > 0
    ? Math.round(((ptsSemanaActual - ptsSemanaAnterior) / ptsSemanaAnterior) * 100)
    : 0

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
            {/* Izquierda: pct + label + insight */}
            <div className="flex-1 min-w-0">
              <p
                className="font-black leading-none"
                style={{ fontSize: 56, color: '#fff', letterSpacing: '-2px' }}
              >
                {pctPromedioGeneral}
                <span style={{ fontSize: 28, color: 'rgba(255,255,255,.4)', letterSpacing: '-1px' }}>%</span>
              </p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.4)' }}>
                cumplimiento promedio
              </p>
              {(completadosMesPasado > 0 || completadosEsteMes > 0) && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: mejoraPositiva ? '#5CFF7B' : '#FF6B9D',
                  }}>
                    {mejoraPositiva ? '↑' : '↓'} {Math.abs(mejoraMensual)}%
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>
                    vs mes pasado
                  </span>
                </div>
              )}
            </div>

            {/* Centro: ring */}
            <ProgressRing
              value={pctPromedioGeneral}
              size={76}
              stroke={6}
              color="#7c6fff"
            />

            {/* Derecha: mini stats */}
            <div className="space-y-2.5 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 14 }}>🔥</span>
                <span className="font-bold text-sm text-white">{state.streak}d</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ZapIcon size={12} color="#FFC857" />
                <span className="font-bold text-sm" style={{ color: '#FFC857' }}>{state.puntos}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 12 }}>✅</span>
                <span className="font-bold text-sm text-white">{habitStats.length}</span>
              </div>
            </div>
          </div>

          {/* Días registrados */}
          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}
          >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
              Días con actividad
            </span>
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
            {/* Mejor día */}
            <div
              className="rounded-2xl p-3 flex flex-col gap-1"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
            >
              <span style={{ fontSize: 16 }}>📅</span>
              <p className="font-bold text-white text-sm leading-tight">{mejorDia.nombre}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>día más activo</p>
            </div>

            {/* Mejor hábito */}
            <div
              className="rounded-2xl p-3 flex flex-col gap-1"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
            >
              <span style={{ fontSize: 16 }}>🏆</span>
              <p className="font-bold text-white text-sm leading-tight truncate">
                {mejorHabitoNombre ?? '—'}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{mejorHabitoPct}% cumpl.</p>
            </div>

            {/* Este mes */}
            <div
              className="rounded-2xl p-3 flex flex-col gap-1"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
            >
              <span style={{ fontSize: 16 }}>📈</span>
              <p className="font-bold text-white text-sm leading-tight">{completadosEsteMes}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>hábitos este mes</p>
            </div>
          </div>
        )}

        {/* ── HEATMAP ── */}
        <section
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 120ms',
          }}
        >
          <SectionTitle>Actividad — últimos 90 días</SectionTitle>
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,.025)',
              border: '1px solid rgba(255,255,255,.05)',
            }}
          >
            <Heatmap data={heatmapData} dias={90} />
          </div>
        </section>

        {/* ── POR HÁBITO ── */}
        {tengoHabits && (
          <section
            style={{
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 160ms',
            }}
          >
            <SectionTitle>Por hábito</SectionTitle>
            <div className="space-y-3">
              {habitStats.map((s, i) => {
                const color = HABIT_PALETTE[i % HABIT_PALETTE.length]
                return (
                  <div
                    key={s.habit.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(16,18,32,.95)',
                      border: `1px solid rgba(255,255,255,.06)`,
                      transition: 'transform 0.25s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{s.habit.emoji}</span>
                        <div>
                          <p className="font-bold text-white text-sm">{s.habit.nombre}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
                            {s.completados} días totales
                            {s.promedio != null && s.habit.campo_extra !== 'ninguno' &&
                              ` · prom. ${s.promedio.toFixed(1)} ${s.habit.campo_extra}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.mejorRacha >= 2 && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{
                              background: 'rgba(255,122,61,.12)',
                              color: '#FF7A3D',
                              border: '1px solid rgba(255,122,61,.2)',
                            }}
                          >
                            🔥 {s.mejorRacha}d
                          </span>
                        )}
                        <span
                          className="font-mono font-bold text-base"
                          style={{ color }}
                        >
                          {s.pctCumplimiento}%
                        </span>
                      </div>
                    </div>

                    {/* Barra progreso animada */}
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,.06)' }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: barsVisible ? `${s.pctCumplimiento}%` : '0%',
                          borderRadius: 'inherit',
                          background: `linear-gradient(90deg, ${color}cc, ${color})`,
                          boxShadow: `0 0 8px ${color}50`,
                          transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                        }}
                      />
                    </div>

                    {/* Mini stats */}
                    <div className="flex items-center gap-4 mt-2.5">
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)' }}>
                        Este mes: <span className="text-white font-semibold">{s.diasEsteMes}d</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)' }}>
                        Mejor racha: <span className="text-white font-semibold">{s.mejorRacha}d</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── ACTIVIDAD POR DÍA ── */}
        <section
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 200ms',
          }}
        >
          <SectionTitle>Actividad por día</SectionTitle>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{
              background: 'rgba(255,255,255,.025)',
              border: '1px solid rgba(255,255,255,.05)',
            }}
          >
            {DIAS_ORDEN_SEMANA.map(dowIdx => {
              const d = actividadPorDia[dowIdx]
              const isBest = d.dia === mejorDia.nombre
              const barColor = isBest ? '#5CFF7B' : '#7c6fff'
              return (
                <div key={d.dia} className="flex items-center gap-3">
                  <span
                    className="text-xs font-medium w-8 flex-shrink-0 text-right"
                    style={{ color: isBest ? '#5CFF7B' : 'rgba(255,255,255,.35)' }}
                  >
                    {d.dia}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,.06)' }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: barsVisible ? `${d.pct}%` : '0%',
                        borderRadius: 'inherit',
                        background: isBest
                          ? 'linear-gradient(90deg, #5CFF7B99, #5CFF7B)'
                          : `linear-gradient(90deg, ${barColor}66, ${barColor}99)`,
                        boxShadow: isBest ? '0 0 6px rgba(92,255,123,.4)' : 'none',
                        transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${DIAS_ORDEN_SEMANA.indexOf(dowIdx) * 60}ms`,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-6 flex-shrink-0"
                    style={{ color: isBest ? '#5CFF7B' : 'rgba(255,255,255,.2)' }}
                  >
                    {d.count}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── EVOLUCIÓN DE PUNTOS ── */}
        {puntosSemanales.length >= 2 && (
          <section
            style={{
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 240ms',
            }}
          >
            <SectionTitle>Evolución de puntos</SectionTitle>
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.05)',
              }}
            >
              {/* Header con stats */}
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
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: deltaSemana > 0 ? 'rgba(92,255,123,.1)' : 'rgba(255,107,157,.1)',
                      color: deltaSemana > 0 ? '#5CFF7B' : '#FF6B9D',
                      border: `1px solid ${deltaSemana > 0 ? 'rgba(92,255,123,.2)' : 'rgba(255,107,157,.2)'}`,
                    }}
                  >
                    {deltaSemana > 0 ? '↑' : '↓'} {Math.abs(deltaSemana)}% esta semana
                  </span>
                )}
              </div>
              <TrendChart data={puntosSemanales} color="#7c6fff" height={100} />
            </div>
          </section>
        )}

        {/* ── INSIGNIAS ── */}
        <section
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1) 280ms',
          }}
        >
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
