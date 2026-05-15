'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
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
    dates: [''],
    start_time: '',
    end_time: '',
    session_type: 'online' as SessionType,
    location: '',
    discord_link: '',
  })

  const supabase = createClient()

  const addDate = () => setForm((prev) => ({ ...prev, dates: [...prev.dates, ''] }))

  const removeDate = (i: number) =>
    setForm((prev) => ({ ...prev, dates: prev.dates.filter((_, idx) => idx !== i) }))

  const setDate = (i: number, value: string) =>
    setForm((prev) => {
      const dates = [...prev.dates]
      dates[i] = value
      return { ...prev, dates }
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validDates = form.dates.filter((d) => d.trim() !== '')
    if (validDates.length === 0 || !form.start_time || !form.end_time) return

    setLoading(true)

    const rows = validDates.map((d) => ({
      title: form.title || 'DnD Session',
      description: form.description || null,
      start_date: new Date(`${d}T${form.start_time}`).toISOString(),
      end_date: new Date(`${d}T${form.end_time}`).toISOString(),
      session_type: form.session_type,
      location: form.location || null,
      discord_link: form.discord_link || null,
      created_by: currentUser.id,
    }))

    await supabase.from('sessions').insert(rows)

    setLoading(false)
    onSuccess?.()
  }

  const field = (key: keyof Omit<typeof form, 'dates'>, value: string) =>
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

      {/* Datum(e) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-zinc-300">
            Datum{form.dates.length > 1 ? 'e' : ''} *
          </label>
          <button
            type="button"
            onClick={addDate}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Weiteres Datum
          </button>
        </div>
        <div className="space-y-2">
          {form.dates.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="date"
                required={i === 0}
                value={d}
                onChange={(e) => setDate(i, e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
              {form.dates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDate(i)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {form.dates.length > 1 && (
          <p className="text-xs text-amber-400/70 mt-1.5">
            Es werden {form.dates.filter((d) => d).length} Sessions erstellt.
          </p>
        )}
      </div>

      {/* Uhrzeit */}
      <div className="grid grid-cols-2 gap-3">
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
          {loading
            ? 'Wird erstellt...'
            : form.dates.filter((d) => d).length > 1
            ? `${form.dates.filter((d) => d).length} Sessions erstellen`
            : 'Session erstellen'}
        </button>
      </div>
    </form>
  )
}
