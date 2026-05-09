'use client'

import { useEffect, useState, useTransition } from 'react'
import { redeemRewardAction } from '@/app/actions/rewards'
import type { Reward, Redemption } from '@/lib/types'

// Paleta por índice — cada recompensa tiene identidad propia
const REWARD_PALETTE = [
  { glow: '#9B5DFF', bg: 'rgba(155,93,255,0.12)',  border: 'rgba(155,93,255,0.35)'  },
  { glow: '#FF7A3D', bg: 'rgba(255,122,61,0.12)',  border: 'rgba(255,122,61,0.35)'  },
  { glow: '#FF6B9D', bg: 'rgba(255,107,157,0.12)', border: 'rgba(255,107,157,0.35)' },
  { glow: '#4D8DFF', bg: 'rgba(77,141,255,0.12)',  border: 'rgba(77,141,255,0.35)'  },
  { glow: '#5CFF7B', bg: 'rgba(92,255,123,0.12)',  border: 'rgba(92,255,123,0.35)'  },
  { glow: '#59E1FF', bg: 'rgba(89,225,255,0.12)',  border: 'rgba(89,225,255,0.35)'  },
  { glow: '#FFC857', bg: 'rgba(255,200,87,0.12)',  border: 'rgba(255,200,87,0.35)'  },
  { glow: '#00E5CC', bg: 'rgba(0,229,204,0.12)',   border: 'rgba(0,229,204,0.35)'   },
]

function getLimiteMensual(costo: number): number {
  if (costo >= 201) return 1
  if (costo >= 51)  return 1
  if (costo >= 21)  return 2
  return 4
}

function getMotivacion(puntos: number, rewards: Reward[]): { texto: string; proxima: Reward | null; pct: number } {
  const asequibles = rewards.filter(r => r.costo <= puntos)
  const noAsequibles = rewards.filter(r => r.costo > puntos).sort((a, b) => a.costo - b.costo)
  const proxima = noAsequibles[0] ?? null

  if (asequibles.length > 0 && proxima) {
    return { texto: `Podés canjear ${asequibles.length} recompensa${asequibles.length > 1 ? 's' : ''}`, proxima, pct: Math.round((puntos / proxima.costo) * 100) }
  }
  if (proxima) {
    const faltan = proxima.costo - puntos
    return { texto: `Faltan ${faltan} pts para tu próxima recompensa`, proxima, pct: Math.round((puntos / proxima.costo) * 100) }
  }
  return { texto: '¡Desbloqueaste todo! Agregá más recompensas', proxima: null, pct: 100 }
}

// Icono candado SVG
function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

