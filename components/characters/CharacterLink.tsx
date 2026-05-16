'use client'

import { useState, useEffect } from 'react'
import {
  ExternalLink, Edit2, Search, Loader2, AlertCircle,
  Shield, Heart, Zap, Star, ChevronUp, Sword, BookOpen,
  Languages as LangIcon, Wrench, Sparkles, Package,
  Scroll, User, Coins, ChevronDown, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink as CharacterLinkType, User as AppUser } from '@/types'

interface CharacterLinkProps {
  character: CharacterLinkType | null
  currentUser: AppUser
  onSaved?: (character: CharacterLinkType) => void
}

export interface CharacterSkill {
  key: string; name: string; nameDe: string; ability: string
  proficient: boolean; expertise: boolean; halfProficient: boolean; bonus: number
}
export interface CharacterSave  { ability: string; proficient: boolean; bonus: number }
export interface CharacterWeapon {
  name: string; damage: string; damageType: string; properties: string[]
  attackBonus: number; damageBonus: number; range: number | null; longRange: number | null; equipped: boolean
  isCustom?: boolean
}
export interface CharacterArmor {
  name: string; type: string; armorTypeId: number; armorClass: number | null; equipped: boolean
}
export interface CharacterSpell {
  name: string; level: number; school: string; attackType?: number | null; alwaysPrepared?: boolean
}
export interface CharacterFeature {
  name: string; source: string; description: string; level?: number
}
export interface InventoryItem { name: string; type: string; quantity: number; weight: number; equipped: boolean }

export interface CharacterData {
  character_name: string; class_name: string; level: number; race: string
  background: string; background_feature: string; alignment: string; avatar_url: string | null
  stats: Record<string, number>
  max_hp: number; current_hp: number; armor_class: number; proficiency_bonus: number
  speed: number; initiative: number; inspiration: boolean
  passive_perception: number; passive_investigation: number; passive_insight: number
  darkvision: number
  skills: CharacterSkill[]; saves: CharacterSave[]
  armor: CharacterArmor[]; weapons: CharacterWeapon[]; tools: string[]; languages: string[]
  spells: CharacterSpell[]; spell_slots: Record<string, { used: number; available: number }>
  features: CharacterFeature[]; inventory_items: InventoryItem[]
  currencies: { cp: number; sp: number; ep: number; gp: number; pp: number }
  character_notes: { personalityTraits: string; ideals: string; bonds: string; flaws: string; backstory: string; appearance: string }
}

const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_LABELS: Record<string, string> = {
  STR: 'Stärke', DEX: 'Geschicklichkeit', CON: 'Konstitution',
  INT: 'Intelligenz', WIS: 'Weisheit', CHA: 'Charisma',
}
const SPELL_SCHOOLS: Record<string, string> = {
  Abjuration: 'Bannmagie', Conjuration: 'Beschwörung', Divination: 'Wahrsagung',
  Enchantment: 'Verzauberung', Evocation: 'Hervorrufung', Illusion: 'Illusion',
  Necromancy: 'Nekromantie', Transmutation: 'Verwandlung', Universal: 'Universal',
}
const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: 'text-blue-300', Conjuration: 'text-amber-300', Divination: 'text-cyan-300',
  Enchantment: 'text-pink-300', Evocation: 'text-red-300', Illusion: 'text-violet-300',
  Necromancy: 'text-green-300', Transmutation: 'text-orange-300',
}

function statMod(val: number): string { const m = Math.floor((val - 10) / 2); return m >= 0 ? `+${m}` : `${m}` }
function fmtB(n: number): string { return n >= 0 ? `+${n}` : `${n}` }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ stat, value }: { stat: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-lg py-2 px-1 min-w-[58px]" title={STAT_LABELS[stat]}>
      <span className="text-[9px] font-bold text-[#c84b11] uppercase tracking-wider mb-1">{stat}</span>
      <span className="text-lg font-black text-[#f5deb3]">{statMod(value)}</span>
      <span className="text-[11px] text-[#a0785a] mt-0.5">{value}</span>
    </div>
  )
}

