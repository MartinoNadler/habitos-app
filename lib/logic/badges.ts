import type { UserState } from '@/lib/types'

export const BADGES = [
  { id: 'primera_semana', emoji: '🌱', nombre: 'Primera semana', descripcion: '7 días seguidos' },
  { id: 'mes_completo',   emoji: '📅', nombre: 'Mes completo',   descripcion: '30 días seguidos' },
  { id: 'imparable',      emoji: '🔥', nombre: 'Imparable',      descripcion: '30 días seguidos' },
  { id: 'modo_bestia',    emoji: '💪', nombre: 'Modo bestia',     descripcion: '90 días seguidos' },
  { id: 'tres_meses',     emoji: '🏆', nombre: '3 meses',         descripcion: '90 días seguidos' },
  { id: 'cien_pts',       emoji: '⚡', nombre: '100 puntos',      descripcion: 'Alcanzar 100 pts' },
  { id: 'quinientos_pts', emoji: '🎯', nombre: '500 puntos',      descripcion: 'Alcanzar 500 pts' },
  { id: 'leyenda',        emoji: '👑', nombre: 'Leyenda',          descripcion: 'Alcanzar 2000 pts' },
  { id: 'la_cabra',       emoji: '🐐', nombre: 'La Cabra',         descripcion: '365 días seguidos' },
] as const

export type BadgeId = (typeof BADGES)[number]['id']

type BadgeCondition = (state: UserState) => boolean

const CONDITIONS: Record<BadgeId, BadgeCondition> = {
  primera_semana: s => s.streak >= 7,
  mes_completo:   s => s.streak >= 30,
  imparable:      s => s.streak >= 30,
  modo_bestia:    s => s.streak >= 90,
  tres_meses:     s => s.streak >= 90,
  cien_pts:       s => s.puntos >= 100,
  quinientos_pts: s => s.puntos >= 500,
  leyenda:        s => s.puntos >= 2000,
  la_cabra:       s => s.streak >= 365,
}

/** Retorna los badge_ids que se deben desbloquear ahora (no están en badgesYa) */
export function evaluarInsignias(state: UserState, badgesYa: string[]): BadgeId[] {
  return BADGES
    .filter(b => !badgesYa.includes(b.id) && CONDITIONS[b.id](state))
    .map(b => b.id)
}
