'use client'

import { useState, useRef } from 'react'
import { checkHabitAction, undoCheckAction } from '@/app/actions/habits'
import CheckModal from './CheckModal'
import { PtsFloat } from '@/components/ui/Toast'
import type { HabitWithRecord } from '@/lib/types'

const ESFUERZO_COLOR = {
  facil:    'text-green',
  moderado: 'text-amber',
  dificil:  'text-red-soft',
}

interface HabitCardProps {
  habit: HabitWithRecord
  streakPorHabito?: number
}

export default function HabitCard({ habit, streakPorHabito = 0 }: HabitCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [ptsAnim, setPtsAnim] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  // Estado local optimista: se marca completado inmediatamente al primer tap
  const [localCompletado, setLocalCompletado] = useState(!!habit.record)
  // Ref para bloqueo instantáneo — evita que múltiples taps rápidos pasen el guard
  const procesando = useRef(false)

  const completado = localCompletado || !!habit.record

  async function handleTap() {
    // Bloqueo inmediato con ref — sincrónico, no espera re-render
    if (completado || procesando.current) return
    procesando.current = true

    if (habit.campo_extra !== 'ninguno') {
      setShowModal(true)
      procesando.current = false
      return
    }

    // Marcar como completado localmente de inmediato (UI optimista)
    setLocalCompletado(true)
    setLoading(true)

    const formData = new FormData()
    formData.set('habit_id', habit.id)
    const result = await checkHabitAction(formData)

    setLoading(false)
    procesando.current = false

    if (result?.error) {
      // Si falló, revertir el estado optimista
      setLocalCompletado(false)
    } else if (result?.pts) {
      setPtsAnim(result.pts)
    }
  }

  async function handleUndo() {
    if (!completado || procesando.current) return
    procesando.current = true
    setLoading(true)
    setLocalCompletado(false)

    const formData = new FormData()
    formData.set('habit_id', habit.id)
    formData.set('fecha', new Date().toISOString().split('T')[0])
    const result = await undoCheckAction(formData)

    setLoading(false)
    procesando.current = false

    if (result?.error) {
      // Si falló, revertir
      setLocalCompletado(true)
    }
  }

  return (
    <>
      {ptsAnim !== null && (
        <PtsFloat pts={ptsAnim} onDone={() => setPtsAnim(null)} />
      )}

      <div
        className={`relative flex items-center gap-4 bg-surface rounded-xl3 px-4 py-4 border transition-all ${
          completado
            ? 'border-green/30 bg-green/5'
            : 'border-surface-3 active:scale-[0.98]'
        } ${loading ? 'opacity-60' : ''}`}
      >
        <button
          onClick={handleTap}
          disabled={completado || loading}
          className="flex items-center gap-4 flex-1 text-left"
          aria-label={`Completar ${habit.nombre}`}
        >
          {/* Check circle */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
            completado ? 'bg-green border-green' : 'border-surface-3 bg-surface-2'
          }`}>
            {completado ? (
              <svg className="w-5 h-5 text-app-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="text-xl">{habit.emoji}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-base ${completado ? 'text-text-dim line-through' : 'text-white'}`}>
                {habit.nombre}
              </span>
              {streakPorHabito >= 3 && (
                <span className="text-xs bg-amber/10 text-amber px-1.5 py-0.5 rounded-full font-medium">
                  🔥 {streakPorHabito}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs ${ESFUERZO_COLOR[habit.esfuerzo]}`}>
                {habit.esfuerzo}
              </span>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-text-muted text-xs">{habit.categoria}</span>
              {completado && habit.record?.valor != null && (
                <>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-text-dim text-xs font-mono">
                    {habit.record.valor} {habit.campo_extra}
                  </span>
                </>
              )}
            </div>
          </div>

          {completado && habit.record && (
            <span className="text-amber text-sm font-mono font-bold flex-shrink-0">
              +{habit.record.pts}
            </span>
          )}
        </button>

        {/* Botón deshacer */}
        {completado && (
          <button
            onClick={handleUndo}
            disabled={loading}
            className="p-2 text-text-muted hover:text-red-soft transition-colors"
            aria-label="Deshacer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        )}
      </div>

      {showModal && (
        <CheckModal
          habit={habit}
          onClose={() => { setShowModal(false); procesando.current = false }}
          onSuccess={(pts) => {
            setShowModal(false)
            setLocalCompletado(true)
            setPtsAnim(pts)
            procesando.current = false
          }}
        />
      )}
    </>
  )
}
