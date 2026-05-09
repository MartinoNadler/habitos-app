'use client'

import { useEffect, useState } from 'react'

interface ProgressRingProps {
  value: number      // 0–100
  size?: number      // px
  stroke?: number    // px
  color?: string
  label?: string
}

export default function ProgressRing({
  value,
  size = 72,
  stroke = 6,
  color = '#7c6fff',
  label,
}: ProgressRingProps) {
  const [animated, setAnimated] = useState(0)

  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  // Animar al montar
  useEffect(() => {
    const t = setTimeout(() => setAnimated(Math.min(value, 100)), 100)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      {/* Número centrado */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-white leading-none" style={{ fontSize: size * 0.22 }}>
          {Math.round(value)}%
        </span>
        {label && (
          <span className="text-text-muted leading-none mt-0.5" style={{ fontSize: size * 0.12 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
