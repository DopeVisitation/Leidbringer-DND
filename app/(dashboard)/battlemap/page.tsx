'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Map, Plus, Trash2, X, Settings, Eye, EyeOff, Sword, Shield, Heart, Zap,
  Edit2, Save, Bookmark, BookmarkCheck, SlidersHorizontal, ChevronDown, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BattleMap {
  id: string
  name: string
  image_url: string | null
  grid_cols: number
  grid_rows: number
  cell_size: number
  is_active: boolean
  created_by: string
  grid_opacity: number
  grid_offset_x: number
  grid_offset_y: number
}

interface FavoriteAction {
  name: string
  attack_bonus: number
  damage_bonus: number
  dice_config: DiceConfig[]
}

interface DiceConfig {
  type: string
  count: number
  damageType?: string
}

interface BattleToken {
  id: string
  map_id: string
  token_type: 'player' | 'monster' | 'npc'
  name: string
  icon: string
  col: number
  row: number
  max_hp: number | null
  current_hp: number | null
  armor_class: number | null
  speed: number | null
  initiative: number | null
  challenge_rating: string | null
  conditions: string[]
  notes: string | null
  stats: Record<string, number> | null
  is_hidden: boolean
  favorite_actions: FavoriteAction[]
  player_user_id: string | null
}

