'use client'

import { useState, useEffect } from 'react'
import {
  ExternalLink, Edit2, Search, Loader2, AlertCircle,
  Shield, Heart, Zap, Star, ChevronUp, Sword, BookOpen,
  Sparkles, Package, Scroll, User, Coins, ChevronDown, ChevronRight,
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
  name: string; level: number; school: string; attackType?: number | null
  alwaysPrepared?: boolean; prepared?: boolean
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
  spells: CharacterSpell[]
  spell_slots: Record<string, { used: number; available: number }>
  spellcasting_ability?: string
  spell_attack_bonus?: number
  spell_save_dc?: number
  features: CharacterFeature[]; inventory_items: InventoryItem[]
  currencies: { cp: number; sp: number; ep: number; gp: number; pp: number }
  character_notes: { personalityTraits: string; ideals: string; bonds: string; flaws: string; backstory: string; appearance: string }
}

const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_LABELS: Record<string, string> = {
  STR: 'Stärke', DEX: 'Geschick.', CON: 'Konst.', INT: 'Intell.', WIS: 'Weisheit', CHA: 'Charisma',
}
const SPELL_SCHOOLS: Record<string, string> = {
  Abjuration: 'Bannm.', Conjuration: 'Beschw.', Divination: 'Wahrs.',
  Enchantment: 'Verzaub.', Evocation: 'Hervorr.', Illusion: 'Illus.',
  Necromancy: 'Nekrom.', Transmutation: 'Verwand.', Universal: 'Univ.',
}
const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: 'text-blue-400 bg-blue-900/30 border-blue-700/40',
  Conjuration: 'text-amber-400 bg-amber-900/30 border-amber-700/40',
  Divination: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40',
  Enchantment: 'text-pink-400 bg-pink-900/30 border-pink-700/40',
  Evocation: 'text-red-400 bg-red-900/30 border-red-700/40',
  Illusion: 'text-violet-400 bg-violet-900/30 border-violet-700/40',
  Necromancy: 'text-green-400 bg-green-900/30 border-green-700/40',
  Transmutation: 'text-orange-400 bg-orange-900/30 border-orange-700/40',
}

function statMod(val: number): number { return Math.floor((val - 10) / 2) }
function fmtB(n: number): string { return n >= 0 ? `+${n}` : `${n}` }
function fmtMod(val: number): string { const m = statMod(val); return m >= 0 ? `+${m}` : `${m}` }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ stat, value }: { stat: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a0a02] border border-[#8b2a0a]/60 rounded-xl py-2 px-1 min-w-[56px]">
      <span className="text-[9px] font-bold text-[#c84b11] uppercase tracking-wider">{stat}</span>
      <span className="text-xl font-black text-[#f5deb3] leading-none my-1">{fmtMod(value)}</span>
      <div className="w-8 h-px bg-[#8b2a0a]/40 my-0.5" />
      <span className="text-sm font-bold text-[#a0785a]">{value}</span>
    </div>
  )
}

