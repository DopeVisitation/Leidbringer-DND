'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.')
      return
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Fehler beim Setzen des Passworts. Bitte fordere einen neuen Link an.')
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 mb-4">
            <Shield className="w-7 h-7 text-amber-100" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Neues Passwort</h1>
          <p className="text-sm text-zinc-400 mt-1">Wähle ein neues Passwort</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {done ? (
            <div className="flex gap-3 bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-300">
                <p className="font-medium">Passwort geändert!</p>
                <p className="text-green-400 mt-1">Du wirst weitergeleitet...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Neues Passwort</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Passwort bestätigen</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  placeholder="••••••••"
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
                {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
