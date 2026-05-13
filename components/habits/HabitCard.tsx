'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkHabitAction, undoCheckAction } from '@/app/actions/habits'
import CheckModal from './CheckModal'
import HabitForm from './HabitForm'
import { PtsFloat } from '@/components/ui/Toast'
import type { HabitWithRecord } from '@/lib/types'

const HABIT_COLORS = [
  '#FF7A3D', '#4D8DFF', '#B26BFF', '#59E1FF',
  '#5CFF7B', '#FFC857', '#FF6B9D', '#00E5CC',
]

// Sunday=0 → D, Monday=1 → L, ...
const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

interface HabitCardProps {
  habit: HabitWithRecord
  index: number
  streakActual: number
  weekDates: string[]     // últimos 7 días YYYY-MM-DD, de viejo a nuevo
  weekCompleted: string[] // cuáles de esos 7 están completados
  today: string
  visible: boolean
}

function streakStyle(s: number): { color: string; bg: string; border: string; emoji: string } {
  if (s >= 30) return { color: '#FFC857', bg: 'rgba(255,200,87,.12)',  border: 'rgba(255,200,87,.28)',  emoji: '🏆' }
  if (s >= 14) return { color: '#FF6B3D', bg: 'rgba(255,107,61,.12)',  border: 'rgba(255,107,61,.28)',  emoji: '🔥' }
  if (s >= 7)  return { color: '#FF7A3D', bg: 'rgba(255,122,61,.12)',  border: 'rgba(255,122,61,.25)',  emoji: '🔥' }
  if (s >= 3)  return { color: '#FF9A5C', bg: 'rgba(255,154,92,.1)',   border: 'rgba(255,154,92,.2)',   emoji: '🔥' }
  if (s >= 1)  return { color: 'rgba(255,255,255,.5)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.1)', emoji: '✦' }
  return       { color: 'rgba(255,255,255,.3)', bg: 'transparent',              border: 'transparent',            emoji: '' }
}