function Badge({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl border py-2 px-2.5 min-w-[56px] gap-0.5 ${accent ? 'bg-[#2a0e02] border-[#c84b11]/70' : 'bg-[#1a0a02] border-[#8b2a0a]/50'}`}>
      <div className={accent ? 'text-amber-400' : 'text-[#c84b11]'}>{icon}</div>
      <span className="text-base font-black text-[#f5deb3] leading-none">{value}</span>
      <span className="text-[9px] text-[#a0785a] text-center leading-tight">{label}</span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1.5">{children}</p>
  )
}

function CollapseSection({ title, icon, children, defaultOpen = false, badge }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 mb-1 group">
        {open ? <ChevronDown className="w-3 h-3 text-[#c84b11]/60" /> : <ChevronRight className="w-3 h-3 text-[#c84b11]/60" />}
        {icon && <div className="text-[#c84b11]">{icon}</div>}
        <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-widest flex-1 text-left">{title}</p>
        {badge != null && <span className="text-[9px] text-[#a0785a] bg-[#1a0a02] border border-[#8b2a0a]/30 px-1 rounded">{badge}</span>}
      </button>
      {open && <div className="mb-1">{children}</div>}
    </div>
  )
}

// ── Tab: Actions (DnD Beyond style) ──────────────────────────────────────────
function ActionsTab({ data }: { data: CharacterData }) {
  const equippedWeapons = data.weapons.filter((w) => w.equipped || w.isCustom)
  const spellAttacks = data.spells.filter((s) => s.attackType != null && s.attackType > 0 && (s.level === 0 || s.prepared || s.alwaysPrepared))

  return (
    <div className="space-y-4">
      {equippedWeapons.length === 0 && spellAttacks.length === 0 && (
        <p className="text-xs text-zinc-600 italic text-center py-8">Keine Aktionen gefunden.</p>
      )}

      {/* Weapon table — identical to DnD Beyond's layout */}
      {equippedWeapons.length > 0 && (
        <div>
          <SectionHeader>Angriffe</SectionHeader>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#2a0e02] border-b border-[#8b2a0a]/30">
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Waffe</th>
                  <th className="text-center px-2 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Treffer</th>
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Schaden / Art</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8b2a0a]/15">
                {equippedWeapons.map((w, i) => (
                  <tr key={i} className="hover:bg-[#2a0e02]/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-bold text-[#f5deb3]">{w.name}</div>
                      {w.range && (
                        <div className="text-[10px] text-[#a0785a]">{w.range}{w.longRange ? `/${w.longRange}` : ''} ft</div>
                      )}
                      {w.properties.length > 0 && (
                        <div className="text-[10px] text-[#a0785a]/70 hidden md:block">{w.properties.slice(0,4).join(', ')}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="font-black text-[#f5deb3] text-sm tabular-nums">{fmtB(w.attackBonus)}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-bold text-[#f5deb3]">{w.damage}</span>
                      {w.damageBonus !== 0 && <span className="font-bold text-[#f5deb3]">{fmtB(w.damageBonus)}</span>}
                      {w.damageType && <span className="text-[#a0785a] ml-1 capitalize">{w.damageType}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Spell attacks */}
      {spellAttacks.length > 0 && (
        <CollapseSection title="Zauberangriffe" icon={<Sparkles className="w-3 h-3" />} defaultOpen badge={spellAttacks.length}>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#2a0e02] border-b border-[#8b2a0a]/30">
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Zauber</th>
                  <th className="text-center px-2 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Grad</th>
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#c84b11] uppercase tracking-wide">Schule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8b2a0a]/15">
                {spellAttacks.map((s, i) => (
                  <tr key={i} className="hover:bg-[#2a0e02]/40">
                    <td className="px-3 py-1.5 font-bold text-[#f5deb3]">{s.name}</td>
                    <td className="px-2 py-1.5 text-center text-[#a0785a]">{s.level === 0 ? 'Cantrip' : `${s.level}.`}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SCHOOL_COLORS[s.school] ?? 'text-[#a0785a] bg-[#1a0a02] border-[#8b2a0a]/30'}`}>
                        {SPELL_SCHOOLS[s.school] ?? s.school}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapseSection>
      )}

      {/* Non-equipped weapons */}
      {data.weapons.filter((w) => !w.equipped && !w.isCustom).length > 0 && (
        <CollapseSection title="Nicht ausgerüstet" icon={<Sword className="w-3 h-3" />} badge={data.weapons.filter(w => !w.equipped && !w.isCustom).length}>
          <div className="flex flex-wrap gap-1.5">
            {data.weapons.filter((w) => !w.equipped && !w.isCustom).map((w, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/30 text-[#a0785a]">
                {w.name} {w.damage ? `(${w.damage})` : ''}
              </span>
            ))}
          </div>
        </CollapseSection>
      )}
    </div>
  )
}

