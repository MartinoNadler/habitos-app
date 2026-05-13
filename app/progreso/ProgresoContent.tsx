'use client'

import { useMemo } from 'react'
import type { Habit, UserState } from '@/lib/types'

interface RecordItem {
  habit_id: string
  fecha: string
  pts: number
  valor: number | null
}

interface Props {
  state: UserState
  habits: Habit[]
  records: RecordItem[]
  today: string
}

type CountMap = { [date: string]: number }

function buildHeatmap(records: RecordItem[], today: string) {
  const countByDate: CountMap = {}
  for (const r of records) {
    countByDate[r.fecha] = (countByDate[r.fecha] ?? 0) + 1
  }

  // Start from 364 days ago, aligned to Monday
  const todayDate = new Date(today + 'T00:00:00')
  const start = new Date(todayDate)
  start.setDate(start.getDate() - 364)
  const dow = (start.getDay() + 6) % 7  // 0=Mon
  start.setDate(start.getDate() - dow)

  const weeks: { date: string; count: number; isFuture: boolean }[][] = []
  const d = new Date(start)

  while (d <= new Date(todayDate.getTime() + 7 * 86400000)) {
    const week: { date: string; count: number; isFuture: boolean }[] = []
    for (let day = 0; day < 7; day++) {
      const dateStr = d.toISOString().split('T')[0]
      const isFuture = dateStr > today
      week.push({ date: dateStr, count: isFuture ? 0 : (countByDate[dateStr] ?? 0), isFuture })
      d.setDate(d.getDate() + 1)
    }
    weeks.push(week)
    if (week[6].date >= today) break
  }

  const startStr = start.toISOString().split('T')[0]
  const activeDays = Object.keys(countByDate).filter(dt => dt >= startStr && dt <= today).length

  return { weeks, countByDate, activeDays }
}

function cellColor(count: number, isFuture: boolean): string {
  if (isFuture) return 'rgba(255,255,255,.03)'
  if (count === 0) return 'rgba(255,255,255,.05)'
  if (count === 1) return 'rgba(124,111,255,.22)'
  if (count === 2) return 'rgba(124,111,255,.44)'
  if (count === 3) return 'rgba(124,111,255,.66)'
  return '#7c6fff'
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const DIAS  = ['L','M','M','J','V','S','D']

export default function ProgresoContent({ state, habits, records, today }: Props) {
  const { weeks, countByDate, activeDays } = useMemo(
    () => buildHeatmap(records, today),
    [records, today]
  )

  // Per-habit counts (all-time)
  const habitCounts: { [id: string]: number } = {}
  for (const r of records) {
    habitCounts[r.habit_id] = (habitCounts[r.habit_id] ?? 0) + 1
  }
  const maxHabitCount = Math.max(...Object.values(habitCounts), 1)

  // Month labels over the heatmap
  const monthLabels: { label: string; colIdx: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    const month = new Date(week[0].date + 'T00:00:00').getMonth()
    if (month !== lastMonth) {
      lastMonth = month
      monthLabels.push({ label: MESES[month], colIdx: i })
    }
  })

  const CELL = 11   // px per cell
  const GAP  = 2    // px gap

  return (
    <div className="px-4 pt-4 pb-28 max-w-lg mx-auto space-y-4">

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: records.length, label: 'cumplidos', emoji: '✅' },
          { value: activeDays,     label: 'días activos', emoji: '📅' },
          { value: state.streak,   label: 'racha actual', emoji: '🔥' },
          { value: state.best_streak, label: 'mejor racha', emoji: '🏆' },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(16,18,32,.95)',
              border: '1px solid rgba(255,255,255,.06)',
            }}
          >
            <div className="flex items-end gap-2 mb-1 leading-none">
              <span
                className="font-black text-white"
                style={{ fontSize: 30, letterSpacing: '-1.5px', lineHeight: 1 }}
              >
                {s.value}
              </span>
              <span style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>{s.emoji}</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Heatmap ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(16,18,32,.95)', border: '1px solid rgba(255,255,255,.06)' }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(255,255,255,.22)' }}
        >
          Actividad — último año
        </p>

        <div className="overflow-x-auto">
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: GAP }}>

            {/* Month row */}
            <div style={{ display: 'flex', paddingLeft: 18, gap: 0, marginBottom: 2 }}>
              {weeks.map((week, wi) => {
                const ml = monthLabels.find(m => m.colIdx === wi)
                return (
                  <div key={wi} style={{ width: CELL + GAP, flexShrink: 0 }}>
                    {ml && (
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>
                        {ml.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Day labels + grid */}
            <div style={{ display: 'flex', gap: GAP }}>
              {/* Day labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: 14 }}>
                {DIAS.map((d, i) => (
                  <div key={i} style={{ height: CELL, display: 'flex', alignItems: 'center' }}>
                    {i % 2 === 0 && (
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,.25)' }}>{d}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={`${day.date}: ${day.count}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        background: cellColor(day.count, day.isFuture),
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.25)' }}>Menos</span>
          {[0, 1, 2, 3, 4].map(c => (
            <div
              key={c}
              style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(c, false) }}
            />
          ))}
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.25)' }}>Más</span>
        </div>
      </div>

      {/* ── Por hábito ── */}
      {habits.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(16,18,32,.95)', border: '1px solid rgba(255,255,255,.06)' }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,.22)' }}
          >
            Por hábito
          </p>
          {habits
            .map(h => ({ habit: h, count: habitCounts[h.id] ?? 0 }))
            .sort((a, b) => b.count - a.count)
            .map(({ habit, count }) => (
              <div key={habit.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontSize: 15 }}>{habit.emoji}</span>
                  <span className="text-white text-xs font-medium flex-1 truncate">{habit.nombre}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: 'rgba(255,255,255,.45)' }}>
                    {count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${count > 0 ? Math.max(Math.round((count / maxHabitCount) * 100), 4) : 0}%`,
                      borderRadius: 'inherit',
                      background: 'linear-gradient(90deg, #7c6fff, #4D8DFF)',
                      transition: 'width 1s cubic-bezier(0.4,0,0.2,1) 200ms',
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
