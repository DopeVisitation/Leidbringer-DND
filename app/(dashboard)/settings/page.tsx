'use client'

import { useState, useEffect } from 'react'
import { Settings, Palette, User, Moon, Sun, Check, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/components/providers/ThemeProvider'

const AVATAR_EMOJIS = [
  '🧙','⚔️','🛡️','🏹','🗡️','🔮','🐉','🦅','🌙','⭐',
  '🍄','🌿','🔥','❄️','⚡','🌊','💀','👁️','🎲','🦁',
  '🐺','🦊','🦉','🐦','🐻','🐗','🦄','🧝','🧟','🧛',
  '🏰','🗺️','💎','🗝️','📜','🪄','🧪','🎯','🌋','🏔️',
]

const ACCENT_OPTIONS = [
  { id: 'amber',  label: 'Amber',  color: '#d97706', preview: 'bg-amber-500'  },
  { id: 'blue',   label: 'Saphir', color: '#3b82f6', preview: 'bg-blue-500'   },
  { id: 'green',  label: 'Jadeit', color: '#22c55e', preview: 'bg-green-500'  },
  { id: 'purple', label: 'Amethyst', color: '#a855f7', preview: 'bg-purple-500'},
  { id: 'red',    label: 'Rubin',  color: '#ef4444', preview: 'bg-red-500'    },
]

export default function SettingsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const { theme, accent, setTheme, setAccent } = useTheme()

  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('🎲')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.display_name ?? user.username ?? '')
    setAvatarEmoji(user.avatar_emoji ?? '🎲')
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      avatar_emoji: avatarEmoji,
      theme,
      accent_color: accent,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Einstellungen</h1>
          <p className="text-sm text-zinc-400">UI & Profil anpassen</p>
        </div>
      </div>

      {/* ── Profil ─────────────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Profil</h2>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-amber-500/50 flex items-center justify-center text-4xl">
            {avatarEmoji}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">{displayName || user.username}</p>
            <p className="text-xs text-zinc-500">{user.role === 'gm' ? '⚔️ Game Master' : '🎲 Spieler'} · @{user.username}</p>
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Anzeigename (im Chat, Würfellog)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.username}
            maxLength={30}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <p className="text-xs text-zinc-600">Leer lassen = Benutzername wird verwendet</p>
        </div>

        {/* Avatar emoji */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Avatar-Symbol</label>
          <div className="grid grid-cols-10 gap-1.5">
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatarEmoji(emoji)}
                className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all border ${
                  avatarEmoji === emoji
                    ? 'bg-amber-600/30 border-amber-500 scale-110'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:scale-105'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Erscheinungsbild ────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Erscheinungsbild</h2>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Modus</label>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-800 border-amber-500 text-amber-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dunkel
              {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                theme === 'light'
                  ? 'bg-amber-50 border-amber-500 text-amber-700'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <Sun className="w-4 h-4" />
              Hell (Pergament)
              {theme === 'light' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Akzentfarbe</label>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAccent(opt.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  accent === opt.id
                    ? 'border-current text-zinc-100 scale-105'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
                style={accent === opt.id ? { borderColor: opt.color, backgroundColor: opt.color + '20' } : {}}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                {opt.label}
                {accent === opt.id && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-zinc-700 p-3 space-y-2 bg-zinc-800/40">
          <p className="text-xs text-zinc-500 font-medium">Vorschau</p>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold">
              Primär-Button
            </button>
            <span className="text-amber-400 text-sm font-semibold">Aktiv-Text</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-600/20 border border-amber-600/30 text-amber-400 text-xs">
              Badge
            </span>
          </div>
        </div>
      </section>

      {/* ── Account info ───────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">Account</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Benutzername</p>
            <p className="text-zinc-200 font-medium">@{user.username}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Rolle</p>
            <p className="text-zinc-200 font-medium">{user.role === 'gm' ? '⚔️ Game Master' : '🎲 Spieler'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-zinc-500 mb-0.5">E-Mail</p>
            <p className="text-zinc-200">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-semibold transition-all"
      >
        {saved ? (
          <><Check className="w-4 h-4" /> Gespeichert!</>
        ) : (
          <><Save className="w-4 h-4" /> Profil speichern</>
        )}
      </button>
    </div>
  )
}
