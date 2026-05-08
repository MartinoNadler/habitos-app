'use client'

import { createBrowserClient } from '@supabase/ssr'

// Singleton para el cliente browser — reutilizar instancia evita re-suscripciones
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
