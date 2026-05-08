import type { Esfuerzo } from '@/lib/types'

export const PTS_BASE: Record<Esfuerzo, number> = { facil: 1, moderado: 2, dificil: 4 }
// Cada N completions dentro del ciclo se otorga bonus
export const BONUS_CYCLE: Record<Esfuerzo, number> = { facil: 28, moderado: 14, dificil: 7 }
export const BONUS_PTS: Record<Esfuerzo, number> = { facil: 1, moderado: 2, dificil: 4 }

/**
 * Calcula puntos para un check-in.
 * streakActual: racha ANTES de este check-in (días consecutivos).
 * El bonus se otorga cuando la racha alcanza un múltiplo del ciclo.
 */
export function calcularPuntos(esfuerzo: Esfuerzo, streakActual: number): number {
  const base = PTS_BASE[esfuerzo]
  const cycle = BONUS_CYCLE[esfuerzo]
  const bonus = BONUS_PTS[esfuerzo]

  // +1 porque este check-in incrementa la racha
  const nuevaRacha = streakActual + 1
  const esHito = nuevaRacha > 0 && nuevaRacha % cycle === 0

  return base + (esHito ? bonus : 0)
}
