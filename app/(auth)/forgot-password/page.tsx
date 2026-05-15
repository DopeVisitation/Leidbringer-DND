'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError('Fehler beim Senden. Bitte prüfe die E-Mail-Adresse.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 mb-4">
            <Shield className="w-7 h-7 text-amber-100" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Passwort vergessen</h1>
          <p className="text-sm text-zinc-400 mt-1">Wir schicken dir einen Reset-Link</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {sent ? (
            <div className="space-y-4">
              <div className="flex gap-3 bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-300">
                  <p className="font-medium">E-Mail verschickt!</p>
                  <p className="text-green-400 mt-1">
                    Schau in dein Postfach bei <span className="font-medium">{email}</span> und klicke den Link.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl text-center border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Zurück zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-Mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  placeholder="deine@email.de"
                />
              </div>

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
                {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>

              <p className="text-center text-sm text-zinc-500">
                <Link href="/login" className="text-amber-400 hover:text-amber-300">
                  Zurück zum Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
