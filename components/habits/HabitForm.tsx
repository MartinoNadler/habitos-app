'use client'

import { useState, useTransition } from 'react'
import { createHabitAction, updateHabitAction } from '@/app/actions/habits'
import type { Habit } from '@/lib/types'

const CATEGORIAS = ['salud', 'estudio', 'sueño', 'otro'] as const
const ESFUERZOS = ['facil', 'moderado', 'dificil'] as const
const FRECUENCIAS = ['diario', 'semanal'] as const
const CAMPOS_EXTRA = ['ninguno', 'minutos', 'horas', 'vasos', 'paginas', 'nota'] as const

interface HabitFormProps {
  habit?: Habit
  onClose: () => void
  onSuccess: () => void
}

export default function HabitForm({ habit, onClose, onSuccess }: HabitFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const action = habit ? updateHabitAction : createHabitAction
      if (habit) formData.set('id', habit.id)
      const result = await action(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 animate-sheet-up max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-6" />

        <h2 className="text-lg font-bold text-white mb-6">
          {habit ? 'Editar hábito' : 'Nuevo hábito'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-xs text-text-dim mb-1.5">Emoji</label>
              <input
                name="emoji"
                defaultValue={habit?.emoji ?? '⭐'}
                maxLength={8}
                required
                className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-3 py-3 text-white text-center text-xl focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-dim mb-1.5">Nombre</label>
              <input
                name="nombre"
                defaultValue={habit?.nombre}
                maxLength={50}
                required
                placeholder="Mi hábito"
                className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIAS.map(c => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="categoria" value={c} defaultChecked={habit ? habit.categoria === c : c === 'salud'} className="sr-only peer" />
                  <span className="block text-center py-2 rounded-xl text-xs font-medium border border-surface-3 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent text-text-dim transition-colors capitalize">
                    {c}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Esfuerzo</label>
            <div className="grid grid-cols-3 gap-2">
              {ESFUERZOS.map(e => (
                <label key={e} className="cursor-pointer">
                  <input type="radio" name="esfuerzo" value={e} defaultChecked={habit ? habit.esfuerzo === e : e === 'moderado'} className="sr-only peer" />
                  <span className="block text-center py-2 rounded-xl text-xs font-medium border border-surface-3 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent text-text-dim transition-colors capitalize">
                    {e}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Frecuencia</label>
            <div className="grid grid-cols-2 gap-2">
              {FRECUENCIAS.map(f => (
                <label key={f} className="cursor-pointer">
                  <input type="radio" name="frecuencia" value={f} defaultChecked={habit ? habit.frecuencia === f : f === 'diario'} className="sr-only peer" />
                  <span className="block text-center py-2 rounded-xl text-xs font-medium border border-surface-3 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent text-text-dim transition-colors capitalize">
                    {f}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Campo extra</label>
            <div className="grid grid-cols-3 gap-2">
              {CAMPOS_EXTRA.map(c => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="campo_extra" value={c} defaultChecked={habit ? habit.campo_extra === c : c === 'ninguno'} className="sr-only peer" />
                  <span className="block text-center py-2 rounded-xl text-xs font-medium border border-surface-3 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent text-text-dim transition-colors capitalize">
                    {c}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-soft text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-surface-2 text-text-dim font-semibold py-3.5 rounded-xl2">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl2 transition-colors">
              {isPending ? 'Guardando...' : habit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
