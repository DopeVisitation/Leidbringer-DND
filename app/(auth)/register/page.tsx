'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
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

    const { data, error } = await supabase.auth.signUp({
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
      return
    }

    // If session exists → email confirmation disabled → go to dashboard
    if (data.session) {
      router.push('/dashboard')
    } else {
      // Email confirmation is required
      setEmailSent(true)
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">E-Mail bestätigen</h1>
          <p className="text-sm text-zinc-400 mb-4">
            Wir haben eine Bestätigungs-E-Mail an <strong className="text-zinc-200">{form.email}</strong> geschickt.
            Bitte klicke auf den Link in der E-Mail, dann kannst du dich anmelden.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left text-xs text-zinc-500 mb-4">
            <p className="font-medium text-zinc-400 mb-1">💡 Tipp für den GM:</p>
            <p>Um die E-Mail-Bestätigung zu überspringen, gehe in Supabase zu:</p>
            <p className="font-mono mt-1 text-zinc-400">Authentication → Providers → Email → "Confirm email" deaktivieren</p>
          </div>
          <Link href="/login" className="text-amber-400 hover:text-amber-300 text-sm">
            Zurück zum Login →
          </Link>
        </div>
      </div>
    )
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
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rolle auswählen</label>
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
            <p className="text-xs text-zinc-600 mt-1">
              {form.role === 'gm'
                ? 'Als GM kannst du Sessions erstellen und verwalten.'
                : 'Als Spieler kannst du auf Sessions antworten und Notizen führen.'}
            </p>
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
