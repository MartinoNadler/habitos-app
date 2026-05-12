'use client'

import { useEffect, useState } from 'react'
import { getNivel, NIVELES } from '@/lib/types'

interface TopBarProps {
  titulo: string
  fecha?: string
  puntos?: number
}

export default function TopBar({ titulo, fecha, puntos: puntosIniciales }: TopBarProps) {
  const [puntos, setPuntos] = useState(puntosIniciales ?? 0)

  useEffect(() => {
    function onCheck(e: Event) {
      const pts = (e as CustomEvent<number>).detail
      setPuntos(p => Math.max(0, p + pts))
    }
    window.addEventListener('habit-pts', onCheck)
    return () => window.removeEventListener('habit-pts', onCheck)
  }, [])

  useEffect(() => {
    if (puntosIniciales !== undefined) setPuntos(puntosIniciales)
  }, [puntosIniciales])

  const nivel    = getNivel(puntos)
  const nivelNum = NIVELES.findIndex(n => puntos >= n.min && puntos < n.max) + 1 || NIVELES.length

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md border-b border-surface-3/50 relative overflow-hidden"
      style={{ background: 'rgba(9,11,20,.92)' }}>

      <div className="flex items-center justify-between px-4 h-14">
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">{titulo}</h1>
          {fecha && <p className="text-xs text-text-dim leading-none mt-0.5">{fecha}</p>}
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.07)' }}>
          {/* Nivel */}
          <span className="font-black text-xs" style={{ color: '#7c6fff' }}>Nv.{nivelNum}</span>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,.1)' }} />
          {/* Puntos */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFC857" stroke="none">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span className="font-mono font-bold text-sm" style={{ color: '#FFC857' }}>{puntos}</span>
        </div>
      </div>

      {/* Barra de progreso XP — al fondo del header */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: 'rgba(255,255,255,.04)' }}>
        <div style={{
          height: '100%',
          width: `${nivel.progreso}%`,
          background: 'linear-gradient(90deg, #7c6fff, #4D8DFF)',
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 6px rgba(124,111,255,.6)',
        }} />
      </div>
    </header>
  )
}