// Icono rayo SVG
function ZapIcon({ size = 20, color = '#FFC857' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

interface LogrosContentProps {
  puntos: number
  rewards: Reward[]
  canjesPorReward: Record<string, number>
  historial: Redemption[]
}

function RewardCard({
  reward,
  index,
  puntos,
  canjesMes,
  visible,
}: {
  reward: Reward
  index: number
  puntos: number
  canjesMes: number
  visible: boolean
}) {
  const palette = REWARD_PALETTE[index % REWARD_PALETTE.length]
  const limite = getLimiteMensual(reward.costo)
  const disponible = puntos >= reward.costo && canjesMes < limite
  const limiteAlcanzado = canjesMes >= limite
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [puntosLocales, setPuntosLocales] = useState(puntos)
  const [hovered, setHovered] = useState(false)

  useEffect(() => { setPuntosLocales(puntos) }, [puntos])

  const puedeAhoraLocal = puntosLocales >= reward.costo && canjesMes < limite

  function handleRedeem() {
    if (!puedeAhoraLocal || isPending) return
    setError(null)
    const fd = new FormData()
    fd.set('reward_id', reward.id)
    startTransition(async () => {
      const result = await redeemRewardAction(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setPuntosLocales(p => p - reward.costo)
        setTimeout(() => setSuccess(false), 2500)
      }
    })
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disponible
          ? `linear-gradient(145deg, ${palette.bg}, rgba(14,14,26,1))`
          : 'rgba(16,16,28,0.95)',
        borderColor: disponible
          ? palette.border
          : limiteAlcanzado
          ? 'rgba(255,255,255,.08)'
          : 'rgba(255,255,255,.06)',
        boxShadow: disponible
          ? hovered
            ? `0 8px 32px rgba(0,0,0,.5), inset 3px 0 0 ${palette.glow}`
            : `0 2px 12px rgba(0,0,0,.3), inset 3px 0 0 ${palette.glow}`
          : `0 2px 8px rgba(0,0,0,.2), inset 3px 0 0 rgba(255,255,255,.06)`,
        opacity: limiteAlcanzado ? 0.45 : disponible ? 1 : 0.6,
        transform: visible
          ? hovered && disponible ? 'translateY(-2px)' : 'translateY(0)'
          : 'translateY(16px)',
        transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 55}ms`,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 16,
        padding: '14px 14px 14px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center gap-3 relative">
        {/* Icono */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative"
          style={{
            background: disponible ? `${palette.glow}20` : 'rgba(255,255,255,.05)',
          }}
        >
          {!disponible && !limiteAlcanzado && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(20,20,35,1)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.35)' }}
            >
              <LockIcon />
            </div>
          )}
          {reward.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-sm leading-tight">{reward.nombre}</p>
            {disponible && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tracking-wide"
                style={{ background: `${palette.glow}22`, color: palette.glow, border: `1px solid ${palette.glow}40` }}
              >
                DISPONIBLE
              </span>
            )}
            {limiteAlcanzado && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tracking-wide"
                style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.3)', border: '1px solid rgba(255,255,255,.08)' }}>
                LÍMITE MES
              </span>
            )}
          </div>
          {reward.descripcion && (
            <p className="text-xs mt-0.5 leading-snug line-clamp-1" style={{ color: 'rgba(255,255,255,.4)' }}>{reward.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <ZapIcon size={13} color={disponible ? palette.glow : 'rgba(255,255,255,0.25)'} />
            <span
              className="font-mono font-bold text-base leading-none"
              style={{ color: disponible ? palette.glow : 'rgba(255,255,255,0.3)' }}
            >
              {reward.costo} pts
            </span>
            {canjesMes > 0 && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,.3)' }}>{canjesMes}/{limite} canjes</span>
            )}
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={handleRedeem}
          disabled={!puedeAhoraLocal || isPending}
          className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-w-[72px] text-center"
          style={{
            background: success
              ? `${palette.glow}25`
              : puedeAhoraLocal
              ? `${palette.glow}18`
              : 'rgba(255,255,255,.04)',
            border: `1px solid ${puedeAhoraLocal ? palette.border : 'rgba(255,255,255,.07)'}`,
            color: puedeAhoraLocal ? palette.glow : 'rgba(255,255,255,.25)',
            cursor: puedeAhoraLocal ? 'pointer' : 'not-allowed',
          }}
        >
          {isPending ? '...' : success ? '✓ Listo' : 'Canjear'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2 pl-15">{error}</p>}
    </div>
  )
}

export default function LogrosContent({ puntos, rewards, canjesPorReward, historial }: LogrosContentProps) {
  const [visible, setVisible] = useState(false)
  const { texto, proxima, pct } = getMotivacion(puntos, rewards)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const hayDisponibles = rewards.some(r => puntos >= r.costo && (canjesPorReward[r.id] ?? 0) < getLimiteMensual(r.costo))

  return (
    <div className="min-h-screen pb-24" style={{ background: 'radial-gradient(circle at top left, #161A35, #090B14)' }}>
      <div className="px-4 py-6 space-y-5 max-w-2xl mx-auto">

        {/* Hero puntos */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(30,24,10,1), rgba(20,16,6,1))',
            border: hayDisponibles ? '1px solid rgba(255,184,79,.5)' : '1px solid rgba(255,184,79,.2)',
            borderRadius: 20,
            padding: '20px',
            boxShadow: hayDisponibles
              ? '0 0 0 1px rgba(255,184,79,.08), 0 8px 32px rgba(255,160,40,.15)'
              : '0 4px 20px rgba(0,0,0,.4)',
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Icono rayo */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255,184,79,.15)',
                border: '1px solid rgba(255,184,79,.25)',
              }}
            >
              <ZapIcon size={28} color="#FFC857" />
            </div>

            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(255,200,87,.6)' }}>
                Puntos disponibles
              </p>
              <p
                className="font-mono font-black leading-none"
                style={{ fontSize: 46, color: '#FFC857', letterSpacing: '-1px' }}
              >
                {puntos}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,.45)' }}>{texto}</p>
            </div>
          </div>

          {/* Barra progreso */}
          {proxima && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,184,79,.12)' }}>
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: 'rgba(255,255,255,.5)' }}>
                  Próxima: <span className="text-white font-medium">{proxima.emoji} {proxima.nombre}</span>
                </span>
                <span className="font-mono font-bold" style={{ color: '#FFC857' }}>
                  {puntos} / {proxima.costo}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.07)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: 'linear-gradient(90deg, #FFC857, #FF9A00)',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1) 300ms',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recompensas */}
        <section>
          <h2
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Recompensas
          </h2>
          {rewards.length === 0 ? (
            <div className="text-center py-14" style={{ color: 'rgba(255,255,255,.3)' }}>
              <p className="text-4xl mb-3">🎁</p>
              <p className="font-medium">No tenés recompensas</p>
              <p className="text-sm mt-1 opacity-70">Agregá una desde Configuración</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rewards.map((r, i) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  index={i}
                  puntos={puntos}
                  canjesMes={canjesPorReward[r.id] ?? 0}
                  visible={visible}
                />
              ))}
            </div>
          )}
        </section>

        {/* Historial */}
        {historial.length > 0 && (
          <section
            style={{
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              opacity: visible ? 1 : 0,
              transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1) 350ms',
            }}
          >
            <h2
              className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Historial
            </h2>
            <div className="space-y-2">
              {historial.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(255,255,255,.06)',
                  }}
                >
                  <span className="text-xl w-8 text-center flex-shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>{r.fecha}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ZapIcon size={12} color="#FF6B6B" />
                    <span className="font-mono text-sm font-bold" style={{ color: '#FF6B6B' }}>
                      -{r.pts}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
