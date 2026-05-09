/**
 * Rate limiter en memoria — sin queries a la DB.
 * Usa un Map con ventana deslizante de 60 segundos.
 * En Vercel (serverless) el Map se resetea entre invocaciones frías,
 * pero igual protege contra ráfagas rápidas dentro de la misma instancia.
 */

interface RateLimitEntry {
  count: number
  resetAt: number  // timestamp en ms
}

// Map global — persiste entre requests en la misma instancia del servidor
const store = new Map<string, RateLimitEntry>()

// Limpiar entradas vencidas cada 5 minutos para no acumular memoria
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  maxRequests: number  // máximo de requests permitidos
  windowMs: number     // ventana de tiempo en ms
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export function checkRateLimit(
  userId: string,
  action: string,
  { maxRequests = 30, windowMs = 60_000 }: Partial<RateLimitOptions> = {}
): RateLimitResult {
  const key = `${userId}:${action}`
  const now = Date.now()
  const entry = store.get(key)

  // Si no existe o venció la ventana, crear nueva entrada
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  // Incrementar contador
  entry.count++

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}
