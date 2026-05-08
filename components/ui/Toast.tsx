'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-green/10 border-green/30 text-green',
    error:   'bg-red-soft/10 border-red-soft/30 text-red-soft',
    info:    'bg-accent/10 border-accent/30 text-accent',
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 border rounded-xl2 px-4 py-3 text-sm font-medium shadow-xl max-w-xs w-[90vw] text-center ${colors[type]}`}>
      {message}
    </div>
  )
}

export function PtsFloat({ pts, onDone }: { pts: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <span className="animate-pts-float text-amber font-mono font-bold text-2xl drop-shadow-lg">
        +{pts} pts
      </span>
    </div>
  )
}
