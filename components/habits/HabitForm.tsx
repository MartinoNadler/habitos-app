'use client'

import { useState, useTransition } from 'react'
import { createHabitAction, updateHabitAction } from '@/app/actions/habits'
import type { Habit } from '@/lib/types'

const CATEGORIAS  = ['salud', 'estudio', 'sueño', 'otro'] as const
const ESFUERZOS   = ['facil', 'moderado', 'dificil'] as const
const CAMPOS_EXTRA = ['ninguno', 'minutos', 'horas', 'vasos', 'paginas', 'nota'] as const

// Dom=0, Lun=1 ... Sáb=6  |  mostrar Lun→Dom (1..6,0)
const DIAS_NOMBRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const DIAS_ORDER   = [1, 2, 3, 4, 5, 6, 0] // L M M J V S D

interface HabitFormProps {
  habit?: Habit
  onClose: () => void
  onSuccess: () => void
}

function RadioGroup<T extends string>({
  name, options, defaultValue, cols,
}: { name: string; options: readonly T[]; defaultValue: T; cols: number }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(o => (
        <label key={o} className="cursor-pointer">
          <input type="radio" name={name} value={o} defaultChecked={o === defaultValue} className="sr-only peer" />
          <span className="block text-center py-2 rounded-xl text-xs font-medium border peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent transition-colors capitalize"
            style={{ color: 'rgba(255,255,255,.4)', borderColor: 'rgba(255,255,255,.1)' }}>
            {o}
          </span>
        </label>
      ))}
    </div>
  )
}

export default function HabitForm({ habit, onClose, onSuccess }: HabitFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initTipo = (): 'diario' | 'veces_semana' | 'dias_semana' => {
    if (habit?.frecuencia === 'veces_semana') return 'veces_semana'
    if (habit?.frecuencia === 'dias_semana')  return 'dias_semana'
    return 'diario'
  }

  const [frecTipo,  setFrecTipo]  = useState<'diario' | 'veces_semana' | 'dias_semana'>(initTipo)
  const [frecVeces, setFrecVeces] = useState(habit?.meta_semanal ?? 3)
  const [frecDias,  setFrecDias]  = useState<number[]>(habit?.dias_semana ?? [])

  function toggleDia(d: number) {
    setFrecDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (frecTipo === 'dias_semana' && frecDias.length === 0) {
      setError('Seleccioná al menos un día')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('frecuencia', frecTipo)
    if (frecTipo === 'veces_semana') {
      formData.set('meta_semanal', String(frecVeces))
    }
    if (frecTipo === 'dias_semana') {
      formData.set('dias_semana', JSON.stringify(frecDias))
    }

    startTransition(async () => {
      const action = habit ? updateHabitAction : createHabitAction
      if (habit) formData.set('id', habit.id)
      const result = await action(formData)
      if (result?.error) setError(result.error)
      else onSuccess()
    })
  }

  const pill = (active: boolean) => ({
    background: active ? 'rgba(124,111,255,.15)' : 'transparent',
    border: `1px solid ${active ? 'rgba(124,111,255,.5)' : 'rgba(255,255,255,.1)'}`,
    color: active ? '#8B7CFF' : 'rgba(255,255,255,.4)',
  } as React.CSSProperties)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 animate-sheet-up max-h-[90dvh] overflow-y-auto"
        style={{ background: '#0F1120' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,.15)' }} />

        <h2 className="text-lg font-bold text-white mb-6">
          {habit ? 'Editar hábito' : 'Nuevo hábito'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Emoji + Nombre */}
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,.45)' }}>Emoji</label>
              <input
                name="emoji"
                defaultValue={habit?.emoji ?? '⭐'}
                maxLength={8}
                required
                className="w-full rounded-xl px-3 py-3 text-white text-center text-xl focus:outline-none focus:ring-1 focus:ring-accent"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,.45)' }}>Nombre</label>
              <input
                name="nombre"
                defaultValue={habit?.nombre}
                maxLength={50}
                required
                placeholder="Mi hábito"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-accent"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,.45)' }}>Categoría</label>
            <RadioGroup name="categoria" options={CATEGORIAS} defaultValue={habit?.categoria ?? 'salud'} cols={4} />
          </div>

          {/* Esfuerzo */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,.45)' }}>Esfuerzo</label>
            <RadioGroup name="esfuerzo" options={ESFUERZOS} defaultValue={habit?.esfuerzo ?? 'moderado'} cols={3} />
          </div>

          {/* ── Frecuencia ── */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'rgba(255,255,255,.45)' }}>Frecuencia</label>

            {/* Tipo: 3 botones */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { v: 'diario',       l: 'Diario'      },
                { v: 'veces_semana', l: 'Por semana'  },
                { v: 'dias_semana',  l: 'Días fijos'  },
              ] as const).map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFrecTipo(v)}
                  className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={pill(frecTipo === v)}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Por semana: stepper */}
            {frecTipo === 'veces_semana' && (
              <div
                className="flex items-center justify-between px-5 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}
              >
                <button
                  type="button"
                  onClick={() => setFrecVeces(v => Math.max(2, v - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)' }}
                >−</button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-white">{frecVeces}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>veces por semana</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFrecVeces(v => Math.min(6, v + 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)' }}
                >+</button>
              </div>
            )}

            {/* Días fijos: day picker */}
            {frecTipo === 'dias_semana' && (
              <div className="flex justify-between gap-1.5">
                {DIAS_ORDER.map(d => {
                  const sel = frecDias.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDia(d)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={pill(sel)}
                    >
                      {DIAS_NOMBRES[d]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Campo extra */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,.45)' }}>Campo extra</label>
            <RadioGroup name="campo_extra" options={CAMPOS_EXTRA} defaultValue={habit?.campo_extra ?? 'ninguno'} cols={3} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-semibold py-3.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 font-semibold py-3.5 rounded-xl disabled:opacity-50 transition-all"
              style={{ background: '#7c6fff', color: '#fff' }}
            >
              {isPending ? 'Guardando…' : habit ? 'Guardar' : 'Crear'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
