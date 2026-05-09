'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import HabitForm from '@/components/habits/HabitForm'
import RewardForm from './RewardForm'
import { logoutAction } from '@/app/actions/auth'
import { deleteHabitAction } from '@/app/actions/habits'
import { deleteRewardAction } from '@/app/actions/rewards'
import { exportDataAction, deleteAccountAction } from '@/app/actions/account'
import { Toast } from '@/components/ui/Toast'
import { getNivel } from '@/lib/types'
import type { Habit, Reward } from '@/lib/types'

const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
function frecuenciaLabel(h: Habit): string {
  if (h.frecuencia === 'veces_semana') return `${h.meta_semanal ?? '?'}×/sem`
  if (h.frecuencia === 'dias_semana') {
    return (h.dias_semana ?? []).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DIAS_CORTOS[d]).join(' ')
  }
  return 'diario'
}

// ── SVG Icons inline ────────────────────────────────────────────────────────
function IconPencil() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function IconLogOut() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconZap({ size = 12, color = '#FFC857' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.22)' }}>
        {label}
      </span>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
        style={{
          background: 'rgba(124,111,255,.1)',
          color: '#8B7CFF',
          border: '1px solid rgba(124,111,255,.18)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,111,255,.18)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,111,255,.1)')}
      >
        <IconPlus /> Agregar
      </button>
    </div>
  )
}

