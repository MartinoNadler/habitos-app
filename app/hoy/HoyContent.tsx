'use client'

import { useEffect, useState } from 'react'
import HabitCard from '@/components/habits/HabitCard'
import { getNivel } from '@/lib/types'
import type { HabitWithRecord, UserState } from '@/lib/types'

const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] // Sunday=0

export interface HabitDato {
  habit: HabitWithRecord
  index: number
  streakActual: number
  weekCompleted: string[]
}

export interface ResumenSemanalData {
  estaSemanaCumplidos:   number
  semanaPasadaCumplidos: number
  porDia:                number[]  // [Lun=0 … Dom=6]
  mejorHabito:           { nombre: string; emoji: string } | null
}

interface HoyContentProps {
  state:           UserState
  habitDatos:      HabitDato[]
  weekDates:       string[]
  today:           string
  completadosHoy:  number
  totalHabitos:    number
  displayName?:    string
  resumenSemanal:  ResumenSemanalData
}

function getHeroData(
  streak: number,
  completados: number,
  total: number,
  bestStreak: number,
  nombre?: string,
): { titulo: string; subtitulo: string; color: string } {
  const hola = nombre ? `${nombre}, ` : ''
  const n = nombre ? `, ${nombre}` : ''
  if (total === 0) return {
    titulo: nombre ? `¡Hola, ${nombre}!` : 'Bienvenido',
    subtitulo: 'Agregá tus primeros hábitos desde Configuración',
    color: '#4D8DFF',
  }
  if (streak === 0 && completados === 0) return {
    titulo: nombre ? `¿Empezamos${n}?` : 'Nuevo comienzo',
    subtitulo: 'Hoy puede ser el día uno de tu racha',
    color: '#9B5DFF',
  }
  if (streak === 0 && completados > 0 && completados < total) return {
    titulo: nombre ? `Arrancaste bien${n} 💪` : 'Arrancaste bien 💪',
    subtitulo: `${total - completados} hábito${total - completados > 1 ? 's' : ''} pendiente${total - completados > 1 ? 's' : ''}`,
    color: '#4D8DFF',
  }
  if (streak === 0 && completados === total) return {
    titulo: nombre ? `¡Bien hecho${n}! 🎉` : '¡Día completo! 🎉',
    subtitulo: 'Completaste todos tus hábitos hoy',
    color: '#5CFF7B',
  }
  if (streak > 0 && completados === 0) return {
    titulo: `🔥 ${streak} día${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''}`,
    subtitulo: nombre ? `No rompas la racha${n}, ¡completá algo hoy!` : 'Completá algo hoy para no perder la racha',
    color: '#FF7A3D',
  }
  if (streak === bestStreak && streak > 2) return {
    titulo: `🔥 ${streak} días seguidos`,
    subtitulo: nombre ? `¡Nueva mejor racha personal${n}! 🏆` : '¡Mejor racha personal! 🏆',
    color: '#FFC857',
  }
  if (completados === total) return {
    titulo: `🔥 ${streak} días seguidos`,
    subtitulo: nombre ? `¡Racha asegurada${n}! Día completo 🎉` : '¡Racha asegurada! Día completo 🎉',
    color: '#5CFF7B',
  }
  return {
    titulo: `🔥 ${streak} día${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''}`,
    subtitulo: nombre
      ? `Vas bien${n} — ${total - completados} más para asegurar la racha`
      : `Vas bien — ${total - completados} más para asegurar la racha`,
    color: '#FF7A3D',
  }
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function ResumenSemanalCard({ data, hoy }: { data: ResumenSemanalData; hoy: string }) {
  const { estaSemanaCumplidos, semanaPasadaCumplidos, porDia, mejorHabito } = data
  const maxBar = Math.max(...porDia, 1)
  const hoyDow = (new Date(hoy + 'T00:00:00').getDay() + 6) % 7  // 0=Lun

  const delta = semanaPasadaCumplidos > 0
    ? Math.round(((estaSemanaCumplidos - semanaPasadaCumplidos) / semanaPasadaCumplidos) * 100)
    : null

  return (
    <div style={{
      background: 'rgba(16,18,32,.95)',
      border: '1px solid rgba(255,255,255,.06)',
      borderRadius: 20,
      padding: '16px 16px 14px',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.22)' }}>
          Esta semana
        </span>
        {delta !== null && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{
            background: delta >= 0 ? 'rgba(92,255,123,.1)' : 'rgba(255,107,107,.1)',
            color:      delta >= 0 ? '#5CFF7B' : '#FF6B9D',
            border:    `1px solid ${delta >= 0 ? 'rgba(92,255,123,.2)' : 'rgba(255,107,107,.2)'}`,
          }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs sem. ant.
          </span>
        )}
      </div>

      {/* Barras por día */}
      <div className="flex items-end gap-1.5 mb-3" style={{ height: 48 }}>
        {DIAS_SEMANA.map((dia, idx) => {
          const count    = porDia[idx]
          const isToday  = idx === hoyDow
          const isFuture = idx > hoyDow
          const barH     = isFuture ? 3 : count > 0 ? Math.max(Math.round((count / maxBar) * 36), 8) : 3

          return (
            <div key={idx} className="flex flex-col items-center justify-end gap-1 flex-1" style={{ height: 48 }}>
              <div style={{
                width: '100%',
                height: barH,
                borderRadius: 3,
                background: isFuture
                  ? 'rgba(255,255,255,.04)'
                  : count > 0
                  ? isToday ? '#7c6fff' : 'rgba(124,111,255,.45)'
                  : isToday ? 'rgba(124,111,255,.12)' : 'rgba(255,255,255,.05)',
                border: isToday && count === 0 ? '1px solid rgba(124,111,255,.25)' : 'none',
                boxShadow: isToday && count > 0 ? '0 0 8px rgba(124,111,255,.5)' : 'none',
                transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
              }} />
              <span style={{
                fontSize: 9,
                lineHeight: 1,
                color:      isToday ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)',
                fontWeight: isToday ? 700 : 400,
              }}>
                {dia}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
          <span className="font-bold text-white">{estaSemanaCumplidos}</span> cumplidos
          {semanaPasadaCumplidos > 0 && (
            <span style={{ color: 'rgba(255,255,255,.2)' }}> · {semanaPasadaCumplidos} sem. ant.</span>
          )}
        </p>
        {mejorHabito && estaSemanaCumplidos > 0 && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
            {mejorHabito.emoji} <span className="text-white">{mejorHabito.nombre}</span>
          </p>
        )}
      </div>
    </div>
  )
}

export default function HoyContent({
  state,
  habitDatos,
  weekDates,
  today,
  completadosHoy,
  totalHabitos,
  displayName,
  resumenSemanal,
}: HoyContentProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const nivel = getNivel(state.puntos)
  const { titulo, subtitulo, color } = getHeroData(state.streak, completadosHoy, totalHabitos, state.best_streak, displayName)
  const pctDia = totalHabitos > 0 ? Math.round((completadosHoy / totalHabitos) * 100) : 0
  const diaCompleto = completadosHoy === totalHabitos && totalHabitos > 0

  return (
    <div className="min-h-screen pb-24" style={{ background: 'radial-gradient(ellipse at top, #111827, #090B14)' }}>
      <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto">

        {/* ── HERO CARD ── */}
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(20,22,40,1) 0%, rgba(12,13,24,1) 100%)',
            border: `1px solid ${diaCompleto ? 'rgba(92,255,123,.25)' : 'rgba(255,255,255,.07)'}`,
            borderRadius: 24,
            padding: '22px 22px 18px',
            boxShadow: diaCompleto
              ? '0 0 0 1px rgba(92,255,123,.06), 0 8px 32px rgba(0,0,0,.5)'
              : '0 8px 32px rgba(0,0,0,.4)',
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Streak + mensaje */}
          <div className="mb-5">
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: 22, color: '#fff', letterSpacing: '-0.3px' }}
            >
              {titulo}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.45)' }}>
              {subtitulo}
            </p>
          </div>

          {/* Barra progreso hábitos */}
          {totalHabitos > 0 && (
            <div className="mb-5">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-semibold text-white">
                  {completadosHoy === 0
                    ? 'Todavía no empezaste'
                    : completadosHoy === totalHabitos
                    ? 'Todo completado'
                    : `${completadosHoy} de ${totalHabitos} hábitos`}
                </span>
                {completadosHoy > 0 && (
                  <span className="font-mono text-xs" style={{ color: diaCompleto ? '#5CFF7B' : color }}>
                    {pctDia}%
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pctDia}%`,
                    borderRadius: 'inherit',
                    background: diaCompleto
                      ? 'linear-gradient(90deg, #5CFF7B, #00E5CC)'
                      : `linear-gradient(90deg, ${color}, ${color}bb)`,
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1) 200ms',
                    boxShadow: pctDia > 0 ? `0 0 10px ${color}60` : 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Barra XP nivel */}
          <div
            className="pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFC857" stroke="none">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,.55)' }}>
                  {nivel.nombre}
                </span>
              </div>
              {nivel.max !== Infinity ? (
                <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,.3)' }}>
                  {state.puntos} / {nivel.max}
                </span>
              ) : (
                <span className="font-mono text-[11px]" style={{ color: '#FFC857' }}>{state.puntos} pts</span>
              )}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${nivel.progreso}%`,
                  borderRadius: 'inherit',
                  background: 'linear-gradient(90deg, #7c6fff, #4D8DFF)',
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1) 400ms',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── RESUMEN SEMANAL ── */}
        {(resumenSemanal.estaSemanaCumplidos > 0 || resumenSemanal.semanaPasadaCumplidos > 0) && (
          <div
            style={{
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              opacity:   visible ? 1 : 0,
              transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1) 100ms',
            }}
          >
            <ResumenSemanalCard data={resumenSemanal} hoy={today} />
          </div>
        )}

        {/* ── HÁBITOS ── */}
        <section>
          {habitDatos.length === 0 ? (
            <div
              className="text-center py-16"
              style={{ color: 'rgba(255,255,255,.25)' }}
            >
              <p className="text-5xl mb-4">🌱</p>
              <p className="font-semibold">No tenés hábitos activos</p>
              <p className="text-sm mt-1 opacity-70">Agregá uno desde Configuración</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {habitDatos.map(({ habit, index, streakActual, weekCompleted }) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  index={index}
                  streakActual={streakActual}
                  weekDates={weekDates}
                  weekCompleted={weekCompleted}
                  today={today}
                  visible={visible}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
