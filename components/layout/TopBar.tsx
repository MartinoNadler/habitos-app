import { getNivel } from '@/lib/types'

interface TopBarProps {
  titulo: string
  fecha?: string
  puntos?: number
}

export default function TopBar({ titulo, fecha, puntos }: TopBarProps) {
  const nivel = puntos !== undefined ? getNivel(puntos) : null

  return (
    <header className="sticky top-0 z-30 bg-app-bg/90 backdrop-blur-md border-b border-surface-3/50">
      <div className="flex items-center justify-between px-4 h-14">
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">{titulo}</h1>
          {fecha && <p className="text-xs text-text-dim leading-none mt-0.5">{fecha}</p>}
        </div>

        {nivel && (
          <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-1.5">
            <span className="text-xs text-text-dim">{nivel.nombre}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFC857" stroke="none">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span className="font-mono text-amber font-bold text-sm">
              {puntos}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
