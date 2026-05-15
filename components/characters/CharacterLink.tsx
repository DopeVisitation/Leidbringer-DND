'use client'

import { useState } from 'react'
import { ExternalLink, Sword, Star, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink as CharacterLinkType, User } from '@/types'

interface CharacterLinkProps {
  character: CharacterLinkType | null
  currentUser: User
  onSaved?: (character: CharacterLinkType) => void
}

export function CharacterLinkCard({ character, currentUser, onSaved }: CharacterLinkProps) {
  const [editing, setEditing] = useState(!character)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    dnd_beyond_url: character?.dnd_beyond_url ?? '',
    character_name: character?.character_name ?? '',
    class_name: character?.class_name ?? '',
    level: character?.level ?? 1,
  })
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.character_name || !form.class_name) return
    setSaving(true)

    const payload = {
      user_id: currentUser.id,
      ...form,
    }

    let result
    if (character?.id) {
      result = await supabase
        .from('character_links')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', character.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('character_links')
        .insert(payload)
        .select()
        .single()
    }

    setSaving(false)
    if (result.data) {
      onSaved?.(result.data)
      setEditing(false)
    }
  }

  if (!editing && character) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
              <Sword className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">{character.character_name}</h3>
              <p className="text-sm text-zinc-400">
                {character.class_name} · Level {character.level}
              </p>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: Math.min(character.level, 10) }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                ))}
                {character.level > 10 && (
                  <span className="text-xs text-amber-500">+{character.level - 10}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {character.dnd_beyond_url && (
          <a
            href={character.dnd_beyond_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Auf DnD Beyond öffnen
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
      <h3 className="text-base font-semibold text-zinc-100">
        {character ? 'Charakter bearbeiten' : 'Charakter verlinken'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Charaktername *</label>
        <input
          type="text"
          value={form.character_name}
          onChange={(e) => setForm((f) => ({ ...f, character_name: e.target.value }))}
          placeholder="z.B. Thordak der Weise"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Klasse *</label>
          <input
            type="text"
            value={form.class_name}
            onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
            placeholder="z.B. Wizard"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Level *</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">DnD Beyond URL</label>
        <input
          type="url"
          value={form.dnd_beyond_url}
          onChange={(e) => setForm((f) => ({ ...f, dnd_beyond_url: e.target.value }))}
          placeholder="https://www.dndbeyond.com/characters/..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="flex gap-3">
        {character && (
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !form.character_name || !form.class_name}
          className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          {saving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
