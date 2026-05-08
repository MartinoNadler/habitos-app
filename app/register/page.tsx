'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await registerAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-text-dim mt-1 text-sm">Tu viaje empieza hoy</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-dim mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-dim mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm text-text-dim mb-1.5" htmlFor="confirm">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              className="w-full bg-surface-2 border border-surface-3 rounded-xl2 px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="Repetí la contraseña"
            />
          </div>

          {error && (
            <div className="bg-red-soft/10 border border-red-soft/30 rounded-xl2 px-4 py-3 text-red-soft text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl2 transition-colors mt-2"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-text-dim text-sm mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