function CombatBadge({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string | number; small?: boolean }) {
  return (
    <div className={`flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-lg gap-0.5 ${small ? 'py-1.5 px-2 min-w-[56px]' : 'py-2 px-3 min-w-[64px]'}`}>
      <div className="text-[#c84b11]">{icon}</div>
      <span className={`font-black text-[#f5deb3] ${small ? 'text-base' : 'text-lg'}`}>{value}</span>
      <span className="text-[9px] text-[#a0785a] text-center leading-tight">{label}</span>
    </div>
  )
}

function CollapseSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="text-[#c84b11]">{icon}</div>
        <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-widest flex-1 text-left">{title}</p>
        {open ? <ChevronDown className="w-3 h-3 text-[#c84b11]/60" /> : <ChevronRight className="w-3 h-3 text-[#c84b11]/60" />}
      </button>
      {open && <div className="mb-2">{children}</div>}
    </div>
  )
}

// ── Tab: Actions ──────────────────────────────────────────────────────────────
function ActionsTab({ data }: { data: CharacterData }) {
  const equippedWeapons = data.weapons.filter((w) => w.equipped || w.isCustom)
  const spellAttacks = data.spells.filter((s) => s.attackType != null && s.attackType > 0)
  const spellAttackBonus = (data.saves.find((s) => s.ability === 'INT')?.bonus ?? 0) - data.proficiency_bonus +
    data.proficiency_bonus * 2  // rough: prof + primary spellcasting modifier

  return (
    <div className="space-y-3">
      {equippedWeapons.length === 0 && spellAttacks.length === 0 && (
        <p className="text-xs text-zinc-600 italic text-center py-6">Keine Aktionen / Angriffe gefunden.</p>
      )}

      {/* Weapon Attacks */}
      {equippedWeapons.length > 0 && (
        <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#2a0e02]">
              <tr className="text-[#c84b11]">
                <th className="text-left px-3 py-1.5 font-semibold">ANGRIFF</th>
                <th className="text-center px-2 py-1.5 font-semibold">TREFFER</th>
                <th className="text-left px-2 py-1.5 font-semibold">SCHADEN</th>
                <th className="text-left px-2 py-1.5 font-semibold hidden md:table-cell">EIGENSCHAFTEN</th>
              </tr>
            </thead>
            <tbody>
              {equippedWeapons.map((w, i) => (
                <tr key={i} className="border-t border-[#8b2a0a]/20 hover:bg-[#2a0e02]/40">
                  <td className="px-3 py-2 text-[#f5deb3] font-medium">
                    <div className="flex items-center gap-1">
                      {w.equipped && !w.isCustom && <span className="text-amber-400 text-[10px]">●</span>}
                      <span>{w.name}</span>
                    </div>
                    {w.range && (
                      <div className="text-[10px] text-[#a0785a] mt-0.5">
                        {w.range}{w.longRange ? `/${w.longRange}` : ''} ft.
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-[#f5deb3] tabular-nums">{fmtB(w.attackBonus)}</td>
                  <td className="px-2 py-2 text-[#f5deb3]">
                    <span>{w.damage}</span>
                    {w.damageBonus !== 0 && <span>{fmtB(w.damageBonus)}</span>}
                    {w.damageType && <span className="text-[#a0785a] ml-1 text-[10px]">{w.damageType}</span>}
                  </td>
                  <td className="px-2 py-2 text-[#a0785a] hidden md:table-cell text-[10px]">
                    {w.properties.slice(0, 4).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spell Attacks (cantrips/spells with attack roll) */}
      {spellAttacks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Zauberangriffe</p>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#2a0e02]">
                <tr className="text-[#c84b11]">
                  <th className="text-left px-3 py-1.5 font-semibold">ZAUBER</th>
                  <th className="text-center px-2 py-1.5 font-semibold">GRAD</th>
                  <th className="text-left px-2 py-1.5 font-semibold hidden md:table-cell">SCHULE</th>
                </tr>
              </thead>
              <tbody>
                {spellAttacks.map((s, i) => (
                  <tr key={i} className="border-t border-[#8b2a0a]/20 hover:bg-[#2a0e02]/40">
                    <td className="px-3 py-1.5 text-[#f5deb3] font-medium">{s.name}</td>
                    <td className="px-2 py-1.5 text-center text-[#a0785a]">{s.level === 0 ? 'Cantrip' : `${s.level}.`}</td>
                    <td className="px-2 py-1.5 hidden md:table-cell">
                      <span className={`text-[10px] ${SCHOOL_COLORS[s.school] ?? 'text-[#a0785a]'}`}>
                        {SPELL_SCHOOLS[s.school] ?? s.school}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All non-equipped weapons */}
      {data.weapons.filter((w) => !w.equipped && !w.isCustom).length > 0 && (
        <CollapseSection title="Nicht ausgerüstete Waffen" icon={<Sword className="w-3 h-3" />}>
          <div className="flex flex-wrap gap-1.5">
            {data.weapons.filter((w) => !w.equipped && !w.isCustom).map((w, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/30 text-[#a0785a]">
                {w.name} {w.damage && `(${w.damage})`}
              </span>
            ))}
          </div>
        </CollapseSection>
      )}
    </div>
  )
}

// ── Tab: Spells ───────────────────────────────────────────────────────────────
function SpellsTab({ data }: { data: CharacterData }) {
  const byLevel = data.spells.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    ;(acc[s.level] = acc[s.level] ?? []).push(s); return acc
  }, {})
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-3">
      {levels.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-6">Keine Zauber gefunden.</p>}
      {levels.map((lvl) => {
        const slot = data.spell_slots?.[`${lvl}`]
        return (
          <div key={lvl}>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider">
                {lvl === 0 ? 'Cantrips' : `${lvl}. Grad`}
              </p>
              {slot && (
                <span className="text-[10px] text-[#a0785a] bg-[#1a0a02] border border-[#8b2a0a]/30 px-1.5 py-0.5 rounded">
                  Slots: {slot.available - slot.used}/{slot.available}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(byLevel[lvl] ?? []).sort((a, b) => a.name.localeCompare(b.name)).map((s, i) => (
                <span
                  key={i}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    s.alwaysPrepared
                      ? 'bg-amber-900/20 border-amber-600/30 text-amber-200'
                      : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#f5deb3]'
                  }`}
                  title={SPELL_SCHOOLS[s.school] ?? s.school}
                >
                  <span className={`font-bold mr-1 ${SCHOOL_COLORS[s.school] ?? 'text-[#c84b11]'}`}>
                    {(s.school ?? '').slice(0, 2).toUpperCase()}
                  </span>
                  {s.name}
                  {s.attackType != null && s.attackType > 0 && <span className="ml-1 text-[#c84b11]">⚡</span>}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Inventory ────────────────────────────────────────────────────────────
function InventoryTab({ data }: { data: CharacterData }) {
  const { currencies } = data

  const totalGp =
    (currencies.pp * 10) + currencies.gp + (currencies.ep / 2) + (currencies.sp / 10) + (currencies.cp / 100)

  return (
    <div className="space-y-4">
      {/* Currencies */}
      <div>
        <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Münzen</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'PP', val: currencies.pp, color: 'text-zinc-300' },
            { label: 'GP', val: currencies.gp, color: 'text-amber-300' },
            { label: 'EP', val: currencies.ep, color: 'text-zinc-400' },
            { label: 'SP', val: currencies.sp, color: 'text-zinc-300' },
            { label: 'CP', val: currencies.cp, color: 'text-orange-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg px-3 py-1.5 min-w-[44px]">
              <span className={`text-sm font-black ${color}`}>{val}</span>
              <span className="text-[9px] text-[#a0785a]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[10px] text-[#a0785a] self-end pb-1">
            ≈ {totalGp.toFixed(1)} GP
          </div>
        </div>
      </div>

      {/* Armor */}
      {data.armor.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Rüstung & Schild</p>
          <div className="space-y-1">
            {data.armor.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${a.equipped ? 'bg-[#3a0d00]/40 border-[#c84b11]/50 text-[#f5deb3]' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#a0785a]'}`}>
                {a.equipped && <span className="text-amber-400 text-[10px]">●</span>}
                <Shield className="w-3 h-3 opacity-60" />
                <span className="font-medium">{a.name}</span>
                {a.armorClass != null && <span className="ml-auto text-[10px] opacity-60">RK {a.armorClass}</span>}
                <span className="text-[10px] opacity-50">{a.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weapons */}
      {data.weapons.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Waffen</p>
          <div className="space-y-1">
            {data.weapons.map((w, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${w.equipped ? 'bg-[#3a0d00]/40 border-[#c84b11]/50 text-[#f5deb3]' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#a0785a]'}`}>
                {w.equipped && <span className="text-amber-400 text-[10px]">●</span>}
                <Sword className="w-3 h-3 opacity-60" />
                <span className="font-medium">{w.name}</span>
                {w.damage && <span className="ml-auto text-[10px] opacity-60">{w.damage}{w.damageBonus ? fmtB(w.damageBonus) : ''}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other items */}
      {data.inventory_items.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Sonstiges ({data.inventory_items.length})</p>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-lg divide-y divide-[#8b2a0a]/20">
            {data.inventory_items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <span className="text-[#f5deb3] flex-1">{it.quantity > 1 && <span className="text-amber-400 mr-1">{it.quantity}×</span>}{it.name}</span>
                <span className="text-[#a0785a] text-[10px]">{it.type}</span>
                {it.equipped && <span className="text-amber-400 text-[10px]">●</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Features & Traits ────────────────────────────────────────────────────
function FeaturesTab({ data }: { data: CharacterData }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const grouped = data.features.reduce<Record<string, CharacterFeature[]>>((acc, f) => {
    ;(acc[f.source] = acc[f.source] ?? []).push(f); return acc
  }, {})

  if (data.features.length === 0) {
    return <p className="text-xs text-zinc-600 italic text-center py-6">Keine Features gefunden.</p>
  }

  const allFeats = data.features
  return (
    <div className="space-y-1">
      {allFeats.map((f, i) => (
        <div key={i} className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#2a0e02]/60"
          >
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#f5deb3]">{f.name}</span>
              <span className="ml-2 text-[10px] text-[#c84b11] opacity-70">{f.source}</span>
              {f.level && <span className="ml-1 text-[10px] text-[#a0785a]">Lv.{f.level}</span>}
            </div>
            {openIdx === i ? <ChevronDown className="w-3 h-3 text-[#c84b11]/60 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#c84b11]/60 flex-shrink-0" />}
          </button>
          {openIdx === i && f.description && (
            <div className="px-3 pb-2 border-t border-[#8b2a0a]/20">
              <p className="text-[11px] text-[#a0785a] mt-1.5 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: f.description.replace(/<[^>]*>/g, ' ').slice(0, 800) + (f.description.length > 800 ? '…' : '') }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tab: Background ───────────────────────────────────────────────────────────
function BackgroundTab({ data }: { data: CharacterData }) {
  const n = data.character_notes
  const fields = [
    { label: 'Persönlichkeitsmerkmale', value: n.personalityTraits, icon: '💬' },
    { label: 'Ideale',                  value: n.ideals,            icon: '🌟' },
    { label: 'Bindungen',               value: n.bonds,             icon: '🔗' },
    { label: 'Makel',                   value: n.flaws,             icon: '⚠️' },
    { label: 'Aussehen',                value: n.appearance,        icon: '👁️' },
  ]
  return (
    <div className="space-y-3">
      {data.background && (
        <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg p-3">
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1">Hintergrund</p>
          <p className="text-sm font-bold text-[#f5deb3]">{data.background}</p>
          {data.background_feature && (
            <p className="text-[11px] text-[#a0785a] mt-1 leading-relaxed">{data.background_feature.replace(/<[^>]*>/g, '')}</p>
          )}
        </div>
      )}
      {fields.filter((f) => f.value?.trim()).map((f) => (
        <div key={f.label} className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-lg p-3">
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1">{f.icon} {f.label}</p>
          <p className="text-xs text-[#f5deb3] leading-relaxed whitespace-pre-wrap">{f.value}</p>
        </div>
      ))}
      {fields.every((f) => !f.value?.trim()) && !data.background && (
        <p className="text-xs text-zinc-600 italic text-center py-6">Kein Hintergrund hinterlegt.</p>
      )}
    </div>
  )
}

// ── Tab: Notes ────────────────────────────────────────────────────────────────
function NotesTab({ data }: { data: CharacterData }) {
  const backstory = data.character_notes.backstory?.replace(/<[^>]*>/g, '').trim()
  return (
    <div className="space-y-3">
      {backstory ? (
        <div className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-lg p-3">
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">📖 Hintergrundgeschichte</p>
          <p className="text-xs text-[#f5deb3] leading-relaxed whitespace-pre-wrap">{backstory}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic text-center py-6">Keine Notizen auf DnD Beyond hinterlegt.</p>
      )}
    </div>
  )
}

// ── Tab: Extras ───────────────────────────────────────────────────────────────
function ExtrasTab({ data }: { data: CharacterData }) {
  return (
    <div className="space-y-3">
      {/* Passive Stats */}
      <div>
        <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Passive Werte</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Wahrnehmung', val: data.passive_perception },
            { label: 'Nachforschung', val: data.passive_investigation },
            { label: 'Einsicht', val: data.passive_insight },
          ].map(({ label, val }) => (
            <div key={label} className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-lg p-2 text-center">
              <p className="text-sm font-black text-[#f5deb3]">{val}</p>
              <p className="text-[9px] text-[#a0785a] leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Senses */}
      {data.darkvision > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Sinne</p>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">
              👁 Dunkelsicht {data.darkvision} ft.
            </span>
          </div>
        </div>
      )}

      {/* Tools & Languages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.tools.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Werkzeuge</p>
            <div className="flex flex-wrap gap-1.5">
              {data.tools.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{t}</span>
              ))}
            </div>
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Sprachen</p>
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((l, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Armor summary */}
      {data.armor.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Rüstungsprofil</p>
          <div className="flex flex-wrap gap-1.5">
            {data.armor.map((a, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded border ${a.equipped ? 'bg-[#3a0d00]/30 border-[#c84b11]/40 text-[#f5deb3]' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#a0785a]'}`}>
                {a.equipped && '● '}{a.name} {a.armorClass ? `(RK ${a.armorClass})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Full Character Sheet ───────────────────────────────────────────────────────
type SheetTab = 'actions' | 'spells' | 'inventory' | 'features' | 'background' | 'notes' | 'extras'

const SHEET_TABS: { key: SheetTab; label: string }[] = [
  { key: 'actions',    label: 'Aktionen'   },
  { key: 'spells',     label: 'Zauber'     },
  { key: 'inventory',  label: 'Inventar'   },
  { key: 'features',   label: 'Features'   },
  { key: 'background', label: 'Hintergrund'},
  { key: 'notes',      label: 'Notizen'    },
  { key: 'extras',     label: 'Extras'     },
]

function CharacterSheet({ data }: { data: CharacterData }) {
  const [activeTab, setActiveTab] = useState<SheetTab>('actions')

  return (
    <div className="bg-[#0f0600]">
      {/* ── Ability Scores + Combat Stats ── */}
      <div className="px-4 pt-4 pb-2 space-y-3 border-b border-[#8b2a0a]/30">
        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((stat) => <StatBox key={stat} stat={stat} value={data.stats[stat] ?? 10} />)}
        </div>

        {/* Combat Stats Row */}
        <div className="flex gap-2 flex-wrap">
          <CombatBadge icon={<Heart className="w-3.5 h-3.5" />}    label="TP" value={`${data.current_hp}/${data.max_hp}`} />
          <CombatBadge icon={<Shield className="w-3.5 h-3.5" />}   label="Rüstungsklasse" value={data.armor_class} />
          <CombatBadge icon={<Zap className="w-3.5 h-3.5" />}      label="Initiative" value={fmtB(data.initiative)} />
          <CombatBadge icon={<ChevronUp className="w-3.5 h-3.5" />} label="Bewegung" value={`${data.speed}ft`} small />
          <CombatBadge icon={<Star className="w-3.5 h-3.5" />}     label="Übungsbonus" value={fmtB(data.proficiency_bonus)} small />
          {data.inspiration && (
            <CombatBadge icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />} label="Inspiration" value="✓" small />
          )}
        </div>

        {/* Left quick-ref row: Saves + Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
          {/* Saving Throws */}
          <div>
            <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1">Rettungswürfe</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {data.saves.map((s) => (
                <div key={s.ability} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${s.proficient ? 'bg-[#c84b11] border-[#c84b11]' : 'border-[#8b2a0a]/60'}`} />
                  <span className="text-[#a0785a] text-[10px] w-6">{s.ability}</span>
                  <span className="font-bold text-[#f5deb3] tabular-nums text-[11px]">{fmtB(s.bonus)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills (scrollable compact) */}
          <div>
            <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1">Fertigkeiten</p>
            <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1 custom-scroll">
              {data.skills.map((s) => (
                <div key={s.key} className="flex items-center gap-1 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${s.expertise ? 'bg-amber-400 border-amber-400' : s.proficient ? 'bg-[#c84b11] border-[#c84b11]' : s.halfProficient ? 'bg-[#c84b11]/40 border-[#c84b11]/60' : 'border-[#8b2a0a]/60'}`} />
                  <span className="text-[#a0785a] text-[9px] w-6 flex-shrink-0">{s.ability}</span>
                  <span className="text-[#f5deb3] text-[10px] flex-1 truncate">{s.nameDe}</span>
                  <span className="font-bold text-[#f5deb3] tabular-nums text-[11px]">{fmtB(s.bonus)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-[#8b2a0a]/30 overflow-x-auto">
        <div className="flex min-w-max">
          {SHEET_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-[#f5deb3] border-b-2 border-[#c84b11]'
                  : 'text-[#a0785a] hover:text-[#f5deb3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-4 min-h-[200px]">
        {activeTab === 'actions'    && <ActionsTab    data={data} />}
        {activeTab === 'spells'     && <SpellsTab     data={data} />}
        {activeTab === 'inventory'  && <InventoryTab  data={data} />}
        {activeTab === 'features'   && <FeaturesTab   data={data} />}
        {activeTab === 'background' && <BackgroundTab data={data} />}
        {activeTab === 'notes'      && <NotesTab      data={data} />}
        {activeTab === 'extras'     && <ExtrasTab     data={data} />}
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function CharacterLinkCard({ character, currentUser, onSaved }: CharacterLinkProps) {
  const [editing, setEditing]     = useState(!character)
  const [saving, setSaving]       = useState(false)
  const [fetching, setFetching]   = useState(false)
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

  // Auto-fetch + cache full_data
  useEffect(() => {
    if (character?.dnd_beyond_url && !editing) {
      setAutoLoading(true)
      fetch(`/api/dnd-character?url=${encodeURIComponent(character.dnd_beyond_url)}`)
        .then((r) => r.json())
        .then(async (data) => {
          if (!data.error) {
            setFetchedData(data as CharacterData)
            if (character.id) {
              await supabase.from('character_links')
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
    setFetching(true); setFetchError(''); setFetchedData(null)
    try {
      const res = await fetch(`/api/dnd-character?url=${encodeURIComponent(form.dnd_beyond_url)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setFetchError(data.error ?? 'Charakter konnte nicht geladen werden.')
      } else {
        setFetchedData(data as CharacterData)
        setForm((f) => ({ ...f, character_name: data.character_name, class_name: data.class_name, level: data.level }))
        setFetchError('')
      }
    } catch { setFetchError('Netzwerkfehler.') }
    finally { setFetching(false) }
  }

  const handleSave = async () => {
    if (!form.character_name || !form.class_name) return
    setSaving(true)
    const payload = { user_id: currentUser.id, ...form, full_data: fetchedData ?? undefined }
    let result
    if (character?.id) {
      result = await supabase.from('character_links')
        .update({ ...form, full_data: fetchedData ?? null, updated_at: new Date().toISOString() })
        .eq('id', character.id).select().single()
    } else {
      result = await supabase.from('character_links').insert(payload).select().single()
    }
    setSaving(false)
    if (result.data) { onSaved?.(result.data); setEditing(false) }
  }

  // ── Display mode ──────────────────────────────────────────────────────────
  if (!editing && character) {
    const d = fetchedData
    return (
      <div className="rounded-xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="relative px-5 py-4" style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
          <div className="flex items-center gap-4">
            {d?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatar_url} alt={character.character_name}
                className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0 shadow-lg shadow-black/50" />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-4xl flex-shrink-0">⚔️</div>
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
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-[#a0785a] hover:text-[#f5deb3] hover:bg-[#1a0a02]/60 transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

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
            <a href={character.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-bold transition-colors"
              style={{ background: 'linear-gradient(135deg, #3a0d00, #5c1a05)', borderColor: '#c84b11', color: '#f5deb3' }}>
              <ExternalLink className="w-4 h-4" /> Auf DnD Beyond öffnen
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
        <h3 className="text-base font-semibold text-zinc-100">{character ? 'Charakter bearbeiten' : '⚔️ Charakter verlinken'}</h3>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">DnD Beyond URL</label>
          <div className="flex gap-2">
            <input type="url" value={form.dnd_beyond_url}
              onChange={(e) => setForm((f) => ({ ...f, dnd_beyond_url: e.target.value }))}
              placeholder="https://www.dndbeyond.com/characters/12345678"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
            <button onClick={handleFetchFromUrl} disabled={fetching || !form.dnd_beyond_url}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium flex-shrink-0">
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {fetching ? 'Lädt...' : 'Laden'}
            </button>
          </div>
          {fetchError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fetchError}
              <span className="text-zinc-500"> — bitte manuell ausfüllen.</span>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-xs text-zinc-500">Oder manuell ausfüllen:</p>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Charaktername *</label>
            <input type="text" value={form.character_name} onChange={(e) => setForm((f) => ({ ...f, character_name: e.target.value }))}
              placeholder="z.B. Thordak der Weise"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Klasse *</label>
              <input type="text" value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                placeholder="z.B. Wizard 15"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Level *</label>
              <input type="number" min={1} max={20} value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          {character && (
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800">Abbrechen</button>
          )}
          <button onClick={handleSave} disabled={saving || !form.character_name || !form.class_name}
            className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold">
            {saving ? 'Speichert...' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {fetchedData && (
        <div className="rounded-xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
          <div className="relative px-5 py-4" style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
            <div className="flex items-center gap-4">
              {fetchedData.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fetchedData.avatar_url} alt={fetchedData.character_name}
                  className="w-16 h-16 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-3xl flex-shrink-0">⚔️</div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-[#f5deb3] truncate">{fetchedData.character_name}</h2>
                <p className="text-sm text-[#c84b11] font-semibold">{fetchedData.class_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-[#a0785a]">Level {fetchedData.level}</span>
                  {fetchedData.race && <span className="text-xs text-[#a0785a]">· {fetchedData.race}</span>}
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
