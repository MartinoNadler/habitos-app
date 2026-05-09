import { z } from 'zod'

export const HabitSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(50).trim(),
  emoji: z.string().min(1).max(8),
  categoria: z.enum(['salud', 'estudio', 'sueño', 'otro']),
  esfuerzo: z.enum(['facil', 'moderado', 'dificil']),
  frecuencia: z.enum(['diario', 'veces_semana', 'dias_semana']),
  meta_semanal: z.number().int().min(1).max(6).nullable().optional(),
  dias_semana: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable().optional(),
  campo_extra: z.enum(['minutos', 'horas', 'vasos', 'paginas', 'nota', 'ninguno']),
})

export const RecordSchema = z.object({
  habit_id: z.string().uuid(),
  valor: z.number().min(0).max(9999).optional(),
  nota: z.string().max(500).optional(),
})

export const UndoRecordSchema = z.object({
  habit_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const RewardSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(50).trim(),
  emoji: z.string().min(1).max(8),
  costo: z.number().int().min(1).max(10000),
  descripcion: z.string().max(200).optional(),
})

export const RedeemSchema = z.object({
  reward_id: z.string().uuid(),
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

export const UuidSchema = z.string().uuid()