// ── Tab: Spells (DnD Beyond style) ────────────────────────────────────────────
function SpellsTab({ data }: { data: CharacterData }) {
  const [showSpellbook, setShowSpellbook] = useState(false)
  const spellAtkBonus = data.spell_attack_bonus
  const spellDC = data.spell_save_dc
  const scAbility = data.spellcasting_ability ?? 'INT'

  // Separate cantrips, prepared, and unprepared
  const cantrips = data.spells.filter((s) => s.level === 0)
  const leveledPrepared = data.spells.filter((s) => s.level > 0 && (s.prepared || s.alwaysPrepared))
  const leveledUnprepared = data.spells.filter((s) => s.level > 0 && !s.prepared && !s.alwaysPrepared)

  // Group prepared spells by level
  const byLevel = leveledPrepared.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    ;(acc[s.level] = acc[s.level] ?? []).push(s); return acc
  }, {})
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  // If no prepared flag data at all, fall back to showing all (non-preparation casters like Sorcerer)
  const hasPreparationData = data.spells.some(s => s.level > 0 && (s.prepared || s.alwaysPrepared))
  const allLeveled = data.spells.filter(s => s.level > 0)
  const byLevelAll = allLeveled.reduce<Record<number, CharacterSpell[]>>((acc, s) => {
    ;(acc[s.level] = acc[s.level] ?? []).push(s); return acc
  }, {})
  const levelsAll = Object.keys(byLevelAll).map(Number).sort((a, b) => a - b)

  const usePrep = hasPreparationData

  return (
    <div className="space-y-3">
      {/* Spellcasting header */}
      {(spellAtkBonus != null || spellDC != null) && (
        <div className="flex gap-2 flex-wrap">
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-[9px] text-[#c84b11] font-bold uppercase tracking-widest">Zauberangriff</p>
            <p className="text-xl font-black text-[#f5deb3]">{fmtB(spellAtkBonus ?? 0)}</p>
          </div>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-[9px] text-[#c84b11] font-bold uppercase tracking-widest">Zauber-SG</p>
            <p className="text-xl font-black text-[#f5deb3]">{spellDC ?? '—'}</p>
          </div>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-[9px] text-[#c84b11] font-bold uppercase tracking-widest">Zauberattrib.</p>
            <p className="text-xl font-black text-[#f5deb3]">{scAbility}</p>
          </div>
        </div>
      )}

      {data.spells.length === 0 && (
        <p className="text-xs text-zinc-600 italic text-center py-8">Keine Zauber gefunden.</p>
      )}

      {/* Cantrips */}
      {cantrips.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider mb-1.5">Cantrips</p>
          <div className="flex flex-wrap gap-1.5">
            {cantrips.sort((a,b)=>a.name.localeCompare(b.name)).map((s, i) => (
              <SpellChip key={i} spell={s} />
            ))}
          </div>
        </div>
      )}

      {/* Prepared / Known leveled spells */}
      {(usePrep ? levels : levelsAll).map((lvl) => {
        const lvlSpells = (usePrep ? byLevel[lvl] : byLevelAll[lvl]) ?? []
        const slot = data.spell_slots?.[`${lvl}`]
        return (
          <div key={lvl}>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <p className="text-[10px] font-bold text-[#c84b11] uppercase tracking-wider">{lvl}. Grad</p>
              {slot && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#a0785a]">Slots:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: slot.available }, (_, si) => (
                      <div key={si} className={`w-3 h-3 rounded-full border ${si < (slot.available - slot.used) ? 'bg-[#c84b11] border-[#c84b11]' : 'bg-transparent border-[#8b2a0a]/60'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#a0785a]">{slot.available - slot.used}/{slot.available}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lvlSpells.sort((a,b)=>a.name.localeCompare(b.name)).map((s, i) => (
                <SpellChip key={i} spell={s} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Spellbook (unprepared) — collapsible */}
      {usePrep && leveledUnprepared.length > 0 && (
        <div className="border-t border-[#8b2a0a]/20 pt-2">
          <button
            onClick={() => setShowSpellbook(!showSpellbook)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#a0785a] uppercase tracking-wider hover:text-[#c84b11] transition-colors"
          >
            {showSpellbook ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Zauberbuch ({leveledUnprepared.length} nicht vorbereitet)
          </button>
          {showSpellbook && (
            <div className="mt-2 flex flex-wrap gap-1.5 opacity-60">
              {leveledUnprepared.sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name)).map((s, i) => (
                <SpellChip key={i} spell={s} dim />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SpellChip({ spell, dim }: { spell: CharacterSpell; dim?: boolean }) {
  const schoolStyle = SCHOOL_COLORS[spell.school] ?? 'text-[#a0785a] bg-[#1a0a02] border-[#8b2a0a]/30'
  return (
    <span className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded border ${dim ? 'opacity-50' : ''} ${spell.alwaysPrepared ? 'bg-amber-900/20 border-amber-600/30 text-amber-200' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#f5deb3]'}`}>
      <span className={`text-[9px] font-bold px-1 rounded border ${schoolStyle}`}>{(spell.school ?? '').slice(0,2).toUpperCase()}</span>
      {spell.name}
      {spell.attackType != null && spell.attackType > 0 && <span className="text-[#c84b11]">⚡</span>}
      {spell.alwaysPrepared && <span className="text-amber-400 text-[9px]">★</span>}
    </span>
  )
}

// ── Tab: Inventory (DnD Beyond style) ────────────────────────────────────────
function InventoryTab({ data }: { data: CharacterData }) {
  const { currencies } = data
  const totalGp = (currencies.pp * 10) + currencies.gp + (currencies.ep / 2) + (currencies.sp / 10) + (currencies.cp / 100)

  return (
    <div className="space-y-4">
      {/* Currency */}
      <div>
        <SectionHeader>Münzen</SectionHeader>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { label: 'CP', val: currencies.cp, color: 'text-orange-300' },
            { label: 'SP', val: currencies.sp, color: 'text-zinc-300' },
            { label: 'EP', val: currencies.ep, color: 'text-zinc-400' },
            { label: 'GP', val: currencies.gp, color: 'text-amber-300' },
            { label: 'PP', val: currencies.pp, color: 'text-violet-300' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl py-2 text-center">
              <span className={`text-sm font-black ${color}`}>{val}</span>
              <p className="text-[9px] text-[#a0785a]">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#a0785a] mt-1 text-right">≈ {totalGp.toFixed(1)} GP gesamt</p>
      </div>

      {/* Equipment */}
      {data.armor.length > 0 && (
        <div>
          <SectionHeader>Rüstung & Schild</SectionHeader>
          <div className="space-y-1">
            {data.armor.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${a.equipped ? 'bg-[#2a0e02] border-[#c84b11]/40 text-[#f5deb3]' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#a0785a]'}`}>
                {a.equipped && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                <Shield className="w-3 h-3 opacity-50 flex-shrink-0" />
                <span className="font-medium flex-1">{a.name}</span>
                {a.armorClass != null && <span className="text-[#a0785a] text-[10px]">RK {a.armorClass}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.weapons.length > 0 && (
        <div>
          <SectionHeader>Waffen</SectionHeader>
          <div className="space-y-1">
            {data.weapons.map((w, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${w.equipped ? 'bg-[#2a0e02] border-[#c84b11]/40 text-[#f5deb3]' : 'bg-[#1a0a02] border-[#8b2a0a]/30 text-[#a0785a]'}`}>
                {w.equipped && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                <Sword className="w-3 h-3 opacity-50 flex-shrink-0" />
                <span className="font-medium flex-1">{w.name}</span>
                {w.damage && <span className="text-[10px] text-[#a0785a]">{w.damage}{w.damageBonus ? fmtB(w.damageBonus) : ''}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other items */}
      {data.inventory_items.length > 0 && (
        <CollapseSection title={`Sonstiges (${data.inventory_items.length})`} icon={<Package className="w-3 h-3" />} defaultOpen>
          <div className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-xl divide-y divide-[#8b2a0a]/20">
            {data.inventory_items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                {it.equipped && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                <span className="text-[#f5deb3] flex-1">
                  {it.quantity > 1 && <span className="text-amber-400 mr-1 font-bold">{it.quantity}×</span>}
                  {it.name}
                </span>
                <span className="text-[#a0785a] text-[10px]">{it.type}</span>
              </div>
            ))}
          </div>
        </CollapseSection>
      )}
    </div>
  )
}

// ── Tab: Features ─────────────────────────────────────────────────────────────
function FeaturesTab({ data }: { data: CharacterData }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  if (data.features.length === 0) return <p className="text-xs text-zinc-600 italic text-center py-8">Keine Features gefunden.</p>

  const grouped = data.features.reduce<Record<string, CharacterFeature[]>>((acc, f) => {
    ;(acc[f.source] = acc[f.source] ?? []).push(f); return acc
  }, {})

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([source, feats]) => (
        <div key={source}>
          <SectionHeader>{source}</SectionHeader>
          <div className="space-y-1">
            {feats.map((f, i) => {
              const globalIdx = data.features.indexOf(f)
              return (
                <div key={i} className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenIdx(openIdx === globalIdx ? null : globalIdx)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#2a0e02]/60"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#f5deb3]">{f.name}</span>
                      {f.level && <span className="text-[10px] text-[#a0785a]">Lv.{f.level}</span>}
                    </div>
                    {openIdx === globalIdx
                      ? <ChevronDown className="w-3 h-3 text-[#c84b11]/60 flex-shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-[#c84b11]/60 flex-shrink-0" />}
                  </button>
                  {openIdx === globalIdx && f.description && (
                    <div className="px-3 pb-2 border-t border-[#8b2a0a]/20">
                      <p className="text-[11px] text-[#a0785a] mt-1.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: f.description.replace(/<[^>]*>/g, ' ').slice(0, 800) + (f.description.length > 800 ? '…' : '') }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
    { label: 'Erscheinung',             value: n.appearance,        icon: '👁️' },
  ]
  return (
    <div className="space-y-3">
      {data.background && (
        <div className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl p-3">
          <SectionHeader>Hintergrund</SectionHeader>
          <p className="text-sm font-bold text-[#f5deb3]">{data.background}</p>
          {data.background_feature && (
            <p className="text-[11px] text-[#a0785a] mt-1 leading-relaxed">{data.background_feature.replace(/<[^>]*>/g, '')}</p>
          )}
        </div>
      )}
      {fields.filter((f) => f.value?.trim()).map((f) => (
        <div key={f.label} className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-xl p-3">
          <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1">{f.icon} {f.label}</p>
          <p className="text-xs text-[#f5deb3] leading-relaxed whitespace-pre-wrap">{f.value}</p>
        </div>
      ))}
      {fields.every((f) => !f.value?.trim()) && !data.background && (
        <p className="text-xs text-zinc-600 italic text-center py-8">Kein Hintergrund eingetragen.</p>
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
        <div className="bg-[#1a0a02] border border-[#8b2a0a]/30 rounded-xl p-3">
          <SectionHeader>📖 Hintergrundgeschichte</SectionHeader>
          <p className="text-xs text-[#f5deb3] leading-relaxed whitespace-pre-wrap">{backstory}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic text-center py-8">Keine Notizen auf DnD Beyond.</p>
      )}
    </div>
  )
}

// ── Tab: Extras ───────────────────────────────────────────────────────────────
function ExtrasTab({ data }: { data: CharacterData }) {
  return (
    <div className="space-y-4">
      {/* Passive stats */}
      <div>
        <SectionHeader>Passive Werte</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Passive Wahrnehmung', val: data.passive_perception },
            { label: 'Passive Nachforschung', val: data.passive_investigation },
            { label: 'Passive Einsicht', val: data.passive_insight },
          ].map(({ label, val }) => (
            <div key={label} className="bg-[#1a0a02] border border-[#8b2a0a]/40 rounded-xl p-2 text-center">
              <p className="text-sm font-black text-[#f5deb3]">{val}</p>
              <p className="text-[9px] text-[#a0785a] leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Senses */}
      {data.darkvision > 0 && (
        <div>
          <SectionHeader>Sinne</SectionHeader>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">
            👁 Dunkelsicht {data.darkvision} ft
          </span>
        </div>
      )}

      {/* Tools + Languages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.tools.length > 0 && (
          <div>
            <SectionHeader>Werkzeugkenntnisse</SectionHeader>
            <div className="flex flex-wrap gap-1.5">
              {data.tools.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{t}</span>
              ))}
            </div>
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <SectionHeader>Sprachen</SectionHeader>
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((l, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/40 text-[#f5deb3]">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Proficiencies */}
      <div>
        <SectionHeader>Übungsbonus: {fmtB(data.proficiency_bonus)}</SectionHeader>
        <div className="grid grid-cols-2 gap-1.5">
          {data.saves.filter(s => s.proficient).map(s => (
            <span key={s.ability} className="text-[11px] px-2 py-0.5 rounded bg-[#1a0a02] border border-[#8b2a0a]/30 text-[#f5deb3]">
              ● {s.ability} Rettungswurf
            </span>
          ))}
        </div>
      </div>
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

  // Hit dice string (e.g. "7d6 + 8d8")
  // We don't have per-class info here, just show total level
  const hpPercent = data.max_hp > 0 ? Math.round((data.current_hp / data.max_hp) * 100) : 0
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="bg-[#0f0600]">
      {/* ── Ability Scores ── */}
      <div className="px-3 pt-3 pb-2 border-b border-[#8b2a0a]/30">
        <div className="grid grid-cols-6 gap-1.5">
          {STAT_ORDER.map((stat) => <StatBox key={stat} stat={stat} value={data.stats[stat] ?? 10} />)}
        </div>
      </div>

      {/* ── Combat row ── */}
      <div className="px-3 py-3 border-b border-[#8b2a0a]/30">
        {/* HP bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest">Trefferpunkte</span>
            <span className="text-xs font-black text-[#f5deb3] tabular-nums">
              {data.current_hp} / {data.max_hp}
              {data.current_hp < data.max_hp && <span className="text-[#c84b11] ml-1">(-{data.max_hp - data.current_hp})</span>}
            </span>
          </div>
          <div className="h-2 bg-[#1a0a02] rounded-full overflow-hidden border border-[#8b2a0a]/30">
            <div className={`h-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
          </div>
        </div>

        {/* Combat badges */}
        <div className="flex gap-1.5 flex-wrap">
          <Badge icon={<Shield className="w-3.5 h-3.5" />}    label="RK" value={data.armor_class} accent />
          <Badge icon={<Zap className="w-3.5 h-3.5" />}       label="Initiative" value={fmtB(data.initiative)} />
          <Badge icon={<ChevronUp className="w-3.5 h-3.5" />} label="Bewegung" value={`${data.speed}ft`} />
          <Badge icon={<Star className="w-3.5 h-3.5" />}      label="Übungsb." value={fmtB(data.proficiency_bonus)} />
          {data.inspiration && (
            <Badge icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />} label="Inspiration" value="✓" accent />
          )}
        </div>
      </div>

      {/* ── Saves + Skills ── */}
      <div className="grid grid-cols-2 border-b border-[#8b2a0a]/30">
        {/* Saving Throws */}
        <div className="px-3 py-2.5 border-r border-[#8b2a0a]/20">
          <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1.5">Rettungswürfe</p>
          <div className="space-y-0.5">
            {data.saves.map((s) => (
              <div key={s.ability} className="flex items-center gap-1.5 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${s.proficient ? 'bg-[#c84b11] border-[#c84b11]' : 'border-[#8b2a0a]/60'}`} />
                <span className="text-[#a0785a] text-[10px] w-6 font-medium">{s.ability}</span>
                <span className="font-black text-[#f5deb3] tabular-nums text-[11px]">{fmtB(s.bonus)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="px-3 py-2.5">
          <p className="text-[9px] font-bold text-[#c84b11] uppercase tracking-widest mb-1.5">Fertigkeiten</p>
          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
            {data.skills.map((s) => (
              <div key={s.key} className="flex items-center gap-1 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${s.expertise ? 'bg-amber-400 border-amber-400' : s.proficient ? 'bg-[#c84b11] border-[#c84b11]' : s.halfProficient ? 'bg-[#c84b11]/40 border-[#c84b11]/60' : 'border-[#8b2a0a]/60'}`} />
                <span className="text-[#a0785a] text-[9px] w-5 flex-shrink-0">{s.ability}</span>
                <span className="text-[#f5deb3] text-[10px] flex-1 truncate">{s.nameDe}</span>
                <span className="font-black text-[#f5deb3] tabular-nums text-[11px]">{fmtB(s.bonus)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-[#8b2a0a]/30 overflow-x-auto bg-[#0a0400]">
        <div className="flex min-w-max">
          {SHEET_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-[#f5deb3] border-b-2 border-[#c84b11] bg-[#0f0600]'
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
  const [editing, setEditing]       = useState(!character)
  const [saving, setSaving]         = useState(false)
  const [fetching, setFetching]     = useState(false)
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

  if (!editing && character) {
    const d = fetchedData
    return (
      <div className="rounded-2xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="relative px-5 py-4" style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c84b11] to-transparent" />
          <div className="flex items-center gap-4">
            {d?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatar_url} alt={character.character_name}
                className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0 shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-4xl flex-shrink-0">⚔️</div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-[#f5deb3] leading-tight truncate">{character.character_name}</h2>
              <p className="text-sm text-[#c84b11] font-bold mt-0.5">{character.class_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#a0785a]">
                <span>Level {character.level}</span>
                {d?.race && <><span>·</span><span>{d.race}</span></>}
                {d?.background && <><span>·</span><span>{d.background}</span></>}
                {d?.alignment && <><span>·</span><span>{d.alignment}</span></>}
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
            <div className="bg-[#0f0600] p-6 text-center">
              <p className="text-xs text-[#5a3a22]">DnD Beyond nicht erreichbar.</p>
            </div>
          )
        )}

        {character.dnd_beyond_url && (
          <div className="bg-[#0f0600] px-4 pb-4">
            <a href={character.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-bold transition-colors mt-2"
              style={{ background: 'linear-gradient(135deg, #3a0d00, #5c1a05)', borderColor: '#c84b11', color: '#f5deb3' }}>
              <ExternalLink className="w-4 h-4" /> Auf DnD Beyond öffnen
            </a>
          </div>
        )}
      </div>
    )
  }

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
            <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800">
              Abbrechen
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !form.character_name || !form.class_name}
            className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold">
            {saving ? 'Speichert...' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {fetchedData && (
        <div className="rounded-2xl overflow-hidden border border-[#8b2a0a]/50 shadow-2xl shadow-black/60">
          <div className="relative px-5 py-3" style={{ background: 'linear-gradient(135deg, #3a0d00 0%, #5c1a05 50%, #3a0d00 100%)' }}>
            <div className="flex items-center gap-3">
              {fetchedData.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={fetchedData.avatar_url} alt={fetchedData.character_name} className="w-14 h-14 rounded-full border-2 border-[#c84b11]/70 object-cover flex-shrink-0" />
                : <div className="w-14 h-14 rounded-full border-2 border-[#c84b11]/70 bg-[#2a0e02] flex items-center justify-center text-3xl flex-shrink-0">⚔️</div>}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-[#f5deb3] truncate">{fetchedData.character_name}</h2>
                <p className="text-sm text-[#c84b11] font-semibold">{fetchedData.class_name} · Level {fetchedData.level}</p>
              </div>
            </div>
          </div>
          <CharacterSheet data={fetchedData} />
        </div>
      )}
    </div>
  )
}
