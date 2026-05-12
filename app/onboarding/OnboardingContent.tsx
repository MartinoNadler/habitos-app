'use client'

import { useState, useTransition } from 'react'
import { completeOnboardingAction } from '@/app/actions/onboarding'
import type { HabitoDisponible } from '@/lib/onboarding'

type Habito = HabitoDisponible

const PALETTE = ['#FF7A3D','#4D8DFF','#B26BFF','#59E1FF','#5CFF7B','#FFC857','#FF6B9D','#00E5CC','#FF7A3D','#4D8DFF','#B26BFF','#59E1FF']

const CAT_LABEL: Record<string, string> = {
  salud: 'Salud', estudio: 'Estudio', sueño: 'Sueño', otro: 'Personal',
}

interface Props {
  habitos: Habito[]
  nombre?: string
}

export default function OnboardingContent({ habitos, nombre }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleEmpezar() {
    startTransition(async () => {
      await completeOnboardingAction([...selected])
    })
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}
    >
      {/* Header */}
      <div className="px-5 pt-14 pb-6 text-center">
        <p className="text-4xl mb-4">✨</p>
        <h1 className="font-black text-white text-2xl mb-2" style={{ letterSpacing: '-0.5px' }}>
          {nombre ? `¡Hola, ${nombre}!` : '¡Bienvenido!'}
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,.4)' }}>
          Elegí los hábitos con los que querés empezar.
          <br />Podés cambiarlos cuando quieras.
        </p>
      </div>

      {/* Grid de hábitos */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {habitos.map((h, i) => {
            const color     = PALETTE[i % PALETTE.length]
            const isSelected = selected.has(h.id)
            return (
              <button
                key={h.id}
                onClick={() => toggle(h.id)}
                className="relative text-left rounded-2xl p-4 transition-all active:scale-95"
                style={{
                  background: isSelected
                    ? `linear-gradient(145deg, ${color}18, rgba(12,13,24,1))`
                    : 'rgba(16,18,32,.95)',
                  border: `1.5px solid ${isSelected ? `${color}50` : 'rgba(255,255,255,.07)'}`,
                  boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
                }}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: color }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* Emoji */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: `${color}15` }}
                >
                  {h.emoji}
                </div>

                {/* Info */}
                <p className="font-bold text-white text-sm leading-tight mb-1">{h.nombre}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', lineHeight: 1.3 }}>{h.desc}</p>

                {/* Category badge */}
                <div className="mt-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${color}12`, color: `${color}bb` }}
                  >
                    {CAT_LABEL[h.categoria]}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer sticky */}
      <div
        className="sticky bottom-0 px-4 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, #090B14 60%, transparent)' }}
      >
        <div className="max-w-lg mx-auto space-y-3">
          <button
            onClick={handleEmpezar}
            disabled={pending}
            className="w-full font-bold py-4 rounded-2xl transition-all active:scale-[.98]"
            style={{
              background: selected.size > 0
                ? 'linear-gradient(135deg, #7c6fff, #4D8DFF)'
                : 'rgba(255,255,255,.06)',
              color:      selected.size > 0 ? '#fff' : 'rgba(255,255,255,.25)',
              boxShadow:  selected.size > 0 ? '0 4px 24px rgba(124,111,255,.4)' : 'none',
              fontSize: 15,
            }}
          >
            {pending
              ? 'Creando tus hábitos…'
              : selected.size > 0
              ? `Empezar con ${selected.size} hábito${selected.size > 1 ? 's' : ''} →`
              : 'Seleccioná al menos uno'}
          </button>

          <button
            onClick={handleEmpezar}
            disabled={pending}
            className="w-full text-sm py-2"
            style={{ color: 'rgba(255,255,255,.25)' }}
          >
            Configurar después
          </button>
        </div>
      </div>
    </div>
  )
}
