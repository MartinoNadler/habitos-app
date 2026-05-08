'use client'

import { useState, useTransition } from 'react'
import { createRewardAction, updateRewardAction } from '@/app/actions/rewards'
import type { Reward } from '@/lib/types'

interface RewardFormProps {
  reward?: Reward
  onClose: () => void
  onSuccess: () => void
}

export default function RewardForm({ reward, onClose, onSuccess }: RewardFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    if (reward) formData.set('id', reward.id)

    startTransition(async () => {
      const action = reward ? updateRewardAction : createRewardAction
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
        className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-6" />

        <h2 className="text-lg font-bold text-white mb-6">
          {reward ? 'Editar recompensa' : 'Nueva recompensa'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-xs text-text-dim mb-1.5">Emoji</label>
              <input
                name="emoji"
                defaultValue={reward?.emoji ?? '🎁'}
                maxLength={8}
                required
                className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-3 py-3 text-white text-center text-xl focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-dim mb-1.5">Nombre</label>
              <input
                name="nombre"
                defaultValue={reward?.nombre}
                maxLength={50}
                required
                placeholder="Mi recompensa"
                className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Costo (pts)</label>
            <input
              name="costo"
              type="number"
              inputMode="numeric"
              defaultValue={reward?.costo ?? 10}
              min={1}
              max={10000}
              required
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-dim mb-1.5">Descripción (opcional)</label>
            <input
              name="descripcion"
              defaultValue={reward?.descripcion ?? ''}
              maxLength={200}
              placeholder="Descripción opcional"
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-red-soft text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-surface-2 text-text-dim font-semibold py-3.5 rounded-xl2">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl2 transition-colors">
              {isPending ? 'Guardando...' : reward ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
