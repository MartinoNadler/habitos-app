'use client'

import { useRef, useEffect, useState } from 'react'
import { checkHabitAction } from '@/app/actions/habits'
import type { Habit } from '@/lib/types'

const CAMPO_LABEL: Record<string, string> = {
  minutos: 'Minutos',
  horas:   'Horas',
  vasos:   'Vasos',
  paginas: 'Páginas',
  nota:    'Nota',
}

const CAMPO_PLACEHOLDER: Record<string, string> = {
  minutos: '0',
  horas:   '0',
  vasos:   '0',
  paginas: '0',
  nota:    'Escribí una nota...',
}

interface CheckModalProps {
  habit: Habit
  onClose: () => void
  onSuccess: () => void           // cierre inmediato, sin pts
  onError:   () => void           // revertir si el servidor falla
  onPts:     (pts: number) => void // animación de pts cuando llega la confirmación
}

export default function CheckModal({ habit, onClose, onSuccess, onError, onPts }: CheckModalProps) {
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('habit_id', habit.id)
    if (habit.campo_extra !== 'nota') {
      formData.set('valor', valor)
    } else {
      formData.set('nota', valor)
    }

    // ── Cierre instantáneo ────────────────────────────────
    onSuccess()

    // ── Servidor en background ────────────────────────────
    const result = await checkHabitAction(formData)

    if (result?.error) {
      onError()          // revertir
    } else if (result?.pts) {
      onPts(result.pts)  // mostrar float y sumar al topbar
      window.dispatchEvent(new CustomEvent('habit-pts', { detail: result.pts }))
    }
  }

  const esNota = habit.campo_extra === 'nota'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 animate-sheet-up"
        style={{ background: '#0F1120' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,.15)' }} />

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{habit.emoji}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{habit.nombre}</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,.4)' }}>
              {CAMPO_LABEL[habit.campo_extra]}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {esNota ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={valor}
              onChange={e => setValor(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={CAMPO_PLACEHOLDER[habit.campo_extra]}
              className="w-full rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none resize-none"
              style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              inputMode="numeric"
              value={valor}
              onChange={e => setValor(e.target.value)}
              min="0"
              max="9999"
              placeholder={CAMPO_PLACEHOLDER[habit.campo_extra]}
              className="w-full rounded-xl px-4 py-5 text-white text-4xl font-mono text-center placeholder-white/20 focus:outline-none"
              style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
            />
          )}

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-semibold py-3.5 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 font-semibold py-3.5 rounded-xl transition-colors"
              style={{ background: '#7c6fff', color: '#fff' }}
            >
              Completar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
