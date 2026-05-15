'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Edit2, Search, Loader2, AlertCircle, Shield, Heart, Zap, Star, ChevronUp, Sword, Backpack, BookOpen, Languages as LangIcon, Wrench, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink as CharacterLinkType, User } from '@/types'

interface CharacterLinkProps {
  character: CharacterLinkType | null
  currentUser: User
  onSaved?: (character: CharacterLinkType) => void
}

export interface CharacterSkill {
  key: string
  name: string
  nameDe: string
  ability: string
  proficient: boolean
  expertise: boolean
  halfProficient: boolean
  bonus: number
}

export interface CharacterSave {
  ability: string
  proficient: boolean
  bonus: number
}

export interface CharacterWeapon {
  name: string
  damage: string
  damageType: string
  properties: string[]
  attackBonus: number
  damageBonus: number
  range: number | null
  longRange: number | null
  equipped: boolean
}

export interface CharacterArmor {
  name: string
  type: string
  armorClass: number | null
  equipped: boolean
}

export interface CharacterSpell {
  name: string
  level: number
  school: string
}

export interface CharacterData {
  character_name: string
  class_name: string
  level: number
  race: string
  background: string
  alignment: string
  avatar_url: string | null
  stats: Record<string, number>
  max_hp: number
  armor_class: number
  proficiency_bonus: number
  speed: number
  initiative: number
  inspiration: boolean
  skills: CharacterSkill[]
  saves: CharacterSave[]
  armor: CharacterArmor[]
  weapons: CharacterWeapon[]
  tools: string[]
  languages: string[]
  spells: CharacterSpell[]
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
function fmtBonus(n: number): string { return n >= 0 ? `+${n}` : `${n}` }

const SPELL_SCHOOLS: Record<string, string> = {
  Abjuration: 'Abjuration', Conjuration: 'Beschwörung', Divination: 'Wahrsagung',
  Enchantment: 'Verzauberung', Evocation: 'Hervorrufung', Illusion: 'Illusion',
  Necromancy: 'Nekromantie', Transmutation: 'Verwandlung',
}

function StatBox({ stat, value }: { stat: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-lg py-2 px-1 min-w-[60px]" title={STAT_LABELS[stat]}>
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[#c84b11]">{icon}</div>
        <p className="text-xs font-bold text-[#c84b11] uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}

function CharacterSheet({ data }: { data: CharacterData }) {
  return (
    <div className="bg-[#0f0600] p-4 space-y-5">
      {/* Eigenschaften */}
      <Section icon={<Star className="w-3.5 h-3.5" />} title="Eigenschaften">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {STAT_ORDER.map((stat) => (
            <StatBox key={stat} stat={stat} value={data.stats[stat] ?? 10} />
          ))}
        </div>
      </Section>

      {/* Kampfwerte */}
      <Section icon={<Sword className="w-3.5 h-3.5" />} title="Kampfwerte">
        <div className="flex gap-2 flex-wrap justify-center">
          <StatBadge icon={<Heart className="w-4 h-4" />} label="Trefferpunkte" value={data.max_hp} />
          <StatBadge icon={<Shield className="w-4 h-4" />} label="Rüstungsklasse" value={data.armor_class} />
          <StatBadge icon={<Zap className="w-4 h-4" />} label="Initiative" value={fmtBonus(data.initiative)} />
          <StatBadge icon={<ChevronUp className="w-4 h-4" />} label="Bewegung" value={`${data.speed} ft`} />
          <StatBadge icon={<Star className="w-4 h-4" />} label="Übungsbonus" value={`+${data.proficiency_bonus}`} />
        </div>
        {data.inspiration && (
          <div className="flex items-center justify-center gap-2 py-1 mt-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm text-amber-300 font-semibold">Inspiration aktiv</span>
          </div>
        )}
      </Section>

      {/* Rettungswürfe + Skills nebeneinander */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={<Shield className="w-3.5 h-3.5" />} title="Rettungswürfe">
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg divide-y divide-[#8b2a0a]/30">
            {data.saves.map((s) => (
              <div key={s.ability} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className={`w-3 h-3 rounded-full border ${s.proficient ? 'bg-[#c84b11] border-[#c84b11]' : 'border-[#8b2a0a]/60'}`} />
                <span className="text-[#a0785a] flex-1 text-xs">{STAT_LABELS[s.ability]}</span>
                <span className="font-bold text-[#f5deb3] tabular-nums">{fmtBonus(s.bonus)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<BookOpen className="w-3.5 h-3.5" />} title="Fertigkeiten">
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg divide-y divide-[#8b2a0a]/30 max-h-96 overflow-y-auto">
            {data.skills.map((s) => (
              <div key={s.key} className="flex items-center gap-2 px-3 py-1 text-sm">
                <span
                  className={`w-3 h-3 rounded-full border ${
                    s.expertise
                      ? 'bg-amber-400 border-amber-400 ring-1 ring-amber-300'
                      : s.proficient
                        ? 'bg-[#c84b11] border-[#c84b11]'
                        : s.halfProficient
                          ? 'bg-[#c84b11]/40 border-[#c84b11]/60'
                          : 'border-[#8b2a0a]/60'
                  }`}
                  title={s.expertise ? 'Expertise' : s.proficient ? 'Geübt' : s.halfProficient ? 'Halb geübt' : 'Nicht geübt'}
                />
                <span className="text-[10px] text-[#a0785a] w-7">{s.ability}</span>
                <span className="text-[#f5deb3] flex-1 text-xs">{s.nameDe}</span>
                <span className="font-bold text-[#f5deb3] tabular-nums text-sm">{fmtBonus(s.bonus)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Waffen */}
      {data.weapons.length > 0 && (
        <Section icon={<Sword className="w-3.5 h-3.5" />} title="Waffen">
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#2a0e02] text-[#c84b11]">
                <tr>
                  <th className="text-left px-3 py-1.5 font-semibold">Name</th>
                  <th className="text-center px-2 py-1.5 font-semibold">Atk</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Schaden</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Eigenschaften</th>
                </tr>
              </thead>
              <tbody>
                {data.weapons.map((w, i) => (
                  <tr key={i} className={`border-t border-[#8b2a0a]/30 ${w.equipped ? 'bg-[#3a0d00]/30' : 'opacity-70'}`}>
                    <td className="px-3 py-1.5 text-[#f5deb3] font-medium">
                      {w.equipped && <span className="text-amber-400 mr-1" title="Ausgerüstet">●</span>}
                      {w.name}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-[#f5deb3] tabular-nums">{fmtBonus(w.attackBonus)}</td>
                    <td className="px-2 py-1.5 text-[#f5deb3]">
                      {w.damage}{w.damageBonus !== 0 ? fmtBonus(w.damageBonus) : ''} <span className="text-[#a0785a]">{w.damageType}</span>
                    </td>
                    <td className="px-2 py-1.5 text-[#a0785a]">
                      {w.properties.slice(0, 3).join(', ')}{w.properties.length > 3 ? '…' : ''}
                      {w.range && <span className="ml-1">{w.range}{w.longRange ? `/${w.longRange}` : ''}ft</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Rüstung */}
      {data.armor.length > 0 && (
        <Section icon={<Shield className="w-3.5 h-3.5" />} title="Rüstung & Schild">
          <div className="flex flex-wrap gap-2">
            {data.armor.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                  a.equipped
                    ? 'bg-[#3a0d00]/40 border-[#c84b11]/60 text-[#f5deb3]'
                    : 'bg-[#1a0a02] border-[#8b2a0a]/40 text-[#a0785a]'
                }`}
              >
                {a.equipped && <span className="text-amber-400">●</span>}
                <Shield className="w-3.5 h-3.5 opacity-60" />
                <span className="font-medium">{a.name}</span>
                {a.armorClass != null && <span className="text-[10px] opacity-70">RK {a.armorClass}</span>}
                <span className="text-[10px] opacity-60">{a.type}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tools + Sprachen nebeneinander */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.tools.length > 0 && (
          <Section icon={<Wrench className="w-3.5 h-3.5" />} title="Werkzeuge & Übungen">
            <div className="flex flex-wrap gap-1.5">
              {data.tools.map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{t}</span>
              ))}
            </div>
          </Section>
        )}

        {data.languages.length > 0 && (
          <Section icon={<LangIcon className="w-3.5 h-3.5" />} title="Sprachen">
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((l, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{l}</span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Zauber (klein, da Liste lang sein kann) */}
      {data.spells.length > 0 && (
        <Section icon={<Sparkles className="w-3.5 h-3.5" />} title={`Zauber (${data.spells.length})`}>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg p-2 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {data.spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded bg-[#2a0e02] border border-[#8b2a0a]/40 text-[#f5deb3]"
                  title={SPELL_SCHOOLS[s.school] ?? s.school}
                >
                  <span className="text-[#c84b11] font-bold mr-1">G{s.level}</span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Inventar-Backpack (other items, klein) */}
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
  const [form, setForm] = useState({
    dnd_beyond_url: character?.dnd_beyond_url ?? '',
    character_name: character?.character_name ?? '',
    class_name: character?.class_name ?? '',
    level: character?.level ?? 1,
  })
  const supabase = createClient()

  // Auto-fetch + persist full_data
  useEffect(() => {
    if (character?.dnd_beyond_url && !editing) {
      setAutoLoading(true)
      fetch(`/api/dnd-character?url=${encodeURIComponent(character.dnd_beyond_url)}`)
        .then((r) => r.json())
        .then(async (data) => {
          if (!data.error) {
            setFetchedData(data as CharacterData)
            // Cache full_data for use by dice/page (Würfel-Vorschläge)
            if (character.id) {
              await supabase
                .from('character_links')
                .update({ full_data: data, updated_at: new Date().toISOString() })
                .eq('id', character.id)
            }
          }
        })
        .catch(() => {})
        .finally(() => setAutoLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.dnd_beyond_url, editing])

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

    const payload = {
      user_id: currentUser.id,
      ...form,
      full_data: fetchedData ?? undefined,
    }
    let result

    if (character?.id) {
      result = await supabase
        .from('character_links')
        .update({ ...form, full_data: fetchedData ?? null, updated_at: new Date().toISOString() })
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
        {/* Header */}
        <div
          className="relative px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
          <div className="flex items-center gap-4">
            {d?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.avatar_url}
                alt={character.character_name}
                className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0 shadow-lg shadow-black/50"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-4xl flex-shrink-0 shadow-lg shadow-black/50">
                ⚔️
              </div>
            )}
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

        {/* Body */}
        {autoLoading && (
          <div className="bg-[#0f0600] py-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-[#c84b11] animate-spin" />
            <span className="text-xs text-[#a0785a]">Charakterdaten werden geladen…</span>
          </div>
        )}

        {d ? <CharacterSheet data={d} /> : (
          !autoLoading && (
            <div className="bg-[#0f0600] p-4 text-center">
              <p className="text-xs text-[#5a3a22]">DnD Beyond nicht erreichbar — bitte Charakter neu laden.</p>
            </div>
          )
        )}

        {character.dnd_beyond_url && (
          <div className="bg-[#0f0600] px-4 pb-4">
            <a
              href={character.dnd_beyond_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-bold transition-colors"
              style={{ background: 'linear-gradient(135deg, #3a0d00, #5c1a05)', borderColor: '#c84b11', color: '#f5deb3' }}
            >
              <ExternalLink className="w-4 h-4" />
              Auf DnD Beyond öffnen
            </a>
          </div>
        )}
      </div>
    )
  }

  // ── Edit / Create mode ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
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
            URL einfügen und „Laden" — Daten werden automatisch ausgefüllt.
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

      {/* Live-Preview nach erfolgreichem Fetch */}
      {fetchedData && (
        <div className="rounded-xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
          <div
            className="relative px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
            <div className="flex items-center gap-4">
              {fetchedData.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fetchedData.avatar_url}
                  alt={fetchedData.character_name}
                  className="w-16 h-16 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-3xl flex-shrink-0">
                  ⚔️
                </div>
              )}
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
          <CharacterSheet data={fetchedData} />
        </div>
      )}
    </div>
  )
}