interface DiceFavorite {
  id: string
  name: string
  attack_bonus: number
  damage_bonus: number
  dice_config: DiceConfig[]
  damage_dice?: string | null
  damage_type?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_ICONS = [
  // Helden & Klassen
  '🧙','🏹','⚔️','🛡️','🗡️','🔮','🪄','📿','🎲','🦝',
  // Humanoide Monster
  '👹','👺','💀','🧟','🧛','👻','🤡','😱','🧌','👿',
  // Kreaturen
  '🐉','🐲','🦅','🐺','🦁','🐗','🐻','🐍','🕷️','🦂',
  '🐊','🦎','🦕','🐙','🦑','🦈','🐝','🦟','🦋','🦚',
  // Magische Wesen
  '🦄','🧚','🧝','🧞','🧜','🧟','🌋','👁️','🔥','❄️',
  // Drachen
  '🖤','🔴','🟢','🔵','⚪','🟡','🟤','🟣','🟠','🟥',
  // Untote
  '💀','👻','🦴','🕸️','🪦','⚰️','🧿','🪬','🌑','🌚',
  // NPC / Bandit
  '🗡️','🎩','🥷','🤴','👸','🧓','👴','👳','🎭','🃏',
  // Gegenstände & Spezial
  '🏰','🗺️','💎','🗝️','📜','⚗️','🧪','🎯','🌋','🏔️',
  '🪄','💫','⭐','🌙','☀️','⚡','🌊','🌿','🍄','🌸',
]

interface ConditionDef {
  id: string
  icon: string
  color: string
  bg: string
  border: string
}

const CONDITIONS: ConditionDef[] = [
  { id: 'Vergiftet',       icon: '☠️', color: 'text-green-400',   bg: 'bg-green-900/30',   border: 'border-green-700/40'  },
  { id: 'Betäubt',         icon: '💫', color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-700/40' },
  { id: 'Erschöpft',       icon: '😴', color: 'text-slate-400',   bg: 'bg-slate-900/30',   border: 'border-slate-700/40'  },
  { id: 'Verängstigt',     icon: '😱', color: 'text-pink-400',    bg: 'bg-pink-900/30',    border: 'border-pink-700/40'   },
  { id: 'Entzaubert',      icon: '🔕', color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/40'   },
  { id: 'Fixiert',         icon: '⚓', color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-700/40' },
  { id: 'Gelähmt',         icon: '🔒', color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-700/40'    },
  { id: 'Niedergeschlagen',icon: '⬇️', color: 'text-zinc-400',   bg: 'bg-zinc-800/50',    border: 'border-zinc-600/40'   },
  { id: 'Unsichtbar',      icon: '👻', color: 'text-violet-400',  bg: 'bg-violet-900/30',  border: 'border-violet-700/40' },
  { id: 'Versteint',       icon: '🪨', color: 'text-stone-400',   bg: 'bg-stone-900/30',   border: 'border-stone-700/40'  },
  { id: 'Geblendet',       icon: '🕶️', color: 'text-amber-400',   bg: 'bg-amber-900/30',   border: 'border-amber-700/40'  },
  { id: 'Betört',          icon: '💗', color: 'text-rose-400',    bg: 'bg-rose-900/30',    border: 'border-rose-700/40'   },
  { id: 'Taub',            icon: '🔇', color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-700/40'   },
]

// Pre-seeded monster templates
interface MonsterTemplate {
  name: string; icon: string; cr: string; max_hp: number
  armor_class: number; speed: number; stats: Record<string, number>; notes: string
}

const MONSTER_TEMPLATES: MonsterTemplate[] = [
  { name: 'Goblin',              icon: '👺', cr: '1/4',  max_hp: 7,   armor_class: 15, speed: 30, stats: {str:8,dex:14,con:10,int:10,wis:8,cha:8},    notes: 'Nimble Escape' },
  { name: 'Kobold',              icon: '🦎', cr: '1/8',  max_hp: 5,   armor_class: 12, speed: 30, stats: {str:7,dex:15,con:9,int:8,wis:7,cha:8},     notes: 'Pack Tactics' },
  { name: 'Skelett',             icon: '💀', cr: '1/4',  max_hp: 13,  armor_class: 13, speed: 30, stats: {str:10,dex:14,con:15,int:6,wis:8,cha:5},   notes: 'Imm: Gift; Res: Piercing' },
  { name: 'Zombie',              icon: '🧟', cr: '1/4',  max_hp: 22,  armor_class: 8,  speed: 20, stats: {str:13,dex:6,con:16,int:3,wis:6,cha:5},    notes: 'Undead Fortitude' },
  { name: 'Orc',                 icon: '👹', cr: '1/2',  max_hp: 15,  armor_class: 13, speed: 30, stats: {str:16,dex:12,con:16,int:7,wis:11,cha:10},  notes: 'Aggressive' },
  { name: 'Hobgoblin',           icon: '⚔️', cr: '1/2',  max_hp: 11,  armor_class: 18, speed: 30, stats: {str:13,dex:12,con:12,int:10,wis:10,cha:9},  notes: 'Martial Advantage' },
  { name: 'Gnoll',               icon: '🐺', cr: '1/2',  max_hp: 22,  armor_class: 15, speed: 30, stats: {str:14,dex:12,con:11,int:6,wis:10,cha:7},   notes: 'Rampage' },
  { name: 'Bugbear',             icon: '🐻', cr: '1',    max_hp: 27,  armor_class: 16, speed: 30, stats: {str:15,dex:14,con:13,int:8,wis:11,cha:9},   notes: 'Brute, Überraschungsangriff' },
  { name: 'Ghoul',               icon: '😱', cr: '1',    max_hp: 22,  armor_class: 12, speed: 30, stats: {str:13,dex:15,con:10,int:7,wis:10,cha:6},   notes: 'Claw: Lähmung' },
  { name: 'Ogre',                icon: '🦣', cr: '2',    max_hp: 59,  armor_class: 11, speed: 40, stats: {str:19,dex:8,con:16,int:5,wis:7,cha:7},    notes: 'Large; Keule 2d8+4' },
  { name: 'Bandit',              icon: '🗡️', cr: '1/8',  max_hp: 11,  armor_class: 12, speed: 30, stats: {str:11,dex:12,con:12,int:10,wis:10,cha:10},  notes: '' },
  { name: 'Bandit Captain',      icon: '🎩', cr: '2',    max_hp: 65,  armor_class: 15, speed: 30, stats: {str:15,dex:16,con:14,int:14,wis:11,cha:14},  notes: 'Mehrfachangriff, Parieren' },
  { name: 'Drow',                icon: '🌑', cr: '1/4',  max_hp: 13,  armor_class: 15, speed: 30, stats: {str:10,dex:14,con:10,int:11,wis:11,cha:12},  notes: 'Feyzauber, Sonnenphobie' },
  { name: 'Vampir Spawn',        icon: '🧛', cr: '5',    max_hp: 82,  armor_class: 15, speed: 30, stats: {str:16,dex:16,con:16,int:11,wis:10,cha:12},  notes: 'Regeneration 10' },
  { name: 'Troll',               icon: '🦴', cr: '5',    max_hp: 84,  armor_class: 15, speed: 30, stats: {str:18,dex:13,con:20,int:7,wis:9,cha:7},   notes: 'Regeneration 10 (Feuer/Säure)' },
  { name: 'Wyvern',              icon: '🐉', cr: '6',    max_hp: 110, armor_class: 13, speed: 20, stats: {str:19,dex:10,con:16,int:5,wis:12,cha:6},   notes: 'Fliegen 80, Giftstachel' },
  { name: 'Manticore',           icon: '🦁', cr: '3',    max_hp: 68,  armor_class: 14, speed: 30, stats: {str:17,dex:16,con:17,int:7,wis:12,cha:8},   notes: 'Fliegen 50, Schwanzstacheln' },
  { name: 'Minotaurus',          icon: '🐂', cr: '3',    max_hp: 114, armor_class: 14, speed: 40, stats: {str:18,dex:11,con:16,int:6,wis:16,cha:9},   notes: 'Charge, Gore' },
  { name: 'Hydra',               icon: '🐍', cr: '8',    max_hp: 172, armor_class: 15, speed: 30, stats: {str:20,dex:12,con:20,int:2,wis:10,cha:7},   notes: 'Fünf Köpfe, Regeneration' },
  { name: 'Mind Flayer',         icon: '🧠', cr: '7',    max_hp: 71,  armor_class: 15, speed: 30, stats: {str:11,dex:12,con:12,int:19,wis:17,cha:17},  notes: 'Psionischer Blitz, Gedankenverschlingen' },
  { name: 'Schwarzdrache (juv.)',icon: '🖤', cr: '7',    max_hp: 127, armor_class: 18, speed: 40, stats: {str:19,dex:14,con:17,int:12,wis:11,cha:15},  notes: 'Fliegen 80, Säureatem' },
  { name: 'Roter Drache (juv.)', icon: '🔴', cr: '10',   max_hp: 178, armor_class: 18, speed: 40, stats: {str:23,dex:10,con:21,int:14,wis:11,cha:19},  notes: 'Fliegen 80, Feueratem' },
  { name: 'Lich',                icon: '💫', cr: '21',   max_hp: 135, armor_class: 17, speed: 30, stats: {str:11,dex:16,con:16,int:20,wis:14,cha:16},  notes: 'Legendär, Seelenglas' },
  { name: 'Beholder',            icon: '👁️', cr: '13',   max_hp: 180, armor_class: 18, speed: 0,  stats: {str:10,dex:14,con:18,int:17,wis:15,cha:17},  notes: 'Fliegen 20, Antimagie-Kegel, 10 Strahlen' },
  { name: 'Gelatinous Cube',     icon: '🟩', cr: '2',    max_hp: 84,  armor_class: 6,  speed: 15, stats: {str:14,dex:3,con:20,int:1,wis:6,cha:1},     notes: 'Transparent, Umhüllung' },
]

function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }
function statMod(v: number) { return Math.floor((v - 10) / 2) }

function rollDie(sides: number): number { return Math.floor(Math.random() * sides) + 1 }
function parseSides(type: string): number { return parseInt(type.slice(1)) }

// ─── Token Creation / Edit Modal ──────────────────────────────────────────────
const BLANK_TOKEN_FORM = {
  token_type: 'monster' as 'player' | 'monster' | 'npc',
  name: '', icon: '👹', cr: '',
  max_hp: '10', armor_class: '10', speed: '30', initiative: '0',
  str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10',
  notes: '',
}

function TokenModal({
  initial, onSave, onClose, title,
}: {
  initial?: Partial<typeof BLANK_TOKEN_FORM>
  onSave: (data: typeof BLANK_TOKEN_FORM) => void
  onClose: () => void
  title: string
}) {
  const [form, setForm] = useState({ ...BLANK_TOKEN_FORM, ...initial })
  const [iconSearch, setIconSearch] = useState('')
  const [showIcons, setShowIcons] = useState(false)

  const filteredIcons = iconSearch ? TOKEN_ICONS.filter(() => true) : TOKEN_ICONS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <span className="text-2xl">{form.icon}</span>
          <p className="flex-1 font-bold text-zinc-100">{title}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Type + Name + Icon row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Typ</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                value={form.token_type} onChange={e => setForm(f => ({ ...f, token_type: e.target.value as typeof f.token_type }))}>
                <option value="player">👤 Spieler</option>
                <option value="monster">👹 Monster</option>
                <option value="npc">🗣️ NPC</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Name *</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Name des Tokens" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Icon</label>
            <button
              onClick={() => setShowIcons(!showIcons)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 hover:border-zinc-500 transition-colors"
            >
              <span className="text-xl">{form.icon}</span>
              <span className="text-zinc-400 text-xs">Icon wählen</span>
              {showIcons ? <ChevronDown className="w-4 h-4 text-zinc-500 ml-auto" /> : <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />}
            </button>
            {showIcons && (
              <div className="mt-2 bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                  {filteredIcons.map((icon, i) => (
                    <button key={i} onClick={() => { setForm(f => ({ ...f, icon })); setShowIcons(false) }}
                      className={`text-xl p-1.5 rounded-lg hover:bg-zinc-700 transition-colors ${form.icon === icon ? 'bg-amber-600/30 ring-1 ring-amber-500' : ''}`}
                    >{icon}</button>
                  ))}
                </div>
                {/* Custom emoji input */}
                <div className="mt-2 flex gap-2 border-t border-zinc-700 pt-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                    placeholder="Eigenes Emoji eingeben…"
                    onChange={e => { if (e.target.value) setForm(f => ({ ...f, icon: e.target.value })) }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Combat stats */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Kampfwerte</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'max_hp', label: 'Max HP', type: 'number' },
                { key: 'armor_class', label: 'RK', type: 'number' },
                { key: 'speed', label: 'Tempo', type: 'number' },
                { key: 'initiative', label: 'Initiative', type: 'number' },
                { key: 'cr', label: 'CR', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-[9px] uppercase text-zinc-600 block mb-0.5">{label}</label>
                  <input type={type} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                    value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Ability scores */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Eigenschaften</label>
            <div className="grid grid-cols-6 gap-2">
              {(['str','dex','con','int','wis','cha'] as const).map(ab => (
                <div key={ab} className="flex flex-col items-center">
                  <label className="text-[9px] uppercase text-zinc-600 mb-0.5">{ab.toUpperCase()}</label>
                  <input type="number" min={1} max={30}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                    value={(form as any)[ab]} onChange={e => setForm(f => ({ ...f, [ab]: e.target.value }))} />
                  <span className="text-[9px] text-zinc-600 mt-0.5">{modSign(statMod(parseInt((form as any)[ab]) || 10))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Notizen / Traits</label>
            <textarea rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Besondere Fähigkeiten, Attacken…"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200">Abbrechen</button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form) }}
            disabled={!form.name.trim()}
            className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm font-bold text-white"
          >
            <Save className="w-4 h-4 inline mr-1.5" /> Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Token Piece ──────────────────────────────────────────────────────────────
function TokenPiece({ token, selected, cellSize, onClick }: {
  token: BattleToken; selected: boolean; cellSize: number; onClick: () => void
}) {
  const hpPct = token.max_hp && token.current_hp !== null
    ? Math.max(0, Math.min(1, token.current_hp / token.max_hp)) : null
  const hpColor = hpPct === null ? '' : hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444'
  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: token.col * cellSize + 2,
        top: token.row * cellSize + 2,
        width: cellSize - 4,
        height: cellSize - 4,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
        selected ? 'border-amber-400 shadow-lg shadow-amber-500/40 scale-105' :
        token.token_type === 'player' ? 'border-blue-500/60' :
        token.token_type === 'monster' ? 'border-red-500/60' : 'border-zinc-500/60'
      } ${
        token.token_type === 'player' ? 'bg-blue-900/70' :
        token.token_type === 'monster' ? 'bg-red-900/70' : 'bg-zinc-800/70'
      }`}
    >
      <span style={{ fontSize: cellSize * 0.38, lineHeight: 1 }}>{token.icon}</span>
      {cellSize >= 40 && (
        <span className="text-[8px] font-bold text-white/90 leading-tight max-w-full truncate px-0.5">
          {token.name.slice(0, 6)}
        </span>
      )}
      {hpPct !== null && (
        <div className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full bg-black/40">
          <div style={{ width: `${hpPct * 100}%`, backgroundColor: hpColor }} className="h-full rounded-full" />
        </div>
      )}
      {token.is_hidden && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-zinc-900 rounded-full flex items-center justify-center">
          <EyeOff className="w-2 h-2 text-zinc-400" />
        </div>
      )}
      {activeConds.length > 0 && (
        <div className="absolute top-0 left-0 flex gap-0.5">
          {activeConds.slice(0,3).map(c => (
            <div key={c.id} className={`w-3.5 h-3.5 rounded-full ${c.bg} border ${c.border} flex items-center justify-center text-[8px]`} title={c.id}>
              {c.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Token Panel ──────────────────────────────────────────────────────────────
function TokenPanel({
  token, onUpdate, onDelete, onClose, onEdit, isGM, myFavorites, onRoll, ownToken,
}: {
  token: BattleToken
  onUpdate: (t: Partial<BattleToken>) => void
  onDelete: () => void
  onClose: () => void
  onEdit: () => void
  isGM: boolean
  myFavorites: DiceFavorite[]
  onRoll: (cfg: DiceConfig[], bonus: number, label: string) => void
  ownToken: boolean   // true if this is the current player's own token
}) {
  const [hpInput, setHpInput] = useState('')
  const [showFavForm, setShowFavForm] = useState(false)
  const [newFavName, setNewFavName] = useState('')
  const [newFavAtk, setNewFavAtk] = useState('0')
  const [newFavDmg, setNewFavDmg] = useState('0')
  const [newFavDice, setNewFavDice] = useState<DiceConfig[]>([])
  const [showCondPicker, setShowCondPicker] = useState(false)

  const canEdit = isGM || ownToken
  const applyHp = (delta: number) => {
    const cur = token.current_hp ?? token.max_hp ?? 0
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, cur + delta)) })
  }
  const applyHpAbsolute = (v: number) => {
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, v)) })
  }

  const addFavoriteAction = () => {
    if (!newFavName.trim() || newFavDice.length === 0) return
    const fa: FavoriteAction = {
      name: newFavName.trim(),
      attack_bonus: parseInt(newFavAtk) || 0,
      damage_bonus: parseInt(newFavDmg) || 0,
      dice_config: newFavDice,
    }
    onUpdate({ favorite_actions: [...(token.favorite_actions ?? []), fa] })
    setNewFavName(''); setNewFavAtk('0'); setNewFavDmg('0'); setNewFavDice([])
    setShowFavForm(false)
  }

  const removeFav = (i: number) => {
    onUpdate({ favorite_actions: token.favorite_actions.filter((_, idx) => idx !== i) })
  }

  const favAdjDice = (type: string, delta: number) => {
    setNewFavDice(prev => {
      const idx = prev.findIndex(c => c.type === type)
      if (idx === -1) return delta > 0 ? [...prev, { type, count: 1 }] : prev
      const nc = prev[idx].count + delta
      if (nc <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((c, i) => i === idx ? { ...c, count: nc } : c)
    })
  }

  const DICE_TYPES = ['d4','d6','d8','d10','d12','d20']

  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))
  const availConds = CONDITIONS.filter(c => !token.conditions.includes(c.id))

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3 w-72">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{token.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-zinc-100 truncate">{token.name}</p>
          <p className="text-xs text-zinc-500">
            {token.token_type === 'player' ? '👤 Spieler' : token.token_type === 'monster' ? '👹 Monster' : '🗣️ NPC'}
            {token.challenge_rating && ` · CR ${token.challenge_rating}`}
          </p>
        </div>
        <div className="flex gap-1">
          {canEdit && (
            <button onClick={onEdit} className="p-1 text-zinc-500 hover:text-amber-400 transition-colors" title="Bearbeiten">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* HP */}
      {token.max_hp !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-zinc-400">Trefferpunkte</span>
            <span className="ml-auto text-sm font-bold text-zinc-100">{token.current_hp} / {token.max_hp}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, ((token.current_hp ?? 0) / (token.max_hp ?? 1)) * 100))}%`,
                backgroundColor: (() => { const p = (token.current_hp ?? 0) / (token.max_hp ?? 1); return p > 0.6 ? '#22c55e' : p > 0.3 ? '#eab308' : '#ef4444' })() }} />
          </div>
          {canEdit && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[-10,-5,-1,1,5,10].map((d) => (
                  <button key={d} onClick={() => applyHp(d)}
                    className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${
                      d < 0 ? 'bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/60'
                            : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60'
                    }`}>{d > 0 ? `+${d}` : d}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="HP setzen" value={hpInput} onChange={e => setHpInput(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                <button onClick={() => { applyHpAbsolute(parseInt(hpInput) || 0); setHpInput('') }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-700 text-xs text-zinc-300 hover:bg-zinc-600">Setzen</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {token.armor_class !== null && (
          <div className="text-center bg-zinc-800 rounded-lg py-2">
            <Shield className="w-3 h-3 text-zinc-400 mx-auto mb-0.5" />
            <p className="text-sm font-bold text-zinc-100">{token.armor_class}</p>
            <p className="text-[10px] text-zinc-500">RK</p>
          </div>
        )}
        {token.speed !== null && (
          <div className="text-center bg-zinc-800 rounded-lg py-2">
            <Zap className="w-3 h-3 text-zinc-400 mx-auto mb-0.5" />
            <p className="text-sm font-bold text-zinc-100">{token.speed}</p>
            <p className="text-[10px] text-zinc-500">Tempo</p>
          </div>
        )}
        {token.initiative !== null && (
          <div className="text-center bg-zinc-800 rounded-lg py-2">
            <p className="text-sm font-bold text-amber-400">{modSign(token.initiative)}</p>
            <p className="text-[10px] text-zinc-500">Init</p>
          </div>
        )}
      </div>

      {/* Ability scores */}
      {token.stats && (
        <div className="grid grid-cols-6 gap-1">
          {['str','dex','con','int','wis','cha'].map(ab => (
            <div key={ab} className="text-center">
              <p className="text-[9px] text-zinc-500 uppercase">{ab}</p>
              <p className="text-[11px] font-bold text-zinc-100">{modSign(statMod(token.stats![ab] ?? 10))}</p>
              <p className="text-[9px] text-zinc-600">{token.stats![ab] ?? 10}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conditions */}
      <div>
        {activeConds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {activeConds.map(c => (
              <span key={c.id} className={`text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${c.bg} ${c.border} ${c.color}`}>
                {c.icon} {c.id}
                {canEdit && (
                  <button onClick={() => onUpdate({ conditions: token.conditions.filter(x => x !== c.id) })} className="opacity-60 hover:opacity-100 hover:text-red-400">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowCondPicker(!showCondPicker)}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              + Zustand
            </button>
            {showCondPicker && availConds.length > 0 && (
              <div className="absolute bottom-7 left-0 z-10 bg-zinc-800 border border-zinc-700 rounded-xl p-2 shadow-xl w-56 max-h-48 overflow-y-auto">
                {availConds.map(c => (
                  <button key={c.id} onClick={() => { onUpdate({ conditions: [...token.conditions, c.id] }); setShowCondPicker(false) }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-700 transition-colors ${c.color}`}>
                    <span>{c.icon}</span> {c.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {token.notes && (
        <p className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2 italic">{token.notes}</p>
      )}

      {/* Token Favorite Actions (GM adds, anyone can roll) */}
      {((token.favorite_actions?.length ?? 0) > 0 || (isGM && token.token_type !== 'player')) && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> Aktionen
            </p>
            {isGM && (
              <button onClick={() => setShowFavForm(!showFavForm)} className="text-[10px] text-amber-400 hover:text-amber-300">
                + Aktion
              </button>
            )}
          </div>
          {(token.favorite_actions ?? []).map((fa, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-100 truncate">{fa.name}</p>
                <p className="text-[10px] text-zinc-500">
                  Atk {modSign(fa.attack_bonus)} · {fa.dice_config.map(c => `${c.count}×${c.type}`).join('+')}
                  {fa.damage_bonus !== 0 ? modSign(fa.damage_bonus) : ''}
                </p>
              </div>
              <button onClick={() => onRoll([{ type: 'd20', count: 1 }], fa.attack_bonus, `${token.name}: ${fa.name} Angriff`)}
                className="px-1.5 py-1 rounded bg-amber-600/30 border border-amber-500/50 text-[10px] text-amber-200 hover:bg-amber-600/60">Atk</button>
              <button onClick={() => onRoll(fa.dice_config, fa.damage_bonus, `${token.name}: ${fa.name} Schaden`)}
                className="px-1.5 py-1 rounded bg-red-700/30 border border-red-500/50 text-[10px] text-red-200 hover:bg-red-700/60">Dmg</button>
              {isGM && (
                <button onClick={() => removeFav(i)} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
              )}
            </div>
          ))}
          {showFavForm && isGM && (
            <div className="bg-zinc-800/50 rounded-lg p-2.5 space-y-2 border border-zinc-700">
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                placeholder="Aktionsname…" value={newFavName} onChange={e => setNewFavName(e.target.value)} />
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-zinc-500">Atk Bonus</label>
                  <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                    value={newFavAtk} onChange={e => setNewFavAtk(e.target.value)} />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500">Schad Bonus</label>
                  <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                    value={newFavDmg} onChange={e => setNewFavDmg(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {DICE_TYPES.map(t => {
                  const cnt = newFavDice.find(c => c.type === t)?.count ?? 0
                  return (
                    <div key={t} className="flex items-center gap-0.5">
                      <button onClick={() => favAdjDice(t, -1)} className="w-4 h-4 text-zinc-500 hover:text-zinc-300 text-xs">−</button>
                      <button onClick={() => favAdjDice(t, 1)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cnt > 0 ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                        {cnt > 0 ? `${cnt}×` : ''}{t}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowFavForm(false)} className="flex-1 py-1 rounded-lg bg-zinc-700 text-xs text-zinc-400">Abbrechen</button>
                <button onClick={addFavoriteAction} disabled={!newFavName.trim() || newFavDice.length === 0}
                  className="flex-1 py-1 rounded-lg bg-amber-600 disabled:opacity-40 text-xs text-white font-semibold">
                  <BookmarkCheck className="w-3 h-3 inline mr-1" />Hinzufügen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player's own dice favorites (shown on player tokens when owned) */}
      {(ownToken || (isGM && token.token_type === 'player')) && myFavorites.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-blue-400" /> Meine Würfel-Favoriten
          </p>
          {myFavorites.map(fav => {
            const cfg = fav.dice_config?.length > 0 ? fav.dice_config : []
            return (
              <div key={fav.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-900/10 border border-blue-800/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-100 truncate">{fav.name}</p>
                  <p className="text-[10px] text-zinc-500">Atk {modSign(fav.attack_bonus)}</p>
                </div>
                <button onClick={() => onRoll([{ type: 'd20', count: 1 }], fav.attack_bonus, `${fav.name} Angriff`)}
                  className="px-1.5 py-1 rounded bg-amber-600/30 border border-amber-500/50 text-[10px] text-amber-200 hover:bg-amber-600/60">Atk</button>
                {cfg.length > 0 && (
                  <button onClick={() => onRoll(cfg, fav.damage_bonus, `${fav.name} Schaden`)}
                    className="px-1.5 py-1 rounded bg-red-700/30 border border-red-500/50 text-[10px] text-red-200 hover:bg-red-700/60">Dmg</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* GM controls */}
      {isGM && (
        <div className="flex gap-2 pt-1 border-t border-zinc-800">
          <button
            onClick={() => onUpdate({ is_hidden: !token.is_hidden })}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {token.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {token.is_hidden ? 'Sichtbar' : 'Verstecken'}
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Entfernen
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BattleMapPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const isGM = user?.role === 'gm'

  const [maps, setMaps] = useState<BattleMap[]>([])
  const [activeMap, setActiveMap] = useState<BattleMap | null>(null)
  const [tokens, setTokens] = useState<BattleToken[]>([])
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'tracker'>('map')
  const [showMapForm, setShowMapForm] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMonsterLib, setShowMonsterLib] = useState(false)
  const [editingToken, setEditingToken] = useState<BattleToken | null>(null)
  const [newMapForm, setNewMapForm] = useState({ name: '', image_url: '', grid_cols: '24', grid_rows: '16', cell_size: '50' })
  const [showGridControls, setShowGridControls] = useState(false)
  const [myFavorites, setMyFavorites] = useState<DiceFavorite[]>([])
  // GM: roll visibility toggle (persisted in localStorage)
  const [gmRollsVisible, setGmRollsVisible] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('gm-rolls-visible')
    if (stored !== null) setGmRollsVisible(stored === 'true')
  }, [])

  const toggleGmRolls = (v: boolean) => {
    setGmRollsVisible(v)
    localStorage.setItem('gm-rolls-visible', String(v))
  }

  const loadMaps = useCallback(async () => {
    const { data } = await supabase.from('battle_maps').select('*').order('created_at', { ascending: false })
    setMaps(data ?? [])
    if (!activeMap && data?.[0]) setActiveMap(data[0])
  }, [supabase, activeMap])

  const loadTokens = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_tokens').select('*').eq('map_id', mapId)
    setTokens((data ?? []).map((t: any) => ({
      ...t,
      conditions: t.conditions ?? [],
      favorite_actions: t.favorite_actions ?? [],
    })))
  }, [supabase])

  const loadMyFavorites = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('dice_favorites').select('*').eq('user_id', user.id).order('created_at')
    setMyFavorites((data ?? []) as DiceFavorite[])
  }, [user, supabase])

  useEffect(() => { loadMaps() }, [loadMaps])
  useEffect(() => { loadMyFavorites() }, [loadMyFavorites])

  useEffect(() => {
    if (!activeMap) return
    loadTokens(activeMap.id)
    const channel = supabase.channel('battle_' + activeMap.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_tokens', filter: `map_id=eq.${activeMap.id}` },
        () => loadTokens(activeMap.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeMap, loadTokens, supabase])

  // ── Map CRUD ──
  const createMap = async () => {
    if (!user) return
    const { data } = await supabase.from('battle_maps').insert({
      name: newMapForm.name || 'Neue Karte',
      image_url: newMapForm.image_url || null,
      grid_cols: parseInt(newMapForm.grid_cols) || 24,
      grid_rows: parseInt(newMapForm.grid_rows) || 16,
      cell_size: parseInt(newMapForm.cell_size) || 50,
      is_active: true,
      created_by: user.id,
      grid_opacity: 0.15,
      grid_offset_x: 0,
      grid_offset_y: 0,
    }).select().single()
    if (data) { setActiveMap(data as BattleMap); setShowMapForm(false); loadMaps() }
  }

  const updateMap = async (patch: Partial<BattleMap>) => {
    if (!activeMap) return
    const updated = { ...activeMap, ...patch }
    setActiveMap(updated)
    await supabase.from('battle_maps').update(patch).eq('id', activeMap.id)
  }

  const deleteMap = async (id: string) => {
    await supabase.from('battle_maps').delete().eq('id', id)
    if (activeMap?.id === id) setActiveMap(null)
    loadMaps()
  }

  // ── Token CRUD ──
  const addTokenFromForm = async (form: typeof BLANK_TOKEN_FORM, override?: { player_user_id?: string }) => {
    if (!activeMap || !user) return
    await supabase.from('battle_tokens').insert({
      map_id: activeMap.id,
      token_type: form.token_type,
      name: form.name,
      icon: form.icon,
      col: 0, row: 0,
      max_hp: parseInt(form.max_hp) || null,
      current_hp: parseInt(form.max_hp) || null,
      armor_class: parseInt(form.armor_class) || null,
      speed: parseInt(form.speed) || null,
      initiative: parseInt(form.initiative) || 0,
      challenge_rating: form.cr || null,
      conditions: [],
      notes: form.notes || null,
      stats: { str: parseInt(form.str)||10, dex: parseInt(form.dex)||10, con: parseInt(form.con)||10, int: parseInt(form.int)||10, wis: parseInt(form.wis)||10, cha: parseInt(form.cha)||10 },
      is_hidden: false,
      favorite_actions: [],
      player_user_id: override?.player_user_id ?? null,
    })
    loadTokens(activeMap.id)
    setShowAddModal(false)
    setShowMonsterLib(false)
  }

  const addFromTemplate = (m: MonsterTemplate) => {
    if (!activeMap || !user) return
    supabase.from('battle_tokens').insert({
      map_id: activeMap.id,
      token_type: 'monster',
      name: m.name,
      icon: m.icon,
      col: 0, row: 0,
      max_hp: m.max_hp,
      current_hp: m.max_hp,
      armor_class: m.armor_class,
      speed: m.speed,
      initiative: 0,
      challenge_rating: m.cr,
      conditions: [],
      notes: m.notes || null,
      stats: m.stats,
      is_hidden: false,
      favorite_actions: [],
      player_user_id: null,
    }).then(() => loadTokens(activeMap.id))
    setShowMonsterLib(false)
  }

  const updateToken = async (id: string, patch: Partial<BattleToken>) => {
    await supabase.from('battle_tokens').update(patch).eq('id', id)
    setTokens(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const saveEditedToken = async (form: typeof BLANK_TOKEN_FORM) => {
    if (!editingToken) return
    const patch: Partial<BattleToken> = {
      name: form.name,
      icon: form.icon,
      token_type: form.token_type,
      max_hp: parseInt(form.max_hp) || null,
      current_hp: parseInt(form.max_hp) || null,
      armor_class: parseInt(form.armor_class) || null,
      speed: parseInt(form.speed) || null,
      initiative: parseInt(form.initiative) || 0,
      challenge_rating: form.cr || null,
      notes: form.notes || null,
      stats: { str: parseInt(form.str)||10, dex: parseInt(form.dex)||10, con: parseInt(form.con)||10, int: parseInt(form.int)||10, wis: parseInt(form.wis)||10, cha: parseInt(form.cha)||10 },
    }
    await updateToken(editingToken.id, patch)
    setEditingToken(null)
  }

  const deleteToken = async (id: string) => {
    await supabase.from('battle_tokens').delete().eq('id', id)
    setTokens(prev => prev.filter(t => t.id !== id))
    if (selectedToken === id) setSelectedToken(null)
  }

  // ── Player adds their own token ──
  const addMyPlayerToken = () => {
    setShowAddModal(true)
  }

  const myToken = tokens.find(t => t.player_user_id === user?.id)

  // ── Roll from battlemap ──
  const performRoll = async (cfg: DiceConfig[], mod: number, lbl: string) => {
    if (!user || cfg.length === 0) return
    const results = cfg.map(c => Array.from({ length: c.count }, () => rollDie(parseSides(c.type))))
    const total = results.flat().reduce((s, n) => s + n, 0) + mod
    await supabase.from('dice_rolls').insert({
      user_id: user.id,
      dice_config: cfg,
      results,
      total,
      label: lbl || null,
      visible_to_players: isGM ? gmRollsVisible : true,
    })
  }

  // ── Grid click to move ──
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMap || !selectedToken) return
    const token = tokens.find(t => t.id === selectedToken)
    if (!token) return
    // Allow move if GM OR own player token
    if (!isGM && token.player_user_id !== user?.id) return
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    const ox = activeMap.grid_offset_x
    const oy = activeMap.grid_offset_y
    const col = Math.floor((e.clientX - rect.left - ox) / activeMap.cell_size)
    const row = Math.floor((e.clientY - rect.top - oy) / activeMap.cell_size)
    if (col >= 0 && col < activeMap.grid_cols && row >= 0 && row < activeMap.grid_rows) {
      updateToken(selectedToken, { col, row })
    }
  }

  const sel = selectedToken ? tokens.find(t => t.id === selectedToken) ?? null : null
  const visibleTokens = isGM ? tokens : tokens.filter(t => !t.is_hidden)

  const openEditModal = (token: BattleToken) => {
    setEditingToken(token)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
        <Map className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <span className="text-base font-bold text-zinc-100">Spielfeld</span>

        {/* Map selector */}
        {maps.length > 0 && (
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
            value={activeMap?.id ?? ''}
            onChange={e => { const m = maps.find(x => x.id === e.target.value); if (m) setActiveMap(m) }}
          >
            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {isGM && (
            <>
              <button onClick={() => setShowMapForm(!showMapForm)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200">
                <Plus className="w-3.5 h-3.5" /> Karte
              </button>
              {activeMap && (
                <>
                  <button onClick={() => setShowGridControls(!showGridControls)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${showGridControls ? 'bg-amber-600/20 border-amber-600/50 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Gitter
                  </button>
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/30 border border-amber-600/50 text-xs text-amber-300 hover:bg-amber-600/50">
                    <Plus className="w-3.5 h-3.5" /> Token
                  </button>
                  <button onClick={() => setShowMonsterLib(!showMonsterLib)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-700/50 text-xs text-red-300 hover:bg-red-900/50">
                    👹 Monster
                  </button>
                  {/* GM roll visibility */}
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200">
                    <input type="checkbox" checked={gmRollsVisible} onChange={e => toggleGmRolls(e.target.checked)} className="w-3 h-3 accent-amber-500" />
                    Würfe sichtbar
                  </label>
                </>
              )}
            </>
          )}

          {/* Player: add own token */}
          {!isGM && activeMap && !myToken && (
            <button onClick={addMyPlayerToken}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/50 text-xs text-blue-300 hover:bg-blue-900/50">
              <Plus className="w-3.5 h-3.5" /> Meine Figur
            </button>
          )}

          {/* GM tab switcher */}
          {isGM && activeMap && (
            <div className="flex rounded-lg overflow-hidden border border-zinc-700 ml-auto">
              {(['map','tracker'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === t ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                  {t === 'map' ? '🗺️ Karte' : '📋 Tracker'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid calibration controls */}
      {showGridControls && isGM && activeMap && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Gitter kalibrieren</p>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Deckkraft</label>
              <input type="range" min="0" max="0.6" step="0.01"
                value={activeMap.grid_opacity}
                onChange={e => updateMap({ grid_opacity: parseFloat(e.target.value) })}
                className="w-28 accent-amber-500" />
              <span className="text-xs text-zinc-400 w-8">{Math.round(activeMap.grid_opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Offset X</label>
              <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                value={activeMap.grid_offset_x} onChange={e => updateMap({ grid_offset_x: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Offset Y</label>
              <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                value={activeMap.grid_offset_y} onChange={e => updateMap({ grid_offset_y: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Zellgröße px</label>
              <input type="number" min="20" max="120" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                value={activeMap.cell_size} onChange={e => updateMap({ cell_size: parseInt(e.target.value) || 50 })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Spalten</label>
              <input type="number" min="4" max="60" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                value={activeMap.grid_cols} onChange={e => updateMap({ grid_cols: parseInt(e.target.value) || 24 })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Zeilen</label>
              <input type="number" min="4" max="60" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                value={activeMap.grid_rows} onChange={e => updateMap({ grid_rows: parseInt(e.target.value) || 16 })} />
            </div>
          </div>
        </div>
      )}

      {/* New Map Form */}
      {showMapForm && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Neue Karte erstellen</p>
          <div className="flex flex-wrap gap-2">
            <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Name" value={newMapForm.name} onChange={e => setNewMapForm(f => ({...f, name: e.target.value}))} />
            <input className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Bild-URL (optional)" value={newMapForm.image_url} onChange={e => setNewMapForm(f => ({...f, image_url: e.target.value}))} />
          </div>
          <div className="flex gap-2">
            <button onClick={createMap} className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white">Erstellen</button>
            <button onClick={() => setShowMapForm(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">Abbrechen</button>
            {activeMap && <button onClick={() => deleteMap(activeMap.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-xs text-red-400">Karte löschen</button>}
          </div>
        </div>
      )}

      {/* Monster Library */}
      {showMonsterLib && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-300">Monster-Bibliothek</p>
            <button onClick={() => setShowMonsterLib(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {MONSTER_TEMPLATES.map(m => (
              <button key={m.name} onClick={() => addFromTemplate(m)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/20 border border-red-800/40 text-xs text-red-200 hover:bg-red-900/40 transition-colors">
                <span>{m.icon}</span><span>{m.name}</span>
                <span className="text-red-400/60">CR{m.cr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Token Creation Modal */}
      {showAddModal && isGM && (
        <TokenModal
          title="Token hinzufügen"
          onSave={form => addTokenFromForm(form)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Player add own token */}
      {showAddModal && !isGM && (
        <TokenModal
          title="Meine Figur hinzufügen"
          initial={{ token_type: 'player', icon: '🧙' }}
          onSave={form => addTokenFromForm(form, { player_user_id: user?.id })}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Token Modal */}
      {editingToken && (
        <TokenModal
          title={`Token bearbeiten – ${editingToken.name}`}
          initial={{
            token_type: editingToken.token_type,
            name: editingToken.name,
            icon: editingToken.icon,
            cr: editingToken.challenge_rating ?? '',
            max_hp: String(editingToken.max_hp ?? ''),
            armor_class: String(editingToken.armor_class ?? ''),
            speed: String(editingToken.speed ?? ''),
            initiative: String(editingToken.initiative ?? ''),
            str: String(editingToken.stats?.str ?? 10),
            dex: String(editingToken.stats?.dex ?? 10),
            con: String(editingToken.stats?.con ?? 10),
            int: String(editingToken.stats?.int ?? 10),
            wis: String(editingToken.stats?.wis ?? 10),
            cha: String(editingToken.stats?.cha ?? 10),
            notes: editingToken.notes ?? '',
          }}
          onSave={saveEditedToken}
          onClose={() => setEditingToken(null)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {!activeMap ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
            <Map className="w-12 h-12 opacity-30" />
            <p>Keine Karte ausgewählt</p>
            {isGM && (
              <button onClick={() => setShowMapForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-bold text-white">
                <Plus className="w-4 h-4" /> Erste Karte erstellen
              </button>
            )}
          </div>
        ) : activeTab === 'tracker' && isGM ? (
          /* GM Tracker */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Initiativereihenfolge — {tokens.length} Token</p>
            {tokens.length === 0 && <p className="text-sm text-zinc-600">Noch keine Token auf der Karte.</p>}
            {[...tokens].sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)).map(t => {
              const activeConds = CONDITIONS.filter(c => t.conditions.includes(c.id))
              return (
                <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedToken === t.id ? 'border-amber-500/60 bg-amber-900/20' :
                  t.token_type === 'player' ? 'border-blue-800/40 bg-blue-900/10' :
                  t.token_type === 'monster' ? 'border-red-800/40 bg-red-900/10' : 'border-zinc-700 bg-zinc-800/40'
                } ${t.is_hidden ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}>
                  <span className="text-xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{t.name}</p>
                      {t.is_hidden && <EyeOff className="w-3 h-3 text-zinc-500" />}
                      {activeConds.map(c => (
                        <span key={c.id} className={`text-[10px] px-1 rounded flex items-center gap-0.5 ${c.bg} ${c.border} ${c.color}`}>{c.icon}</span>
                      ))}
                    </div>
                    <div className="flex gap-3 text-[11px] text-zinc-500">
                      {t.max_hp !== null && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-400" /> {t.current_hp}/{t.max_hp}</span>}
                      {t.armor_class !== null && <span><Shield className="w-2.5 h-2.5 inline" /> {t.armor_class}</span>}
                      {t.initiative !== null && <span>Init {modSign(t.initiative)}</span>}
                      {t.challenge_rating && <span>CR {t.challenge_rating}</span>}
                    </div>
                  </div>
                  {t.max_hp !== null && (
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.max(0, (t.current_hp ?? 0) - 1) }) }}
                        className="w-6 h-6 rounded bg-red-900/40 border border-red-700/40 text-red-300 text-xs font-bold hover:bg-red-900/70">−</button>
                      <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.min(t.max_hp!, (t.current_hp ?? 0) + 1) }) }}
                        className="w-6 h-6 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/70">+</button>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); openEditModal(t) }} className="p-1 text-zinc-600 hover:text-amber-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteToken(t.id) }} className="p-1 text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* Map View */
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto">
              <div
                ref={mapRef}
                className="relative select-none"
                style={{
                  width: activeMap.grid_cols * activeMap.cell_size + (activeMap.grid_offset_x ?? 0),
                  height: activeMap.grid_rows * activeMap.cell_size + (activeMap.grid_offset_y ?? 0),
                  backgroundImage: activeMap.image_url
                    ? `url(${activeMap.image_url})`
                    : 'linear-gradient(135deg, #1a0a02 25%, #0f0600 50%, #1a0a02 75%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: selectedToken ? 'crosshair' : 'default',
                }}
                onClick={handleGridClick}
              >
                {/* Grid overlay */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  {Array.from({ length: activeMap.grid_cols + 1 }, (_, i) => (
                    <line key={`v${i}`}
                      x1={i * activeMap.cell_size + (activeMap.grid_offset_x ?? 0)}
                      y1={activeMap.grid_offset_y ?? 0}
                      x2={i * activeMap.cell_size + (activeMap.grid_offset_x ?? 0)}
                      y2={activeMap.grid_rows * activeMap.cell_size + (activeMap.grid_offset_y ?? 0)}
                      stroke={`rgba(255,255,255,${activeMap.grid_opacity ?? 0.15})`} strokeWidth="1" />
                  ))}
                  {Array.from({ length: activeMap.grid_rows + 1 }, (_, i) => (
                    <line key={`h${i}`}
                      x1={activeMap.grid_offset_x ?? 0}
                      y1={i * activeMap.cell_size + (activeMap.grid_offset_y ?? 0)}
                      x2={activeMap.grid_cols * activeMap.cell_size + (activeMap.grid_offset_x ?? 0)}
                      y2={i * activeMap.cell_size + (activeMap.grid_offset_y ?? 0)}
                      stroke={`rgba(255,255,255,${activeMap.grid_opacity ?? 0.15})`} strokeWidth="1" />
                  ))}
                </svg>

                {/* Tokens */}
                {visibleTokens.map(t => {
                  const ox = activeMap.grid_offset_x ?? 0
                  const oy = activeMap.grid_offset_y ?? 0
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}
                      style={{
                        position: 'absolute',
                        left: t.col * activeMap.cell_size + ox + 2,
                        top: t.row * activeMap.cell_size + oy + 2,
                        width: activeMap.cell_size - 4,
                        height: activeMap.cell_size - 4,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <TokenPiece
                        token={t}
                        selected={selectedToken === t.id}
                        cellSize={activeMap.cell_size}
                        onClick={() => {}}
                      />
                    </div>
                  )
                })}

                {/* Move hint */}
                {selectedToken && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Klicke auf ein Feld zum Bewegen
                  </div>
                )}
              </div>
            </div>

            {/* Right panel */}
            {sel && (
              <div className="flex-shrink-0 w-72 overflow-y-auto p-3 border-l border-zinc-800 bg-zinc-950">
                <TokenPanel
                  token={sel}
                  onUpdate={patch => updateToken(sel.id, patch)}
                  onDelete={() => deleteToken(sel.id)}
                  onClose={() => setSelectedToken(null)}
                  onEdit={() => openEditModal(sel)}
                  isGM={isGM}
                  myFavorites={myFavorites}
                  onRoll={performRoll}
                  ownToken={sel.player_user_id === user?.id}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
