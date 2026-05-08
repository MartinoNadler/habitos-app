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
            <span className="font-mono text-amber font-bold text-sm">
              {puntos} pts
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
