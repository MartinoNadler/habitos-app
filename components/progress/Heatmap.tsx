'use client'

// SVG puro — sin librerías de charts

interface HeatmapProps {
  data: Record<string, number>  // fecha YYYY-MM-DD → cantidad de hábitos completados
  dias?: number
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const CELL = 13
const GAP = 3
const LEFT_LABEL = 22  // espacio suficiente para la letra + padding
const TOP_LABEL = 16

function getColor(value: number, max: number): string {
  if (value === 0) return '#1c1c26'
  const intensity = Math.min(value / Math.max(max, 1), 1)
  if (intensity < 0.25) return '#3d2f8f'
  if (intensity < 0.5)  return '#5443c4'
  if (intensity < 0.75) return '#6c58f0'
  return '#7c6fff'
}

export default function Heatmap({ data, dias = 90 }: HeatmapProps) {
  const today = new Date()
  const cells: { date: string; value: number; dow: number }[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = d.toISOString().split('T')[0]
    // Convertir domingo (0) a 6, lunes (1) a 0, etc.
    const dow = (d.getDay() + 6) % 7
    cells.push({ date, value: data[date] ?? 0, dow })
  }

  const maxValue = Math.max(...cells.map(c => c.value), 1)

  const firstDow = cells[0].dow
  const paddedCells = [...Array(firstDow).fill(null), ...cells]
  const weeks = Math.ceil(paddedCells.length / 7)

  const svgWidth  = LEFT_LABEL + weeks * (CELL + GAP) + 4
  const svgHeight = TOP_LABEL + 7 * (CELL + GAP)

  return (
    <div className="overflow-x-auto no-scrollbar w-full">
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Labels días semana — alineados al centro de cada celda */}
        {DIAS_SEMANA.map((d, i) => (
          <text
            key={i}
            x={LEFT_LABEL - 6}           // pegado al borde derecho del label area
            y={TOP_LABEL + i * (CELL + GAP) + CELL / 2 + 1}
            fontSize={9}
            fill="#6b6b8a"
            textAnchor="end"             // alineado a la derecha para no cortarse
            dominantBaseline="middle"
          >
            {d}
          </text>
        ))}

        {/* Celdas */}
        {paddedCells.map((cell, idx) => {
          const col = Math.floor(idx / 7)
          const row = idx % 7
          const x = LEFT_LABEL + col * (CELL + GAP)
          const y = TOP_LABEL + row * (CELL + GAP)

          if (!cell) return null

          return (
            <rect
              key={cell.date}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={3}
              fill={getColor(cell.value, maxValue)}
            >
              <title>{cell.date}: {cell.value} hábitos</title>
            </rect>
          )
        })}
      </svg>

      {/* Leyenda */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-text-muted">Menos</span>
        {['#1c1c26', '#3d2f8f', '#5443c4', '#6c58f0', '#7c6fff'].map(color => (
          <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span className="text-[10px] text-text-muted">Más</span>
      </div>
    </div>
  )
}
