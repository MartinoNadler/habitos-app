'use client'

// Gráfico de línea SVG con curva bezier suave
interface TrendChartProps {
  data: { label: string; value: number }[]
  color?: string
  height?: number
}

const PAD_X = 8
const PAD_Y = 16

export default function TrendChart({ data, color = '#7c6fff', height = 110 }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm"
        style={{ height, color: 'rgba(255,255,255,.2)' }}
      >
        Pocos datos por ahora
      </div>
    )
  }

  const width = Math.max(data.length * 44, 280)
  const max = Math.max(...data.map(d => d.value), 1)
  const chartH = height - 24 // reservar espacio para labels

  const pts = data.map((d, i) => ({
    x: PAD_X + (i / (data.length - 1)) * (width - PAD_X * 2),
    y: PAD_Y + (1 - d.value / max) * (chartH - PAD_Y * 2),
    label: d.label,
    value: d.value,
  }))

  // Bezier suave: CP horizontal en el punto medio entre dos puntos
  const linePath = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      const prev = pts[i - 1]
      const cpX = ((prev.x + p.x) / 2).toFixed(1)
      return `C ${cpX} ${prev.y.toFixed(1)} ${cpX} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    })
    .join(' ')

  const last = pts[pts.length - 1]
  const first = pts[0]
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${chartH} L ${first.x.toFixed(1)} ${chartH} Z`

  const gradId = `trendGrad_${color.replace('#', '')}`

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={width} height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Líneas guía horizontales */}
        {[0.25, 0.5, 0.75, 1].map(t => {
          const y = PAD_Y + (1 - t) * (chartH - PAD_Y * 2)
          return (
            <line
              key={t}
              x1={PAD_X} y1={y} x2={width - PAD_X} y2={y}
              stroke="rgba(255,255,255,.04)"
              strokeWidth={1}
            />
          )
        })}

        {/* Área rellena */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Línea principal con glow */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
          filter="url(#glow)"
        />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos y labels */}
        {pts.map((p, i) => (
          <g key={i}>
            {/* Solo mostrar label si es el primero, último, o hay pocos puntos */}
            {(i === 0 || i === pts.length - 1 || data.length <= 6) && (
              <text
                x={p.x}
                y={height - 4}
                fontSize={9}
                fill="rgba(255,255,255,.3)"
                textAnchor="middle"
              >
                {p.label}
              </text>
            )}
            <circle cx={p.x} cy={p.y} r={3} fill={color} opacity={0.7} />
            {/* Punto destacado en el último */}
            {i === pts.length - 1 && (
              <>
                <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
                <circle cx={p.x} cy={p.y} r={3} fill={color} />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
