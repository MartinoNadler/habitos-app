export type Categoria = 'salud' | 'estudio' | 'sueño' | 'otro'
export type Esfuerzo = 'facil' | 'moderado' | 'dificil'
// 'semanal' se mantiene por compatibilidad con datos existentes, se trata como 'diario'
export type Frecuencia = 'diario' | 'semanal' | 'veces_semana' | 'dias_semana'
export type CampoExtra = 'minutos' | 'horas' | 'vasos' | 'paginas' | 'nota' | 'ninguno'

export interface Habit {
  id: string
  user_id: string
  nombre: string
  emoji: string
  categoria: Categoria
  esfuerzo: Esfuerzo
  frecuencia: Frecuencia
  meta_semanal: number | null   // para 'veces_semana': objetivo por semana (2-6)
  dias_semana: number[] | null  // para 'dias_semana': [0..6] donde 0=Dom
  campo_extra: CampoExtra
  activo: boolean
  creado_en: string
}

export interface Record {
  id: string
  user_id: string
  habit_id: string
  fecha: string
  valor: number | null
  nota: string | null
  pts: number
  created_at: string
}

export interface UserState {
  user_id: string
  puntos: number
  streak: number
  best_streak: number
  last_active_date: string | null
  updated_at: string
}

export interface Reward {
  id: string
  user_id: string
  nombre: string
  emoji: string
  costo: number
  descripcion: string | null
  creado_en: string
}

export interface Redemption {
  id: string
  user_id: string
  reward_id: string | null
  nombre: string
  emoji: string
  pts: number
  fecha: string
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  desbloqueada_en: string
}

export interface HabitWithRecord extends Habit {
  record?: Record
}

export type Nivel = {
  nombre: string
  min: number
  max: number
}

export const NIVELES: Nivel[] = [
  { nombre: 'Principiante', min: 0, max: 100 },
  { nombre: 'En camino', min: 100, max: 300 },
  { nombre: 'Constante', min: 300, max: 600 },
  { nombre: 'Dedicado', min: 600, max: 1000 },
  { nombre: 'Experto', min: 1000, max: 2000 },
  { nombre: 'Leyenda', min: 2000, max: Infinity },
]

export function getNivel(puntos: number): Nivel & { progreso: number } {
  const nivel = NIVELES.find(n => puntos >= n.min && puntos < n.max) ?? NIVELES[NIVELES.length - 1]
  const rango = nivel.max === Infinity ? 1000 : nivel.max - nivel.min
  const progreso = nivel.max === Infinity ? 100 : Math.round(((puntos - nivel.min) / rango) * 100)
  return { ...nivel, progreso }
}
