'use client'

import { useEffect, useState } from 'react'
import ProgressRing from '@/components/ui/ProgressRing'
import { BADGES } from '@/lib/logic/badges'
import type { Habit, UserState, UserBadge } from '@/lib/types'

// Iconos SVG inline — sin dependencias externas
const Icons = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
}

// Paleta de colores por índice — cada hábito tiene su identidad visual
const HABIT_PALETTE = [
  { glow: '#FF7A3D', ring: '#FF7A3D' },
  { glow: '#4D8DFF', ring: '#4D8DFF' },
  { glow: '#B26BFF', ring: '#B26BFF' },
  { glow: '#59E1FF', ring: '#59E1FF' },
  { glow: '#5CFF7B', ring: '#5CFF7B' },
  { glow: '#FFC857', ring: '#FFC857' },
  { glow: '#FF6B9D', ring: '#FF6B9D' },
  { glow: '#00E5CC', ring: '#00E5CC' },
]

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
}

function getMensaje(streak: number, pct: number, mejorRacha: number): { texto: string; color: string } {
  if (mejorRacha > 0 && streak >= mejorRacha && streak > 0)
    return { texto: '¡Mejor racha personal! 🏆', color: '#FFC857' }
  if (mejorRacha > 0 && streak > 0 && mejorRacha - streak <= 2)
    return { texto: `A ${mejorRacha - streak} días del récord`, color: '#FF7A3D' }
  if (pct >= 90) return { texto: 'Muy consistente ⚡', color: '#5CFF7B' }
  if (pct >= 70) return { texto: 'Buen ritmo 💪',       color: '#4D8DFF' }
  if (pct >= 50) return { texto: 'Podés mejorar',        color: '#FFC857' }
  if (streak > 5) return { texto: `En racha 🔥`,          color: '#FF7A3D' }
  if (pct < 20)   return { texto: 'Retomá el hábito',    color: '#FF6B9D' }
  return { texto: 'Seguí adelante', color: '#7c6fff' }
}

function SummaryCard({
  label,
  value,
  sublabel,
  color,
  icon,
}: {
  label: string
  value: string | number
  sublabel?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col justify-between rounded-2xl p-4 border relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(22,22,40,.98), rgba(10,10,20,1))',
        borderColor: 'rgba(255,255,255,.07)',
        boxShadow: '0 8px 30px rgba(0,0,0,.4)',
        minHeight: 110,
      }}
    >
      {/* Glow de fondo sutil */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />

      {/* Icono */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {icon}
      </div>

      {/* Valor */}
      <div>
        <div className="font-mono font-bold text-3xl text-white leading-none tracking-tight">
          {value}
        </div>
        {sublabel && (
          <div className="text-[10px] mt-0.5" style={{ color: `${color}99` }}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-xs text-text-muted mt-2 font-medium">{label}</div>

      {/* Línea inferior */}
      <div className="h-px w-full mt-3 rounded-full" style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }} />
    </div>
  )
}

