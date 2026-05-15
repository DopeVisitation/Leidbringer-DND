'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsConfirm(false)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setNeedsConfirm(true)
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong')) {
        setError('E-Mail oder Passwort falsch.')
      } else {
        setError(error.message)
      }
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
          <p className="text-sm text-zinc-400 mt-1">Anmelden und losspielen</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-Mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-zinc-300">Passwort</label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
              >
                Passwort vergessen?
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="••••••••"
            />
          </div>

          {needsConfirm && (
            <div className="flex gap-2 bg-blue-900/20 border border-blue-800/50 rounded-lg px-3 py-3">
              <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium">E-Mail Bestätigung erforderlich</p>
                <p className="text-xs text-blue-400 mt-1">
                  Bitte bestätige deine E-Mail-Adresse zuerst — oder deaktiviere die E-Mail-Bestätigung im Supabase Dashboard unter{' '}
                  <span className="font-mono text-xs">Authentication → Providers → Email</span>.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Noch kein Account?{' '}
            <Link href="/register" className="text-amber-400 hover:text-amber-300">
              Registrieren
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
