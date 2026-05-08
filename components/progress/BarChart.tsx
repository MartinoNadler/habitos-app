'use client'

// SVG puro — sin librerías

interface BarChartProps {
  data: { label: string; value: number; emoji?: string }[]
  maxValue?: number
  color?: string
}

const BAR_HEIGHT = 28
const BAR_GAP = 10
const LABEL_WIDTH = 110
const RIGHT_PADDING = 40

export default function BarChart({ data, maxValue, color = '#7c6fff' }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1)
  const svgHeight = data.length * (BAR_HEIGHT + BAR_GAP)
  const svgWidth = 320
  const barMaxWidth = svgWidth - LABEL_WIDTH - RIGHT_PADDING

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={svgWidth} height={svgHeight} className="block w-full">
        {data.map((item, i) => {
          const y = i * (BAR_HEIGHT + BAR_GAP)
          const barWidth = Math.max((item.value / max) * barMaxWidth, item.value > 0 ? 4 : 0)

          return (
            <g key={i}>
              {/* Fondo */}
              <rect
                x={LABEL_WIDTH}
                y={y + 4}
                width={barMaxWidth}
                height={BAR_HEIGHT - 8}
                rx={6}
                fill="#1c1c26"
              />
              {/* Barra */}
              {barWidth > 0 && (
                <rect
                  x={LABEL_WIDTH}
                  y={y + 4}
                  width={barWidth}
                  height={BAR_HEIGHT - 8}
                  rx={6}
                  fill={color}
                  opacity={0.85}
                />
              )}
              {/* Label */}
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 4}
                fontSize={12}
                fill="#9494b0"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {item.emoji ? `${item.emoji} ` : ''}{item.label.length > 10 ? item.label.slice(0, 10) + '…' : item.label}
              </text>
              {/* Valor */}
              <text
                x={LABEL_WIDTH + barMaxWidth + 6}
                y={y + BAR_HEIGHT / 2 + 4}
                fontSize={11}
                fill="#6b6b8a"
                dominantBaseline="middle"
              >
                {typeof item.value === 'number' && item.value % 1 !== 0
                  ? item.value.toFixed(0)
                  : item.value}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
