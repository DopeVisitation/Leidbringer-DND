'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionType, User } from '@/types'

interface SessionFormProps {
  currentUser: User
  onSuccess?: () => void
  onCancel?: () => void
}

const SESSION_TYPES: { value: SessionType; label: string; desc: string }[] = [
  { value: 'online', label: '🖥 Online', desc: 'Nur remote via Discord/Roll20' },
  { value: 'presence', label: '🏠 Präsenz', desc: 'Nur vor Ort' },
  { value: 'hybrid', label: '🔀 Hybrid', desc: 'Beides möglich' },
]

export function SessionForm({ currentUser, onSuccess, onCancel }: SessionFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_time: '',
    session_type: 'online' as SessionType,
    location: '',
    discord_link: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.start_date || !form.start_time || !form.end_time) return

    setLoading(true)

    const startDate = new Date(`${form.start_date}T${form.start_time}`)
    const endDate = new Date(`${form.start_date}T${form.end_time}`)

    await supabase.from('sessions').insert({
      title: form.title || 'DnD Session',
      description: form.description || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      session_type: form.session_type,
      location: form.location || null,
      discord_link: form.discord_link || null,
      created_by: currentUser.id,
    })

    setLoading(false)
    onSuccess?.()
  }

  const field = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Titel</label>
        <input
          type="text"
          placeholder="DnD Session"
          value={form.title}
          onChange={(e) => field('title', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Datum *</label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => field('start_date', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Start *</label>
            <input
              type="time"
              required
              value={form.start_time}
              onChange={(e) => field('start_time', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Ende *</label>
            <input
              type="time"
              required
              value={form.end_time}
              onChange={(e) => field('end_time', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Session-Art</label>
        <div className="grid grid-cols-3 gap-2">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => field('session_type', t.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                form.session_type === t.value
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Beschreibung</label>
        <textarea
          rows={3}
          placeholder="Optionale Beschreibung..."
          value={form.description}
          onChange={(e) => field('description', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>

      {form.session_type !== 'online' && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Ort</label>
          <input
            type="text"
            placeholder="Adresse oder Beschreibung"
            value={form.location}
            onChange={(e) => field('location', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      {form.session_type !== 'presence' && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Discord-Link</label>
          <input
            type="url"
            placeholder="https://discord.gg/..."
            value={form.discord_link}
            onChange={(e) => field('discord_link', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
        >
          {loading ? 'Wird erstellt...' : 'Session erstellen'}
        </button>
      </div>
    </form>
  )
}
