'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { RewardSchema, RedeemSchema, UuidSchema } from '@/lib/validation/schemas'
import { checkRateLimit } from '@/lib/ratelimit'

/** Límite de canjes por mes según costo */
function getLimiteMensual(costo: number): { limite: number; meses: number } {
  if (costo >= 201) return { limite: 1, meses: 3 }
  if (costo >= 51)  return { limite: 1, meses: 1 }
  if (costo >= 21)  return { limite: 2, meses: 1 }
  return { limite: 4, meses: 1 }
}

export async function redeemRewardAction(formData: FormData) {
  const parsed = RedeemSchema.safeParse({ reward_id: formData.get('reward_id') })
  if (!parsed.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar recompensa pertenece al usuario
  const { data: reward } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', parsed.data.reward_id)
    .eq('user_id', user.id)
    .single()

  if (!reward) return { error: 'Recompensa no encontrada' }

  // Rate limiting: máximo 5 canjes por minuto
  const { allowed } = checkRateLimit(user.id, 'redeem', { maxRequests: 5, windowMs: 60_000 })
  if (!allowed) return { error: 'Demasiados canjes. Esperá un minuto.' }

  // Verificar saldo — server-side, nunca confiar en el cliente
  const { data: state } = await supabase
    .from('user_state')
    .select('puntos')
    .eq('user_id', user.id)
    .single()

  if (!state || state.puntos < reward.costo) return { error: 'Puntos insuficientes' }

  // Verificar límite de canjes
  const { limite, meses } = getLimiteMensual(reward.costo)
  const desde = new Date()
  desde.setMonth(desde.getMonth() - (meses - 1))
  desde.setDate(1)
  const desdeStr = desde.toISOString().split('T')[0]

  const { count } = await supabase
    .from('redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('reward_id', parsed.data.reward_id)
    .gte('fecha', desdeStr)

  if ((count ?? 0) >= limite) {
    return { error: `Límite de canjes alcanzado para esta recompensa` }
  }

  // Registrar canje y descontar puntos
  const { error: redeemError } = await supabase.from('redemptions').insert({
    user_id: user.id,
    reward_id: parsed.data.reward_id,
    nombre: reward.nombre,
    emoji: reward.emoji,
    pts: reward.costo,
    fecha: new Date().toISOString().split('T')[0],
  })

  if (redeemError) return { error: 'Error al canjear' }

  await supabase
    .from('user_state')
    .update({ puntos: state.puntos - reward.costo, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  revalidatePath('/logros')
  return { ok: true }
}

export async function createRewardAction(formData: FormData) {
  const raw = {
    nombre: formData.get('nombre'),
    emoji: formData.get('emoji'),
    costo: Number(formData.get('costo')),
    descripcion: formData.get('descripcion') ?? undefined,
  }

  const parsed = RewardSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('rewards').insert({ ...parsed.data, user_id: user.id })
  if (error) return { error: 'Error al crear recompensa' }

  revalidatePath('/config')
  revalidatePath('/logros')
  return { ok: true }
}

export async function updateRewardAction(formData: FormData) {
  const rewardId = UuidSchema.safeParse(formData.get('id'))
  if (!rewardId.success) return { error: 'ID inválido' }

  const raw = {
    nombre: formData.get('nombre'),
    emoji: formData.get('emoji'),
    costo: Number(formData.get('costo')),
    descripcion: formData.get('descripcion') ?? undefined,
  }

  const parsed = RewardSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('rewards')
    .update(parsed.data)
    .eq('id', rewardId.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Error al actualizar recompensa' }

  revalidatePath('/config')
  revalidatePath('/logros')
  return { ok: true }
}

export async function deleteRewardAction(formData: FormData) {
  const rewardId = UuidSchema.safeParse(formData.get('id'))
  if (!rewardId.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId.data)
    .eq('user_id', user.id)

  if (error) return { error: 'Error al eliminar recompensa' }

  revalidatePath('/config')
  revalidatePath('/logros')
  return { ok: true }
}
