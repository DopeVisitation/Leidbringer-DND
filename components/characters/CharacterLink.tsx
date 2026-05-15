'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Edit2, Search, Loader2, AlertCircle, Shield, Heart, Zap, Star, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink as CharacterLinkType, User } from '@/types'

interface CharacterLinkProps {
  character: CharacterLinkType | null
  currentUser: User
  onSaved?: (character: CharacterLinkType) => void
}

interface CharacterData {
  character_name: string
  class_name: string
  level: number
  race: string
  background: string
  alignment: string
  avatar_url: string | null
  stats: Record<string, number>
  max_hp: number
  proficiency_bonus: number
  speed: number
  initiative: number
  inspiration: boolean
}

const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_LABELS: Record<string, string> = {
  STR: 'Stärke', DEX: 'Geschicklichkeit', CON: 'Konstitution',
  INT: 'Intelligenz', WIS: 'Weisheit', CHA: 'Charisma',
}

function statMod(val: number): string {
  const m = Math.floor((val - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function StatBox({ stat, value }: { stat: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-lg py-2 px-1 min-w-[60px]">
      <span className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1">{stat}</span>
      <span className="text-xl font-black text-[#f5deb3]">{statMod(value)}</span>
      <span className="text-xs text-[#a0785a] mt-0.5">{value}</span>
    </div>
  )
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-lg py-2.5 px-3 gap-1 min-w-[70px]">
      <div className="text-[#c84b11]">{icon}</div>
      <span className="text-base font-black text-[#f5deb3]">{value}</span>
      <span className="text-[10px] text-[#a0785a] text-center leading-tight">{label}</span>
    </div>
  )
}

export function CharacterLinkCard({ character, currentUser, onSaved }: CharacterLinkProps) {
  const [editing, setEditing] = useState(!character)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [fetchedData, setFetchedData] = useState<CharacterData | null>(null)
  const [autoLoading, setAutoLoading] = useState(false)

  // Auto-fetch character data on mount when a URL is linked
  useEffect(() => {
    if (character?.dnd_beyond_url && !editing) {
      setAutoLoading(true)
      fetch(`/api/dnd-character?url=${encodeURIComponent(character.dnd_beyond_url)}`)
        .then((r) => r.json())
        .then((data) => { if (!data.error) setFetchedData(data as CharacterData) })
        .catch(() => {})
        .finally(() => setAutoLoading(false))
    }
  }, [character?.dnd_beyond_url, editing])
  const [form, setForm] = useState({
    dnd_beyond_url: character?.dnd_beyond_url ?? '',
    character_name: character?.character_name ?? '',
    class_name: character?.class_name ?? '',
    level: character?.level ?? 1,
  })
  const supabase = createClient()

  const handleFetchFromUrl = async () => {
    if (!form.dnd_beyond_url) return
    setFetching(true)
    setFetchError('')
    setFetchedData(null)

    try {
      const res = await fetch(`/api/dnd-character?url=${encodeURIComponent(form.dnd_beyond_url)}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        setFetchError(data.error ?? 'Charakter konnte nicht geladen werden.')
      } else {
        setFetchedData(data as CharacterData)
        setForm((f) => ({
          ...f,
          character_name: data.character_name,
          class_name: data.class_name,
          level: data.level,
        }))
        setFetchError('')
      }
    } catch {
      setFetchError('Netzwerkfehler beim Laden des Charakters.')
    } finally {
      setFetching(false)
    }
  }

  const handleSave = async () => {
    if (!form.character_name || !form.class_name) return
    setSaving(true)

    const payload = { user_id: currentUser.id, ...form }
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

  // ── Display mode ──────────────────────────────────────────────────────────
  if (!editing && character) {
    const d = fetchedData

    return (
      <div className="rounded-xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
        {/* DnD Beyond-style header */}
        <div
          className="relative px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-4xl flex-shrink-0 shadow-lg shadow-black/50">
              ⚔️
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-[#f5deb3] leading-tight truncate">{character.character_name}</h2>
              <p className="text-sm text-[#c84b11] font-semibold mt-0.5">{character.class_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-[#a0785a]">Level {character.level}</span>
                {d?.race && <span className="text-xs text-[#a0785a]">· {d.race}</span>}
                {d?.background && <span className="text-xs text-[#a0785a]">· {d.background}</span>}
                {d?.alignment && <span className="text-xs text-[#a0785a]">· {d.alignment}</span>}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-lg text-[#a0785a] hover:text-[#f5deb3] hover:bg-[#1a0a02]/60 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Character body */}
        <div className="bg-[#0f0600] p-4 space-y-4">
          {autoLoading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-4 h-4 text-[#c84b11] animate-spin" />
              <span className="text-xs text-[#a0785a]">Charakterdaten werden geladen…</span>
            </div>
          )}

          {/* Ability scores */}
          <div>
            <p className="text-xs font-bold text-[#c84b11] uppercase tracking-widest mb-2">Eigenschaften</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {STAT_ORDER.map((stat) => (
                <StatBox key={stat} stat={stat} value={d?.stats?.[stat] ?? 10} />
              ))}
            </div>
            {!d && !autoLoading && (
              <p className="text-xs text-[#5a3a22] mt-1.5 text-center">Standardwerte — DnD Beyond nicht erreichbar</p>
            )}
          </div>

          {/* Combat stats */}
          <div>
            <p className="text-xs font-bold text-[#c84b11] uppercase tracking-widest mb-2">Kampfwerte</p>
            <div className="flex gap-2 flex-wrap justify-center">
              <StatBadge icon={<Heart className="w-4 h-4" />} label="Trefferpunkte" value={d?.max_hp ?? '—'} />
              <StatBadge icon={<Shield className="w-4 h-4" />} label="Rüstungsklasse" value="—" />
              <StatBadge
                icon={<Zap className="w-4 h-4" />}
                label="Initiative"
                value={d ? (d.initiative >= 0 ? `+${d.initiative}` : d.initiative) : '—'}
              />
              <StatBadge icon={<ChevronUp className="w-4 h-4" />} label="Bewegung" value={d ? `${d.speed} ft` : '—'} />
              <StatBadge
                icon={<Star className="w-4 h-4" />}
                label="Übungsbonus"
                value={d ? `+${d.proficiency_bonus}` : `+${Math.ceil(character.level / 4) + 1}`}
              />
            </div>
          </div>

          {d?.inspiration && (
            <div className="flex items-center justify-center gap-2 py-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm text-amber-300 font-semibold">Inspiration aktiv</span>
            </div>
          )}

          {character.dnd_beyond_url && (
            <a
              href={character.dnd_beyond_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-bold transition-colors"
              style={{ background: 'linear-gradient(135deg, #3a0d00, #5c1a05)', borderColor: '#c84b11', color: '#f5deb3' }}
            >
              <ExternalLink className="w-4 h-4" />
              Vollständigen Charakterbogen auf DnD Beyond öffnen
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── Edit / Create mode with full data display after fetch ──────────────────
  return (
    <div className="space-y-4">
      {/* Edit form */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
        <h3 className="text-base font-semibold text-zinc-100">
          {character ? 'Charakter bearbeiten' : '⚔️ Charakter verlinken'}
        </h3>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">DnD Beyond URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.dnd_beyond_url}
              onChange={(e) => setForm((f) => ({ ...f, dnd_beyond_url: e.target.value }))}
              placeholder="https://www.dndbeyond.com/characters/12345678"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleFetchFromUrl}
              disabled={fetching || !form.dnd_beyond_url}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {fetching ? 'Lädt...' : 'Laden'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            URL einfügen und „Laden" klicken — Daten werden automatisch ausgefüllt.
          </p>
          {fetchError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {fetchError}
              <span className="text-zinc-500"> — bitte manuell ausfüllen.</span>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-xs text-zinc-500">Oder manuell ausfüllen:</p>
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
                placeholder="z.B. Wizard 5"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Level *</label>
              <input
                type="number" min={1} max={20}
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
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
            className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            {saving ? 'Speichert...' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {/* DnD Beyond preview after successful fetch */}
      {fetchedData && (
        <div className="rounded-xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
          <div
            className="relative px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-3xl flex-shrink-0">
                ⚔️
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-[#f5deb3] truncate">{fetchedData.character_name}</h2>
                <p className="text-sm text-[#c84b11] font-semibold">{fetchedData.class_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-[#a0785a]">Level {fetchedData.level}</span>
                  {fetchedData.race && <span className="text-xs text-[#a0785a]">· {fetchedData.race}</span>}
                  {fetchedData.background && <span className="text-xs text-[#a0785a]">· {fetchedData.background}</span>}
                  {fetchedData.alignment && <span className="text-xs text-[#a0785a]">· {fetchedData.alignment}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0600] p-4 space-y-4">
            {/* Ability scores */}
            {Object.keys(fetchedData.stats).length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#c84b11] uppercase tracking-widest mb-2">Eigenschaften</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {STAT_ORDER.map((stat) => (
                    <StatBox key={stat} stat={stat} value={fetchedData.stats[stat] ?? 10} />
                  ))}
                </div>
              </div>
            )}

            {/* Combat stats */}
            <div>
              <p className="text-xs font-bold text-[#c84b11] uppercase tracking-widest mb-2">Kampfwerte</p>
              <div className="flex gap-2 flex-wrap justify-center">
                <StatBadge icon={<Heart className="w-4 h-4" />} label="Trefferpunkte" value={fetchedData.max_hp} />
                <StatBadge icon={<Shield className="w-4 h-4" />} label="Rüstungsklasse" value="—" />
                <StatBadge
                  icon={<Zap className="w-4 h-4" />}
                  label="Initiative"
                  value={fetchedData.initiative >= 0 ? `+${fetchedData.initiative}` : fetchedData.initiative}
                />
                <StatBadge icon={<ChevronUp className="w-4 h-4" />} label="Bewegung" value={`${fetchedData.speed} ft`} />
                <StatBadge
                  icon={<Star className="w-4 h-4" />}
                  label="Übungsbonus"
                  value={`+${fetchedData.proficiency_bonus}`}
                />
              </div>
            </div>

            {fetchedData.inspiration && (
              <div className="flex items-center justify-center gap-2 py-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm text-amber-300 font-semibold">Inspiration</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