export default function HabitCard({
  habit,
  index,
  streakActual,
  weekDates,
  weekCompleted,
  today,
  visible,
}: HabitCardProps) {
  const color = HABIT_COLORS[index % HABIT_COLORS.length]
  const router = useRouter()

  const [showModal, setShowModal]             = useState(false)
  const [showEditForm, setShowEditForm]       = useState(false)
  const [ptsAnim, setPtsAnim]                 = useState<number | null>(null)
  const [localCompletado, setLocalCompletado] = useState(!!habit.record)
  const [streakLocal, setStreakLocal]         = useState(streakActual)
  const procesando = useRef(false)

  // localCompletado es la única fuente de verdad para la UI
  // (inicializado desde habit.record al montar, luego controlado localmente)
  const completado = localCompletado
  const weekSet = new Set(weekCompleted)

  // Un solo handler para completar Y deshacer — sin loading state para respuesta instantánea
  async function handleToggle() {
    if (procesando.current) return   // bloqueo sincrónico: ningún tap extra pasa
    procesando.current = true

    if (completado) {
      // ── DESHACER — optimista inmediato ─────────────────
      setLocalCompletado(false)
      setStreakLocal(prev => Math.max(0, prev - 1))
      const fd = new FormData()
      fd.set('habit_id', habit.id)
      fd.set('fecha', today)
      const result = await undoCheckAction(fd)
      procesando.current = false
      if (result?.error) {
        setLocalCompletado(true)              // revertir si falló
        setStreakLocal(streakActual)
      } else if (habit.record?.pts) {
        window.dispatchEvent(new CustomEvent('habit-pts', { detail: -habit.record.pts }))
      }
    } else {
      // ── COMPLETAR — optimista inmediato ────────────────
      if (habit.campo_extra !== 'ninguno') {
        setShowModal(true)
        procesando.current = false
        return
      }
      setLocalCompletado(true)
      setStreakLocal(prev => prev + 1)
      const fd = new FormData()
      fd.set('habit_id', habit.id)
      const result = await checkHabitAction(fd)
      procesando.current = false
      if (result?.error) {
        setLocalCompletado(false)             // revertir si falló
        setStreakLocal(streakActual)
      } else if (result?.pts) {
        setPtsAnim(result.pts)
        window.dispatchEvent(new CustomEvent('habit-pts', { detail: result.pts }))
      }
    }
  }

  return (
    <>
      {ptsAnim !== null && <PtsFloat pts={ptsAnim} onDone={() => setPtsAnim(null)} />}

      <div
        style={{
          position: 'relative',
          background: completado
            ? `linear-gradient(145deg, ${color}0d, rgba(12,13,24,1))`
            : 'rgba(16,18,32,0.95)',
          border: `1px solid ${completado ? `${color}30` : 'rgba(255,255,255,.06)'}`,
          borderRadius: 16,
          padding: '14px 14px 12px 18px',
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: `transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 50}ms, border-color 0.3s, background 0.3s`,
        }}
      >
        {/* Accent bar izquierdo */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 10, bottom: 10,
            width: 3,
            borderRadius: 3,
            background: completado ? color : `${color}60`,
            transition: 'background 0.3s',
          }}
        />

        <div className="flex items-center gap-3">
          {/* Emoji */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${color}12` }}
          >
            {habit.emoji}
          </div>

          {/* Info central */}
          <div className="flex-1 min-w-0">
            {/* Nombre + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white leading-tight">
                {habit.nombre}
              </span>
              {habit.frecuencia === 'veces_semana' ? (
                // Badge: X/N esta semana
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: streakLocal >= (habit.meta_semanal ?? 3)
                      ? 'rgba(92,255,123,.12)' : 'rgba(255,255,255,.06)',
                    color: streakLocal >= (habit.meta_semanal ?? 3)
                      ? '#5CFF7B' : 'rgba(255,255,255,.4)',
                    border: `1px solid ${streakLocal >= (habit.meta_semanal ?? 3)
                      ? 'rgba(92,255,123,.25)' : 'rgba(255,255,255,.1)'}`,
                  }}
                >
                  {streakLocal}/{habit.meta_semanal ?? 3} sem
                </span>
              ) : streakLocal >= 1 ? (
                // Badge: racha de días — color por milestone
                (() => {
                  const s = streakStyle(streakLocal)
                  return (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-all duration-300"
                      style={{
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      {s.emoji} {streakLocal}d
                    </span>
                  )
                })()
              ) : null}
              {/* Badge valor numérico */}
              {completado && habit.record?.valor != null && habit.campo_extra !== 'ninguno' && habit.campo_extra !== 'nota' && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                >
                  {habit.record.valor} {habit.campo_extra}
                </span>
              )}
              {completado && habit.record && (
                <span
                  className="text-[10px] font-mono font-bold flex-shrink-0"
                  style={{ color }}
                >
                  +{habit.record.pts}
                </span>
              )}
            </div>

            {/* Subtítulo */}
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.28)' }}>
              {habit.esfuerzo}&nbsp;·&nbsp;{habit.categoria}
              {completado && habit.record?.valor != null && (
                <> &nbsp;·&nbsp;
                  <span className="font-mono">{habit.record.valor} {habit.campo_extra}</span>
                </>
              )}
            </p>

            {/* Mini barras semanales */}
            <div className="flex items-end gap-1 mt-2.5">
              {weekDates.map((date) => {
                const dow = new Date(date + 'T00:00:00').getDay()
                const programado = habit.frecuencia !== 'dias_semana' || (habit.dias_semana ?? []).includes(dow)
                const done = programado && (weekSet.has(date) || (date === today && completado))
                const isToday = date === today
                const dayLabel = DIAS_LABEL[dow]
                return (
                  <div key={date} className="flex flex-col items-center gap-0.5">
                    <div
                      style={{
                        width: 7,
                        height: 14,
                        borderRadius: 2,
                        background: !programado
                          ? 'rgba(255,255,255,.03)'
                          : done
                          ? color
                          : isToday
                          ? `${color}20`
                          : 'rgba(255,255,255,.06)',
                        border: isToday && !done && programado ? `1px solid ${color}35` : 'none',
                        transition: 'background 0.3s',
                        boxShadow: done && isToday ? `0 0 6px ${color}80` : 'none',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 8,
                        lineHeight: 1,
                        color: !programado
                          ? 'rgba(255,255,255,.1)'
                          : isToday
                          ? 'rgba(255,255,255,.55)'
                          : 'rgba(255,255,255,.2)',
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {dayLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botones derecha */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* Editar */}
            <button
              onClick={() => setShowEditForm(true)}
              aria-label={`Editar ${habit.nombre}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
              style={{ color: 'rgba(255,255,255,.2)', background: 'transparent' }}
              onTouchStart={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
              onTouchEnd={e => { e.currentTarget.style.color = 'rgba(255,255,255,.2)'; e.currentTarget.style.background = 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.2)'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            {/* Completar / deshacer */}
            <button
              onClick={handleToggle}
              aria-label={completado ? `Deshacer ${habit.nombre}` : `Completar ${habit.nombre}`}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90"
              style={{
                background: completado ? `${color}20` : 'rgba(255,255,255,.05)',
                border: `2px solid ${completado ? color : 'rgba(255,255,255,.1)'}`,
                boxShadow: completado ? `0 0 18px ${color}35` : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.1s',
              }}
            >
              {completado ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <CheckModal
          habit={habit}
          onClose={() => { setShowModal(false); procesando.current = false }}
          onSuccess={() => {
            setShowModal(false)
            setLocalCompletado(true)
            setStreakLocal(prev => prev + 1)
            procesando.current = false
          }}
          onError={() => {
            setLocalCompletado(false)
            setStreakLocal(streakActual)
          }}
          onPts={(pts) => setPtsAnim(pts)}
        />
      )}

      {showEditForm && (
        <HabitForm
          habit={habit}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
