import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getNivel } from '@/lib/types'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import HabitCard from '@/components/habits/HabitCard'
import { evaluarRacha } from '@/lib/logic/streak'
import { evaluarInsignias } from '@/lib/logic/badges'
import type { Habit, Record as HabitRecord, HabitWithRecord, UserState } from '@/lib/types'

function fechaHoy(): string {
  return new Date().toISOString().split('T')[0]
}

function formatearFecha(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

async function actualizarEstadoDiario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  state: UserState
) {
  const hoy = fechaHoy()
  if (state.last_active_date === hoy) return state

  // Verificar si hubo algún registro ayer para mantener la racha
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const ayerStr = ayer.toISOString().split('T')[0]

  const { count } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('fecha', ayerStr)

  const { nuevaRacha, rota } = evaluarRacha(state.last_active_date, hoy, state.streak)
  // Si no hubo actividad ayer y la racha no se rota por fecha, de todas formas la consideramos rota
  const rachaFinal = (count === 0 && !rota && state.last_active_date !== ayerStr) ? 0 : (rota ? 0 : nuevaRacha)

  const nuevoState = {
    ...state,
    streak: rachaFinal,
    best_streak: Math.max(state.best_streak, rachaFinal),
  }

  await supabase
    .from('user_state')
    .update({ streak: rachaFinal, best_streak: nuevoState.best_streak, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  // Evaluar insignias
  const { data: badgesExistentes } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)

  const badgesYa = badgesExistentes?.map(b => b.badge_id) ?? []
  const nuevas = evaluarInsignias(nuevoState, badgesYa)

  if (nuevas.length > 0) {
    await supabase.from('user_badges').insert(nuevas.map(badge_id => ({ user_id: userId, badge_id })))
  }

  return nuevoState
}

export default async function HoyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoy = fechaHoy()

  // Obtener datos en paralelo
  const [stateRes, habitsRes, recordsRes] = await Promise.all([
    supabase.from('user_state').select('*').eq('user_id', user.id).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('activo', true).order('creado_en'),
    supabase.from('records').select('*').eq('user_id', user.id).eq('fecha', hoy),
  ])

  // Si el trigger aún no creó el user_state, lo creamos manualmente
  if (!stateRes.data) {
    await supabase.from('user_state').insert({ user_id: user.id })
    stateRes.data = { user_id: user.id, puntos: 0, streak: 0, best_streak: 0, last_active_date: null, updated_at: new Date().toISOString() }
  }

  const state = await actualizarEstadoDiario(supabase, user.id, stateRes.data as UserState)

  const habits = (habitsRes.data ?? []) as Habit[]
  const records = (recordsRes.data ?? []) as HabitRecord[]

  // Mapa habit_id → record de hoy
  const recordMap = new Map(records.map(r => [r.habit_id, r]))

  const habitsConRecord: HabitWithRecord[] = habits.map(h => ({
    ...h,
    record: recordMap.get(h.id),
  }))

  const completadosHoy = records.length
  const totalHabitos = habits.length
  const nivel = getNivel(state.puntos)

  // Calcular racha por hábito (últimos 30 días) — para badge de racha individual
  // Solo mostramos el badge si ≥ 3 días, no hacemos query pesada en SSR para esto
  // Usamos un objeto vacío por defecto
  const streaksPorHabito: Record<string, number> = {}

  return (
    <div className="min-h-dvh bg-app-bg pb-20">
      <TopBar
        titulo="Mis Hábitos"
        fecha={formatearFecha(hoy)}
        puntos={state.puntos}
      />

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Streak Hero */}
        <div className="bg-surface border border-surface-3 rounded-xl3 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-text-dim text-sm">Racha actual</p>
                <p className="text-3xl font-mono font-bold text-amber">{state.streak} días</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-text-dim text-sm">Puntos</p>
              <p className="text-2xl font-mono font-bold text-white">{state.puntos}</p>
            </div>
          </div>

          {/* Barra XP */}
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>{nivel.nombre}</span>
              <span>{nivel.progreso}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700"
                style={{ width: `${nivel.progreso}%` }}
              />
            </div>
            {nivel.max !== Infinity && (
              <p className="text-xs text-text-muted mt-1">
                {state.puntos} / {nivel.max} pts para {nivel.max === 2000 ? 'Leyenda' : 'siguiente nivel'}
              </p>
            )}
          </div>
        </div>

        {/* Progreso del día */}
        <div className="flex items-center justify-between px-1">
          <p className="text-text-dim text-sm">
            {completadosHoy === totalHabitos && totalHabitos > 0
              ? '¡Día completo! 🎉'
              : `${completadosHoy} de ${totalHabitos} hábitos`}
          </p>
          <div className="flex gap-1">
            {habits.map(h => (
              <div
                key={h.id}
                className={`w-2.5 h-2.5 rounded-full ${recordMap.has(h.id) ? 'bg-green' : 'bg-surface-3'}`}
              />
            ))}
          </div>
        </div>

        {/* Lista de hábitos */}
        <div className="space-y-3">
          {habitsConRecord.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-3">🌱</p>
              <p>No tenés hábitos activos</p>
              <p className="text-sm mt-1">Agregá uno desde Configuración</p>
            </div>
          ) : (
            habitsConRecord.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                streakPorHabito={streaksPorHabito[h.id] ?? 0}
              />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
