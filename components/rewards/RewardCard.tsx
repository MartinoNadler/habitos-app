'use client'

import { useState, useTransition } from 'react'
import { redeemRewardAction } from '@/app/actions/rewards'
import type { Reward } from '@/lib/types'

interface RewardCardProps {
  reward: Reward
  puntosDisponibles: number
  canjesMes: number
  limiteMes: number
}

export default function RewardCard({ reward, puntosDisponibles, canjesMes, limiteMes }: RewardCardProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const sinPuntos = puntosDisponibles < reward.costo
  const limiteAlcanzado = canjesMes >= limiteMes
  const deshabilitado = sinPuntos || limiteAlcanzado || isPending

  async function handleRedeem() {
    setError(null)
    const formData = new FormData()
    formData.set('reward_id', reward.id)
    startTransition(async () => {
      const result = await redeemRewardAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      }
    })
  }

  return (
    <div className={`bg-surface border rounded-xl3 p-4 transition-all ${success ? 'border-green/40 bg-green/5' : 'border-surface-3'}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">{reward.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">{reward.nombre}</h3>
          {reward.descripcion && (
            <p className="text-text-dim text-sm mt-0.5">{reward.descripcion}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono font-bold text-amber">{reward.costo} pts</span>
            {limiteAlcanzado && (
              <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                Límite alcanzado
              </span>
            )}
            {canjesMes > 0 && !limiteAlcanzado && (
              <span className="text-xs text-text-muted">
                {canjesMes}/{limiteMes} canjes
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleRedeem}
          disabled={deshabilitado}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
            deshabilitado
              ? 'bg-surface-2 text-text-muted cursor-not-allowed'
              : 'bg-accent hover:bg-accent-dim text-white'
          }`}
        >
          {isPending ? '...' : success ? '✓' : 'Canjear'}
        </button>
      </div>

      {error && <p className="text-red-soft text-sm mt-2">{error}</p>}
    </div>
  )
}
