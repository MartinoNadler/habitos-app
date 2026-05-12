'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HABITOS_DISPONIBLES } from '@/lib/onboarding'

const RECOMPENSAS_INICIALES = [
  { nombre: 'Serie extra',     emoji: '🎬', costo: 20,  descripcion: 'Ver un capítulo extra' },
  { nombre: 'Comida favorita', emoji: '🍕', costo: 35,  descripcion: 'Pedir o cocinar tu comida favorita' },
  { nombre: 'Compra personal', emoji: '🛍️', costo: 100, descripcion: 'Algo que quieras comprarte' },
  { nombre: 'Día libre',       emoji: '🏖️', costo: 200, descripcion: 'Un día sin obligaciones' },
]

export async function completeOnboardingAction(selectedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const selected = HABITOS_DISPONIBLES.filter(h => selectedIds.includes(h.id))

  if (selected.length > 0) {
    await supabase.from('habits').insert(
      selected.map(({ id: _id, desc: _desc, ...h }) => ({
        ...h,
        frecuencia:   'diario',
        meta_semanal: 1,
        dias_semana:  null,
        user_id:      user.id,
      }))
    )
  }

  // Recompensas por defecto (solo si no tiene ninguna)
  const { count } = await supabase
    .from('rewards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (!count || count === 0) {
    await supabase.from('rewards').insert(
      RECOMPENSAS_INICIALES.map(r => ({ ...r, user_id: user.id }))
    )
  }

  redirect('/hoy')
}
