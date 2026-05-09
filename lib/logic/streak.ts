/**
 * LÓGICA DE RACHA:
 * - La racha se evalúa UNA VEZ por día, al abrir la app en un nuevo día
 * - Para sumar 1 día a la racha se necesita haber completado ≥90% de los hábitos el día anterior
 * - Si no se cumplió el 90% o pasaron más de 2 días sin abrir la app → racha se rompe
 */

export const STREAK_MILESTONES: { dias: number; pts: number }[] = [
  { dias: 7,   pts: 2  },
  { dias: 15,  pts: 4  },
  { dias: 30,  pts: 6  },
  { dias: 90,  pts: 10 },
  { dias: 120, pts: 15 },
  { dias: 180, pts: 25 },
  { dias: 365, pts: 50 },
]

/** Retorna los puntos bonus si la nueva racha alcanza un hito, 0 si no */
export function getBonusPorRacha(nuevaRacha: number): number {
  return STREAK_MILESTONES.find(m => m.dias === nuevaRacha)?.pts ?? 0
}

/**
 * Evalúa si la racha continúa o se rompe al inicio de un nuevo día.
 * completadosAyer: cantidad de hábitos completados ayer
 * totalHabitos: total de hábitos activos
 * lastActiveDate: fecha YYYY-MM-DD del último día evaluado
 * streakActual: racha antes de esta evaluación
 */
export function evaluarRachaDiaria(params: {
  completadosAyer: number
  totalHabitos: number
  lastActiveDate: string | null
  today: string
  streakActual: number
}): { nuevaRacha: number; rota: boolean; bonusPts: number } {
  const { completadosAyer, totalHabitos, lastActiveDate, today, streakActual } = params

  // Sin hábitos activos: no evaluar racha
  if (totalHabitos === 0) {
    return { nuevaRacha: streakActual, rota: false, bonusPts: 0 }
  }

  // Verificar que el último día evaluado fue ayer (racha no se rompió por inactividad)
  if (!lastActiveDate) {
    return { nuevaRacha: 0, rota: false, bonusPts: 0 }
  }

  const last = new Date(lastActiveDate + 'T00:00:00')
  const todayDate = new Date(today + 'T00:00:00')
  const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

  // Si pasaron más de 1 día desde el último activo → racha rota
  if (diffDays > 1) {
    return { nuevaRacha: 0, rota: true, bonusPts: 0 }
  }

  // Verificar cumplimiento del 90%
  const pct = completadosAyer / totalHabitos
  if (pct < 0.9) {
    return { nuevaRacha: 0, rota: true, bonusPts: 0 }
  }

  // Racha continúa
  const nuevaRacha = streakActual + 1
  const bonusPts = getBonusPorRacha(nuevaRacha)
  return { nuevaRacha, rota: false, bonusPts }
}