export default function ConfigPage() {
  const [habits,  setHabits]  = useState<Habit[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [showHabitForm,  setShowHabitForm]  = useState(false)
  const [editHabit,      setEditHabit]      = useState<Habit | null>(null)
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [editReward,     setEditReward]     = useState<Reward | null>(null)
  const [toast,          setToast]          = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Perfil
  const [userEmail,     setUserEmail]     = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')
  const [userPuntos,    setUserPuntos]    = useState(0)
  const [userStreak,    setUserStreak]    = useState(0)
  const [badgeCount,    setBadgeCount]    = useState(0)
  const [displayName,   setDisplayName]   = useState('')
  const [editingName,   setEditingName]   = useState(false)
  const [nameInput,     setNameInput]     = useState('')
  const [savingName,    setSavingName]    = useState(false)

  const supabase = createClient()

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email ?? '')
    setUserCreatedAt(user.created_at ?? '')
    const nombre = user.user_metadata?.display_name ?? ''
    setDisplayName(nombre)
    setNameInput(nombre)

    const [h, r, state, badges] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('creado_en'),
      supabase.from('rewards').select('*').eq('user_id', user.id).order('costo'),
      supabase.from('user_state').select('puntos, streak').eq('user_id', user.id).single(),
      supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    setHabits((h.data ?? []) as Habit[])
    setRewards((r.data ?? []) as Reward[])
    if (state.data) { setUserPuntos(state.data.puntos); setUserStreak(state.data.streak) }
    setBadgeCount(badges.count ?? 0)
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (trimmed === displayName) { setEditingName(false); return }
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } })
    setSavingName(false)
    if (error) {
      setToast({ message: 'No se pudo guardar el nombre', type: 'error' })
    } else {
      setDisplayName(trimmed)
      setEditingName(false)
      setToast({ message: 'Nombre actualizado', type: 'success' })
    }
  }

  async function handleDeleteHabit(id: string) {
    if (!confirm('¿Eliminar este hábito? Se borrarán todos sus registros.')) return
    const fd = new FormData(); fd.set('id', id)
    const result = await deleteHabitAction(fd)
    if (result?.error) setToast({ message: result.error, type: 'error' })
    else { setToast({ message: 'Hábito eliminado', type: 'success' }); cargarDatos() }
  }

  async function handleDeleteReward(id: string) {
    if (!confirm('¿Eliminar esta recompensa?')) return
    const fd = new FormData(); fd.set('id', id)
    const result = await deleteRewardAction(fd)
    if (result?.error) setToast({ message: result.error, type: 'error' })
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

  // Datos de perfil derivados
  const nivel = getNivel(userPuntos)
  const nameBase = displayName || userEmail.split('@')[0]
  const initials = nameBase.slice(0, 2).toUpperCase() || '??'
  const memberSince = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : ''
  const habitosActivos = habits.filter(h => h.activo).length

  return (
    <div
      className="min-h-dvh pb-24"
      style={{ background: 'radial-gradient(ellipse at top, #0f1020, #090B14)' }}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5">
        <h1 className="font-bold text-white" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.38)' }}>
          Personalizá tu experiencia
        </p>
      </div>

      <main className="px-4 space-y-5 max-w-lg mx-auto">

        {/* ── Profile card ── */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'linear-gradient(160deg, rgba(18,20,38,1), rgba(11,12,22,1))',
            border: '1px solid rgba(255,255,255,.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c6fff, #4D8DFF)',
                color: '#fff',
                letterSpacing: '-0.5px',
              }}
            >
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Nombre editable */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') { setEditingName(false); setNameInput(displayName) }
                    }}
                    placeholder="Tu nombre"
                    maxLength={30}
                    className="flex-1 min-w-0 text-sm font-semibold text-white bg-transparent focus:outline-none rounded-lg px-2 py-0.5"
                    style={{ border: '1px solid rgba(124,111,255,.4)', background: 'rgba(124,111,255,.08)' }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(124,111,255,.2)', color: '#8B7CFF' }}
                  >
                    {savingName ? '…' : 'OK'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 group text-left"
                >
                  <span className="font-semibold text-white text-sm truncate">
                    {displayName || userEmail.split('@')[0]}
                  </span>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: 'rgba(124,111,255,.7)' }}
                  >
                    <IconPencil />
                  </span>
                </button>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>
                {userEmail}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.25)' }}>
                {nivel.nombre}{memberSince ? ` · Desde ${memberSince}` : ''}
              </p>
            </div>
          </div>

          {/* Mini métricas */}
          <div
            className="grid grid-cols-4 gap-2 mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}
          >
            {[
              { icon: <IconZap size={11} color="#FFC857" />, value: userPuntos, label: 'pts' },
              { icon: <span style={{ fontSize: 11 }}>🔥</span>, value: userStreak, label: 'días' },
              { icon: <span style={{ fontSize: 11 }}>📋</span>, value: habitosActivos, label: 'hábitos' },
              { icon: <span style={{ fontSize: 11 }}>🏆</span>, value: badgeCount, label: 'logros' },
            ].map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  {m.icon}
                  <span className="font-mono font-bold text-white text-sm">{m.value}</span>
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hábitos ── */}
        <section>
          <SectionHeader label="Hábitos" onAdd={() => { setEditHabit(null); setShowHabitForm(true) }} />
          {habits.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center"
              style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.25)' }}>No hay hábitos todavía</p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(16,18,32,.95)', border: '1px solid rgba(255,255,255,.06)' }}
            >
              {habits.map((h, i) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-4 transition-all"
                  style={{
                    paddingTop: 14,
                    paddingBottom: 14,
                    borderBottom: i < habits.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                    opacity: h.activo ? 1 : 0.4,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="text-xl flex-shrink-0">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{h.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>
                      {h.categoria} · {h.esfuerzo} · {frecuenciaLabel(h)}
                      {!h.activo && ' · inactivo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => { setEditHabit(h); setShowHabitForm(true) }}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'rgba(255,255,255,.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#8B7CFF'; e.currentTarget.style.background = 'rgba(124,111,255,.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <IconPencil />
                    </button>
                    <button
                      onClick={() => handleDeleteHabit(h.id)}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'rgba(255,255,255,.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.background = 'rgba(255,107,107,.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recompensas ── */}
        <section>
          <SectionHeader label="Recompensas" onAdd={() => { setEditReward(null); setShowRewardForm(true) }} />
          {rewards.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center"
              style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,.25)' }}>No hay recompensas todavía</p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(16,18,32,.95)', border: '1px solid rgba(255,255,255,.06)' }}
            >
              {rewards.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 transition-all"
                  style={{
                    paddingTop: 14,
                    paddingBottom: 14,
                    borderBottom: i < rewards.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="text-xl flex-shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.nombre}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <IconZap size={10} color="#FFC857" />
                      <span className="font-mono text-xs font-semibold" style={{ color: '#FFC857' }}>{r.costo} pts</span>
                      {r.descripcion && (
                        <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,.25)' }}>· {r.descripcion}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => { setEditReward(r); setShowRewardForm(true) }}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'rgba(255,255,255,.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#8B7CFF'; e.currentTarget.style.background = 'rgba(124,111,255,.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <IconPencil />
                    </button>
                    <button
                      onClick={() => handleDeleteReward(r.id)}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'rgba(255,255,255,.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.background = 'rgba(255,107,107,.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Acciones ── */}
        <section className="space-y-2.5">
          {/* Exportar */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 transition-all text-left"
            style={{
              background: 'rgba(16,18,32,.95)',
              border: '1px solid rgba(255,255,255,.06)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,18,32,.95)')}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(77,141,255,.12)', color: '#4D8DFF' }}
            >
              <IconDownload />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {exporting ? 'Exportando…' : 'Exportar datos'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>
                Descargá tu historial en JSON
              </p>
            </div>
          </button>

          {/* Cerrar sesión */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 transition-all text-left"
              style={{
                background: 'rgba(16,18,32,.95)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,18,32,.95)')}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.5)' }}
              >
                <IconLogOut />
              </div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.7)' }}>
                Cerrar sesión
              </p>
            </button>
          </form>
        </section>

        {/* ── Zona peligrosa ── */}
        <section className="pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,80,80,.4)' }}>
            Zona peligrosa
          </p>
          {!showDeleteAccount ? (
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full rounded-2xl px-5 py-4 text-left transition-all"
              style={{
                background: 'rgba(120,20,30,.1)',
                border: '1px solid rgba(255,80,80,.15)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,20,30,.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(120,20,30,.1)')}
            >
              <p className="text-sm font-medium" style={{ color: 'rgba(255,100,100,.85)' }}>Borrar cuenta</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,100,100,.4)' }}>
                Esta acción es permanente y no se puede deshacer
              </p>
            </button>
          ) : (
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'rgba(120,20,30,.12)',
                border: '1px solid rgba(255,80,80,.18)',
              }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,120,120,.9)' }}>
                  ¿Estás seguro?
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,100,100,.5)' }}>
                  Escribí <span className="font-mono font-bold">CONFIRMAR</span> para proceder. Esta acción borra todo permanentemente.
                </p>
              </div>
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <input
                  name="confirmacion"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono focus:outline-none"
                  style={{
                    background: 'rgba(0,0,0,.3)',
                    border: '1px solid rgba(255,80,80,.25)',
                    color: '#fff',
                  }}
                />
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteAccount(false); setDeleteConfirm('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={deleteConfirm !== 'CONFIRMAR'}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: deleteConfirm === 'CONFIRMAR' ? 'rgba(220,50,50,.3)' : 'rgba(255,255,255,.04)',
                      color: deleteConfirm === 'CONFIRMAR' ? '#FF6B6B' : 'rgba(255,255,255,.2)',
                      border: `1px solid ${deleteConfirm === 'CONFIRMAR' ? 'rgba(220,50,50,.4)' : 'rgba(255,255,255,.06)'}`,
                    }}
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

      {showHabitForm && (
        <HabitForm
          habit={editHabit ?? undefined}
          onClose={() => { setShowHabitForm(false); setEditHabit(null) }}
          onSuccess={() => {
            setShowHabitForm(false); setEditHabit(null)
            cargarDatos()
            setToast({ message: 'Hábito guardado', type: 'success' })
          }}
        />
      )}

      {showRewardForm && (
        <RewardForm
          reward={editReward ?? undefined}
          onClose={() => { setShowRewardForm(false); setEditReward(null) }}
          onSuccess={() => {
            setShowRewardForm(false); setEditReward(null)
            cargarDatos()
            setToast({ message: 'Recompensa guardada', type: 'success' })
          }}
        />
      )}
    </div>
  )
}
