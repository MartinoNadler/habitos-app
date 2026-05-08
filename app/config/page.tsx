'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import HabitForm from '@/components/habits/HabitForm'
import RewardForm from './RewardForm'
import { logoutAction } from '@/app/actions/auth'
import { deleteHabitAction } from '@/app/actions/habits'
import { deleteRewardAction } from '@/app/actions/rewards'
import { exportDataAction, deleteAccountAction } from '@/app/actions/account'
import { Toast } from '@/components/ui/Toast'
import type { Habit, Reward } from '@/lib/types'

export default function ConfigPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [showHabitForm, setShowHabitForm] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [editReward, setEditReward] = useState<Reward | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [exporting, setExporting] = useState(false)

  const supabase = createClient()

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [h, r] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('creado_en'),
      supabase.from('rewards').select('*').eq('user_id', user.id).order('costo'),
    ])
    setHabits((h.data ?? []) as Habit[])
    setRewards((r.data ?? []) as Reward[])
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  async function handleDeleteHabit(id: string) {
    if (!confirm('¿Eliminar este hábito? Se borrarán todos sus registros.')) return
    const fd = new FormData(); fd.set('id', id)
    const result = await deleteHabitAction(fd)
    if (result?.error) { setToast({ message: result.error, type: 'error' }) }
    else { setToast({ message: 'Hábito eliminado', type: 'success' }); cargarDatos() }
  }

  async function handleDeleteReward(id: string) {
    if (!confirm('¿Eliminar esta recompensa?')) return
    const fd = new FormData(); fd.set('id', id)
    const result = await deleteRewardAction(fd)
    if (result?.error) { setToast({ message: result.error, type: 'error' }) }
    else { setToast({ message: 'Recompensa eliminada', type: 'success' }); cargarDatos() }
  }

  async function handleExport() {
    setExporting(true)
    const result = await exportDataAction()
    setExporting(false)
    if (result?.error) { setToast({ message: result.error, type: 'error' }); return }

    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitos-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast({ message: 'Datos exportados', type: 'success' })
  }

  async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const result = await deleteAccountAction(fd)
    if (result?.error) setToast({ message: result.error, type: 'error' })
  }

  return (
    <div className="min-h-dvh bg-app-bg pb-20">
      <TopBar titulo="Configuración" />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Hábitos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide">Hábitos</h2>
            <button
              onClick={() => { setEditHabit(null); setShowHabitForm(true) }}
              className="flex items-center gap-1 text-accent text-sm font-medium"
            >
              <span className="text-lg">+</span> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {habits.map(h => (
              <div key={h.id} className={`flex items-center gap-3 bg-surface border border-surface-3 rounded-xl2 px-4 py-3 ${!h.activo ? 'opacity-50' : ''}`}>
                <span className="text-xl">{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{h.nombre}</p>
                  <p className="text-text-muted text-xs">{h.categoria} · {h.esfuerzo}</p>
                </div>
                <button onClick={() => { setEditHabit(h); setShowHabitForm(true) }} className="p-2 text-text-muted hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => handleDeleteHabit(h.id)} className="p-2 text-text-muted hover:text-red-soft">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Recompensas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide">Recompensas</h2>
            <button
              onClick={() => { setEditReward(null); setShowRewardForm(true) }}
              className="flex items-center gap-1 text-accent text-sm font-medium"
            >
              <span className="text-lg">+</span> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.id} className="flex items-center gap-3 bg-surface border border-surface-3 rounded-xl2 px-4 py-3">
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.nombre}</p>
                  <p className="text-amber font-mono text-xs">{r.costo} pts</p>
                </div>
                <button onClick={() => { setEditReward(r); setShowRewardForm(true) }} className="p-2 text-text-muted hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => handleDeleteReward(r.id)} className="p-2 text-text-muted hover:text-red-soft">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Acciones */}
        <section className="space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-surface border border-surface-3 rounded-xl2 py-3.5 text-white font-medium text-sm hover:bg-surface-2 transition-colors"
          >
            {exporting ? 'Exportando...' : '📥 Exportar datos (JSON)'}
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full bg-surface border border-surface-3 rounded-xl2 py-3.5 text-red-soft font-medium text-sm hover:bg-red-soft/5 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </section>

        {/* Zona peligrosa */}
        <section>
          <h2 className="text-sm font-semibold text-red-soft/70 uppercase tracking-wide mb-3">
            Zona peligrosa
          </h2>
          {!showDeleteAccount ? (
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full bg-red-soft/5 border border-red-soft/20 rounded-xl2 py-3.5 text-red-soft font-medium text-sm"
            >
              Borrar cuenta
            </button>
          ) : (
            <div className="bg-red-soft/5 border border-red-soft/20 rounded-xl3 p-4 space-y-3">
              <p className="text-red-soft text-sm font-medium">
                Esta acción es irreversible. Escribí CONFIRMAR para proceder.
              </p>
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <input
                  name="confirmacion"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="w-full bg-surface-2 border border-red-soft/30 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-red-soft"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteAccount(false); setDeleteConfirm('') }}
                    className="flex-1 bg-surface-2 text-text-dim py-3 rounded-xl2 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={deleteConfirm !== 'CONFIRMAR'}
                    className="flex-1 bg-red-soft/20 text-red-soft py-3 rounded-xl2 text-sm font-medium disabled:opacity-40"
                  >
                    Eliminar todo
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </main>

      <BottomNav />

      {(showHabitForm) && (
        <HabitForm
          habit={editHabit ?? undefined}
          onClose={() => { setShowHabitForm(false); setEditHabit(null) }}
          onSuccess={() => { setShowHabitForm(false); setEditHabit(null); cargarDatos(); setToast({ message: 'Hábito guardado', type: 'success' }) }}
        />
      )}

      {(showRewardForm) && (
        <RewardForm
          reward={editReward ?? undefined}
          onClose={() => { setShowRewardForm(false); setEditReward(null) }}
          onSuccess={() => { setShowRewardForm(false); setEditReward(null); cargarDatos(); setToast({ message: 'Recompensa guardada', type: 'success' }) }}
        />
      )}
    </div>
  )
}
