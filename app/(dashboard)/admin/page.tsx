'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Profile {
  id: string
  username: string
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isGM, loading } = useAuth()
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (loading) return
    if (!isGM) { router.replace('/dashboard'); return }
    loadProfiles()
  }, [isGM, loading])

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, username, role').order('username')
    if (data) setProfiles(data)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || newPassword.length < 6) return
    setSubmitting(true)
    setResult(null)

    const res = await fetch('/api/admin/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser, newPassword }),
    })
    const data = await res.json()

    if (res.ok) {
      setResult({ ok: true, msg: `Passwort für "${profiles.find((p) => p.id === selectedUser)?.username}" erfolgreich geändert.` })
      setNewPassword('')
      setSelectedUser('')
    } else {
      setResult({ ok: false, msg: data.error ?? 'Unbekannter Fehler.' })
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-6 text-zinc-500 text-sm">Laden...</div>
  if (!isGM) return null

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Admin-Panel</h1>
          <p className="text-xs text-zinc-500">Nur für Game Masters</p>
        </div>
      </div>

      {/* Passwort zurücksetzen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Passwort zurücksetzen</h2>
        </div>

        <div className="bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2.5 text-xs text-amber-300/80">
          Damit kannst du das Passwort eines Spielers direkt setzen — teile das neue Passwort sicher mit ihnen.
        </div>

        <form onSubmit={handleReset} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Spieler auswählen</label>
            <select
              required
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Bitte wählen —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username} ({p.role === 'gm' ? 'GM' : 'Spieler'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Neues Passwort</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {result && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.ok ? 'bg-green-900/20 border border-green-800/40 text-green-300' : 'bg-red-900/20 border border-red-800/40 text-red-300'}`}>
              {result.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {result.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedUser || newPassword.length < 6}
            className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
          >
            {submitting ? 'Wird gesetzt...' : 'Passwort setzen'}
          </button>
        </form>
      </div>

      {/* Übersicht alle Nutzer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">Alle Nutzer</h2>
        <div className="divide-y divide-zinc-800">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {p.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-zinc-200">{p.username}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.role === 'gm' ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                {p.role === 'gm' ? 'Game Master' : 'Spieler'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
