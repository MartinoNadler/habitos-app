'use client'

import { useState, useRef, useEffect } from 'react'
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
  onSuccess: (pts: number) => void
}

export default function CheckModal({ habit, onClose, onSuccess }: CheckModalProps) {
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set('habit_id', habit.id)
    if (habit.campo_extra !== 'nota') {
      formData.set('valor', valor)
    } else {
      formData.set('nota', valor)
    }

    const result = await checkHabitAction(formData)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    onSuccess(result.pts ?? 0)
    onClose()
  }

  const esNota = habit.campo_extra === 'nota'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-6" />

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{habit.emoji}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{habit.nombre}</h2>
            <p className="text-text-dim text-sm">{CAMPO_LABEL[habit.campo_extra]}</p>
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
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent resize-none transition-colors"
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
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-5 text-white text-4xl font-mono text-center placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          )}

          {error && (
            <p className="text-red-soft text-sm mt-2">{error}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-2 text-text-dim font-semibold py-3.5 rounded-xl2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl2 transition-colors"
            >
              {loading ? 'Guardando...' : 'Completar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
