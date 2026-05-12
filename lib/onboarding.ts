export const HABITOS_DISPONIBLES = [
  { id: 'agua',      nombre: 'Tomar agua',       emoji: '💧', categoria: 'salud',   esfuerzo: 'facil',    campo_extra: 'vasos',   desc: 'Hidratación diaria' },
  { id: 'ejercicio', nombre: 'Ejercicio',         emoji: '🏃', categoria: 'salud',   esfuerzo: 'dificil',  campo_extra: 'ninguno', desc: 'Actividad física' },
  { id: 'caminar',   nombre: 'Caminar',           emoji: '🚶', categoria: 'salud',   esfuerzo: 'facil',    campo_extra: 'ninguno', desc: '30 minutos al día' },
  { id: 'comer',     nombre: 'Comer bien',        emoji: '🥗', categoria: 'salud',   esfuerzo: 'moderado', campo_extra: 'ninguno', desc: 'Alimentación saludable' },
  { id: 'ducha',     nombre: 'Ducha fría',        emoji: '🚿', categoria: 'salud',   esfuerzo: 'dificil',  campo_extra: 'ninguno', desc: 'Energía y disciplina' },
  { id: 'leer',      nombre: 'Leer',              emoji: '📚', categoria: 'estudio', esfuerzo: 'facil',    campo_extra: 'paginas', desc: 'Lectura diaria' },
  { id: 'estudiar',  nombre: 'Estudiar',          emoji: '💻', categoria: 'estudio', esfuerzo: 'moderado', campo_extra: 'minutos', desc: 'Aprendizaje constante' },
  { id: 'idioma',    nombre: 'Practicar idioma',  emoji: '🌍', categoria: 'estudio', esfuerzo: 'facil',    campo_extra: 'minutos', desc: 'Duolingo, clases, etc.' },
  { id: 'meditar',   nombre: 'Meditar',           emoji: '🧘', categoria: 'salud',   esfuerzo: 'facil',    campo_extra: 'minutos', desc: 'Mindfulness' },
  { id: 'journal',   nombre: 'Escribir',          emoji: '✍️', categoria: 'otro',    esfuerzo: 'facil',    campo_extra: 'ninguno', desc: 'Journaling diario' },
  { id: 'dormir',    nombre: 'Dormir temprano',   emoji: '😴', categoria: 'sueño',   esfuerzo: 'moderado', campo_extra: 'horas',   desc: 'Buen descanso' },
  { id: 'pantallas', nombre: 'Sin pantallas',     emoji: '📵', categoria: 'sueño',   esfuerzo: 'moderado', campo_extra: 'ninguno', desc: 'Antes de dormir' },
] as const

export type HabitoDisponible = typeof HABITOS_DISPONIBLES[number]
