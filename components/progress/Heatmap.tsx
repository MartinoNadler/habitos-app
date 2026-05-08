'use client'

// SVG puro — sin librerías de charts

interface HeatmapProps {
  data: Record<string, number>  // fecha YYYY-MM-DD → cantidad de hábitos completados
  dias?: number
}

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const CELL = 14
const GAP = 3
const LEFT_LABEL = 16

function getColor(value: number, max: number): string {
  if (value === 0) return '#1c1c26'
  const intensity = Math.min(value / Math.max(max, 1), 1)
  if (intensity < 0.25) return '#3d2f8f'
  if (intensity < 0.5)  return '#5443c4'
  if (intensity < 0.75) return '#6c58f0'
  return '#7c6fff'
}

export default function Heatmap({ data, dias = 90 }: HeatmapProps) {
  // Construir array de los últimos N días
  const today = new Date()
  const cells: { date: string; value: number; dow: number }[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = d.toISOString().split('T')[0]
    cells.push({ date, value: data[date] ?? 0, dow: d.getDay() })
  }

  const maxValue = Math.max(...cells.map(c => c.value), 1)

  // Calcular posición: agrupar por semanas (columnas)
  const firstDow = cells[0].dow
  const paddedCells = [...Array(firstDow).fill(null), ...cells]
  const weeks = Math.ceil(paddedCells.length / 7)

  const svgWidth  = LEFT_LABEL + weeks * (CELL + GAP)
  const svgHeight = 7 * (CELL + GAP) + 20  // +20 para labels arriba

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Labels días semana */}
        {DIAS_SEMANA.map((d, i) => (
          <text
            key={i}
            x={0}
            y={20 + i * (CELL + GAP) + CELL / 2 + 4}
            fontSize={10}
            fill="#6b6b8a"
            textAnchor="middle"
          >
            {d}
          </text>
        ))}

        {/* Celdas */}
        {paddedCells.map((cell, idx) => {
          const col = Math.floor(idx / 7)
          const row = idx % 7
          const x = LEFT_LABEL + col * (CELL + GAP)
          const y = 20 + row * (CELL + GAP)

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
              opacity={0.9}
            >
              <title>{cell.date}: {cell.value} hábitos</title>
            </rect>
          )
        })}
      </svg>
    </div>
  )
}
