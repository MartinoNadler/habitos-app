/**
 * Evalúa si la racha continúa, se mantiene o se rompe.
 * lastActiveDate: fecha YYYY-MM-DD del último día activo, o null si nunca
 * today: fecha YYYY-MM-DD de hoy
 */
export function evaluarRacha(
  lastActiveDate: string | null,
  today: string,
  streakActual: number
): { nuevaRacha: number; rota: boolean } {
  if (!lastActiveDate) {
    return { nuevaRacha: streakActual, rota: false }
  }

  const last = new Date(lastActiveDate)
  const todayDate = new Date(today)

  // Diferencia en días calendario (ignorando horas)
  const diffMs = todayDate.getTime() - last.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Mismo día: sin cambio
    return { nuevaRacha: streakActual, rota: false }
  }

  if (diffDays === 1) {
    // Ayer fue el último día activo: racha continúa
    return { nuevaRacha: streakActual, rota: false }
  }

  // Más de 1 día de diferencia: racha rota
  return { nuevaRacha: 0, rota: true }
}
