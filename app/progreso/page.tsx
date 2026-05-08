'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import Heatmap from '@/components/progress/Heatmap'
import BarChart from '@/components/progress/BarChart'
import TrendChart from '@/components/progress/TrendChart'
import type { Habit, Record as HabitRecord } from '@/lib/types'

type Periodo = '7' | '30' | '90' | '365'

const PERIODOS: { label: string; value: Periodo }[] = [
  { label: 'Semana', value: '7' },
  { label: 'Mes', value: '30' },
  { label: '3 Meses', value: '90' },
  { label: 'Año', value: '365' },
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function ProgresoPage() {
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<HabitRecord[]>([])
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const desde = new Date()
    desde.setDate(desde.getDate() - parseInt(periodo))
    const desdeStr = desde.toISOString().split('T')[0]

    const [habitsRes, recordsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true),
      supabase.from('records').select('*').eq('user_id', user.id).gte('fecha', desdeStr),
    ])

    const habitsData = (habitsRes.data ?? []) as Habit[]
    setHabits(habitsData)
    setRecords((recordsRes.data ?? []) as HabitRecord[])
    setSelectedHabits(new Set(habitsData.map(h => h.id)))
    setLoading(false)
  }, [periodo])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Heatmap: fecha → cantidad de hábitos completados
  const heatmapData: Record<string, number> = {}
  records.forEach(r => {
    if (selectedHabits.has(r.habit_id)) {
      heatmapData[r.fecha] = (heatmapData[r.fecha] ?? 0) + 1
    }
  })

  // % cumplimiento por hábito
  const diasPeriodo = parseInt(periodo)
  const cumplimientoData = habits
    .filter(h => selectedHabits.has(h.id))
    .map(h => {
      const completados = records.filter(r => r.habit_id === h.id).length
      const pct = Math.round((completados / diasPeriodo) * 100)
      return { label: h.nombre, value: Math.min(pct, 100), emoji: h.emoji }
    })

  // Tendencia de puntos por semana
  const semanasData: { label: string; value: number }[] = []
  const ahora = new Date()
  const semanas = Math.ceil(diasPeriodo / 7)
  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = new Date(ahora)
    inicio.setDate(ahora.getDate() - (i + 1) * 7)
    const fin = new Date(ahora)
    fin.setDate(ahora.getDate() - i * 7)

    const inicioStr = inicio.toISOString().split('T')[0]
    const finStr = fin.toISOString().split('T')[0]

    const ptsTotal = records
      .filter(r => r.fecha >= inicioStr && r.fecha <= finStr && selectedHabits.has(r.habit_id))
      .reduce((acc, r) => acc + r.pts, 0)

    semanasData.push({ label: `S${semanas - i}`, value: ptsTotal })
  }

  // Días de semana más activos
  const diaActividad = new Array(7).fill(0)
  records.forEach(r => {
    if (selectedHabits.has(r.habit_id)) {
      const dow = new Date(r.fecha + 'T00:00:00').getDay()
      diaActividad[dow]++
    }
  })
  const maxDia = Math.max(...diaActividad, 1)
  const diasData = DIAS_SEMANA.map((label, i) => ({
    label,
    value: Math.round((diaActividad[i] / maxDia) * 100),
  }))

  return (
    <div className="min-h-dvh bg-app-bg pb-20">
      <TopBar titulo="Progreso" />

      <main className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Selector período */}
        <div className="flex gap-2 bg-surface rounded-xl2 p-1">
          {PERIODOS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
                periodo === p.value
                  ? 'bg-accent text-white'
                  : 'text-text-dim hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chips hábitos */}
        <div className="flex flex-wrap gap-2">
          {habits.map(h => (
            <button
              key={h.id}
              onClick={() => {
                const next = new Set(selectedHabits)
                if (next.has(h.id)) { next.delete(h.id) } else { next.add(h.id) }
                setSelectedHabits(next)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedHabits.has(h.id)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface-3 text-text-muted'
              }`}
            >
              <span>{h.emoji}</span>
              <span>{h.nombre}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-muted">Cargando...</div>
        ) : (
          <>
            {/* Heatmap */}
            <section>
              <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
                Actividad — últimos {periodo} días
              </h2>
              <div className="bg-surface border border-surface-3 rounded-xl3 p-4">
                <Heatmap data={heatmapData} dias={parseInt(periodo)} />
              </div>
            </section>

            {/* % cumplimiento */}
            <section>
              <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
                % Cumplimiento por hábito
              </h2>
              <div className="bg-surface border border-surface-3 rounded-xl3 p-4">
                {cumplimientoData.length > 0
                  ? <BarChart data={cumplimientoData} maxValue={100} />
                  : <p className="text-text-muted text-sm text-center py-4">Sin datos</p>
                }
              </div>
            </section>

            {/* Tendencia puntos */}
            <section>
              <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
                Puntos por semana
              </h2>
              <div className="bg-surface border border-surface-3 rounded-xl3 p-4">
                <TrendChart data={semanasData} />
              </div>
            </section>

            {/* Días más activos */}
            <section>
              <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">
                Días más activos
              </h2>
              <div className="bg-surface border border-surface-3 rounded-xl3 p-4">
                <BarChart data={diasData} maxValue={100} color="#ffb84f" />
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
