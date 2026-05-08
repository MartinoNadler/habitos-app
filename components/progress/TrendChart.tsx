'use client'

// Gráfico de líneas SVG puro

interface TrendChartProps {
  data: { label: string; value: number }[]
  color?: string
}

const HEIGHT = 120
const PAD_X = 30
const PAD_Y = 16

export default function TrendChart({ data, color = '#7c6fff' }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-text-muted text-sm">
        No hay suficientes datos
      </div>
    )
  }

  const width = Math.max(data.length * 40, 300)
  const max = Math.max(...data.map(d => d.value), 1)

  const points = data.map((d, i) => ({
    x: PAD_X + (i / (data.length - 1)) * (width - PAD_X * 2),
    y: PAD_Y + (1 - d.value / max) * (HEIGHT - PAD_Y * 2),
    label: d.label,
    value: d.value,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Área bajo la curva
  const areaD = `${pathD} L ${points[points.length - 1].x} ${HEIGHT - PAD_Y} L ${points[0].x} ${HEIGHT - PAD_Y} Z`

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={width} height={HEIGHT + 20} className="block">
        {/* Área */}
        <path d={areaD} fill={color} opacity={0.1} />

        {/* Línea */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Puntos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <text
              x={p.x}
              y={HEIGHT + 14}
              fontSize={9}
              fill="#6b6b8a"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
