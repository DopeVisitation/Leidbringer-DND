'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'player' as 'player' | 'gm',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username,
          role: form.role,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 mb-4">
            <Shield className="w-7 h-7 text-amber-100" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">DnD Companion</h1>
          <p className="text-sm text-zinc-400 mt-1">Konto erstellen</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Benutzername</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="DeinName"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-Mail</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Passwort</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Mindestens 6 Zeichen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rolle</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: 'player' }))}
                className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                  form.role === 'player'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                🎲 Spieler
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: 'gm' }))}
                className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                  form.role === 'gm'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                ⚔️ Game Master
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            {loading ? 'Konto wird erstellt...' : 'Registrieren'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Bereits ein Konto?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300">
              Anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