function HabitCard({ stats, index, visible }: { stats: HabitStats; index: number; visible: boolean }) {
  const palette = HABIT_PALETTE[index % HABIT_PALETTE.length]
  const mensaje = getMensaje(0, stats.pctCumplimiento, stats.mejorRacha)

  return (
    <div
      className="relative flex items-center gap-4 rounded-3xl p-5 border overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(20,20,35,.95), rgba(10,10,20,.98))',
        borderColor: 'rgba(255,255,255,.06)',
        boxShadow: '0 8px 30px rgba(0,0,0,.35)',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 60}ms`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,.45)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 8px 30px rgba(0,0,0,.35)'
      }}
    >
      {/* Glow lateral izquierdo */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
        style={{
          backgroundColor: palette.glow,
          boxShadow: `0 0 12px 2px ${palette.glow}60`,
        }}
      />

      {/* Emoji + info */}
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{stats.habit.emoji}</span>
          <div>
            <p className="font-bold text-white text-base leading-tight">{stats.habit.nombre}</p>
            <p className="text-xs mt-0.5" style={{ color: mensaje.color }}>
              {mensaje.texto}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-amber text-sm">🔥</span>
            <div>
              <p className="font-mono font-bold text-white text-lg leading-none">{stats.mejorRacha}</p>
              <p className="text-text-muted text-[10px]">mejor racha</p>
            </div>
          </div>
          <div className="w-px h-8 bg-surface-3" />
          <div className="flex items-center gap-1.5">
            <span className="text-accent text-sm">📅</span>
            <div>
              <p className="font-mono font-bold text-white text-lg leading-none">{stats.diasEsteMes}</p>
              <p className="text-text-muted text-[10px]">días este mes</p>
            </div>
          </div>
          <div className="w-px h-8 bg-surface-3" />
          <div>
            <p className="font-mono font-bold text-white text-lg leading-none">{stats.completados}</p>
            <p className="text-text-muted text-[10px]">total días</p>
          </div>
        </div>

        {stats.promedio != null && stats.habit.campo_extra !== 'ninguno' && (
          <div className="mt-2 pt-2 border-t border-surface-3/50">
            <span className="text-text-muted text-xs">
              Promedio: <span className="font-mono text-white">{stats.promedio.toFixed(1)}</span>{' '}
              <span style={{ color: palette.glow }}>{stats.habit.campo_extra}</span>
            </span>
          </div>
        )}
      </div>

      {/* Progress Ring */}
      <ProgressRing
        value={stats.pctCumplimiento}
        size={72}
        stroke={6}
        color={palette.ring}
      />
    </div>
  )
}

export default function StatsContent({ state, habitStats, diasConRegistros, badges }: StatsContentProps) {
  const [visible, setVisible] = useState(false)
  const badgesDesbloqueados = new Set(badges.map(b => b.badge_id))

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: 'radial-gradient(circle at top left, #1B1F3A, #090B14)',
      }}
    >
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">

        {/* Summary cards */}
        <div
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={Icons.calendar}
              label="Días registrados"
              value={diasConRegistros}
              sublabel="check-ins totales"
              color="#4D8DFF"
            />
            <SummaryCard
              icon={Icons.flame}
              label="Racha diaria"
              value={state.best_streak}
              sublabel="mejor racha"
              color="#FF7A3D"
            />
            <SummaryCard
              icon={Icons.zap}
              label="Puntos totales"
              value={state.puntos}
              sublabel="acumulados"
              color="#FFC857"
            />
            <SummaryCard
              icon={Icons.check}
              label="Hábitos activos"
              value={habitStats.length}
              sublabel="en seguimiento"
              color="#5CFF7B"
            />
          </div>
        </div>

        {/* Hábitos */}
        {habitStats.length > 0 && (
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Por hábito
            </h2>
            <div className="space-y-3">
              {habitStats.map((s, i) => (
                <HabitCard key={s.habit.id} stats={s} index={i} visible={visible} />
              ))}
            </div>
          </section>
        )}

        {/* Insignias */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Insignias
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((badge, i) => {
              const desbloqueado = badgesDesbloqueados.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center rounded-2xl p-4 border transition-all"
                  style={{
                    background: desbloqueado
                      ? 'linear-gradient(180deg, rgba(255,184,79,.08), rgba(10,10,20,.98))'
                      : 'linear-gradient(180deg, rgba(20,20,35,.6), rgba(10,10,20,.98))',
                    borderColor: desbloqueado ? 'rgba(255,184,79,.2)' : 'rgba(255,255,255,.04)',
                    opacity: desbloqueado ? 1 : 0.35,
                    transform: visible ? 'translateY(0)' : 'translateY(16px)',
                    transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${200 + i * 40}ms`,
                  }}
                >
                  <span className="text-2xl mb-1">{badge.emoji}</span>
                  <span className="text-xs font-semibold text-white leading-tight">{badge.nombre}</span>
                  <span className="text-[10px] text-text-muted mt-0.5 leading-tight">{badge.descripcion}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
