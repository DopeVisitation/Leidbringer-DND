'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Map as MapIcon, Plus, Trash2, X, Eye, EyeOff, Shield, Heart, Zap,
  Edit2, Save, Bookmark, BookmarkCheck, SlidersHorizontal,
  ChevronDown, ChevronRight, Lock, Unlock, Check, RotateCcw,
  Flame, Move, Footprints, Skull, ArrowUp, ArrowDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { CharacterFullData } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type TokenSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' | 'colossal'

interface MapEffect {
  id: string; type: string; col: number; row: number
  icon?: string; color: string; label?: string
  radius?: number; angle?: number; direction?: number; length?: number
}

interface BattleMap {
  id: string; name: string; image_url: string | null
  grid_cols: number; grid_rows: number; cell_size: number
  is_active: boolean; created_by: string; grid_opacity: number
  grid_offset_x: number; grid_offset_y: number
  difficult_terrain: { col: number; row: number }[]
  map_effects: MapEffect[]; feet_per_cell: number; grid_locked: boolean
}

interface FavoriteAction {
  name: string; attack_bonus: number; damage_bonus: number; dice_config: DiceConfig[]
}
interface DiceConfig { type: string; count: number; damageType?: string }

interface BattleToken {
  id: string; map_id: string; token_type: 'player' | 'monster' | 'npc'
  name: string; icon: string; col: number; row: number
  max_hp: number | null; current_hp: number | null; armor_class: number | null
  speed: number | null; initiative: number | null; challenge_rating: string | null
  conditions: string[]; notes: string | null; stats: Record<string, number> | null
  is_hidden: boolean; favorite_actions: FavoriteAction[]
  player_user_id: string | null; token_size: TokenSize; movement_used: number
}
interface DiceFavorite {
  id: string; name: string; attack_bonus: number; damage_bonus: number
  dice_config: DiceConfig[]; damage_dice?: string | null; damage_type?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN_ICONS = [
  // Krieger & Helden
  '⚔️','🗡️','🛡️','🏹','🪖','🔱','⚜️','🪃','🏴','🎖️',
  // Magie & Zauber
  '🔮','🪄','📿','⭐','🌟','✨','💫','🌀','🔯','☄️',
  '🌙','☀️','⚡','🔥','❄️','🌊','🌪️','🌈','🌌','🌠',
  // Untote (Dark Fantasy Kern)
  '💀','☠️','🦴','👻','🧟','🧛','🕸️','🕯️','⚰️','🪦',
  '🌑','🌚','🕳️','🖤','🩸','💔','🧠','👁️','🫀','🌃',
  // Dämonen & Dunkle Wesen
  '👹','👺','😈','👿','💢','🌋','🔴','⛔','👾','🐾',
  // Spinnen, Schlangen & Insekten
  '🕷️','🦂','🐍','🦇','🐜','🪲','🦟','🦠','🐛','🪳',
  // Drachen & Greife
  '🐉','🐲','🦅','🦉','🦋','🦚','🐦‍⬛','🪽','🦜','🦆',
  // Bestien & Monster
  '🐺','🦁','🐗','🐻','🐻‍❄️','🦊','🐅','🐆','🐘','🦛',
  '🦈','🦖','🦕','🐊','🐢','🦎','🐸','🐙','🦑','🦐',
  '🦀','🦞','🪼','🦭','🐬','🐳','🦏','🦒','🦬','🦣',
  // Humanoide & NPCs
  '🧙','🧝','🧞','🧜','🧚','🧌','🥷','🤴','👸','🧓',
  '🎭','🃏','🎩','🏴‍☠️','🧔','👳','🎪','🤠','🧟‍♀️','🧛‍♀️',
  // Umgebung & Terrain-Marker
  '🌲','🌴','🍄','🌿','🪨','🏔️','🗻','🌋','🏞️','🗺️',
  '🏰','🗼','⛩️','🏯','🕌','⛪','🗽','🏛️','🌉','🌁',
  // Gegenstände & Artefakte
  '🗝️','⚗️','🧪','🏺','📜','🔑','⚙️','🧲','💣','🪤',
  '💎','💍','🪬','🧿','🎯','🎲','🀄','🎴','🏆','🥇',
  // Spezial & Magie-Effekte
  '💥','🌟','✨','🌠','🌌','🌈','☄️','🌀','🔯','⛤',
  '🫧','🧊','💧','🫙','🌫️','🌬️','🌩️','🌧️','⛅','🌤️',
]

interface ConditionDef { id: string; icon: string; color: string; bg: string; border: string }
const CONDITIONS: ConditionDef[] = [
  { id: 'Vergiftet',        icon: '☠️', color: 'text-green-400',   bg: 'bg-green-900/30',   border: 'border-green-700/40'  },
  { id: 'Betäubt',          icon: '💫', color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-700/40' },
  { id: 'Erschöpft',        icon: '😴', color: 'text-slate-400',   bg: 'bg-slate-900/30',   border: 'border-slate-700/40'  },
  { id: 'Verängstigt',      icon: '😱', color: 'text-pink-400',    bg: 'bg-pink-900/30',    border: 'border-pink-700/40'   },
  { id: 'Entzaubert',       icon: '🔕', color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/40'   },
  { id: 'Fixiert',          icon: '⚓', color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-700/40' },
  { id: 'Gelähmt',          icon: '🔒', color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-700/40'    },
  { id: 'Niedergeschlagen', icon: '⬇️', color: 'text-zinc-400',   bg: 'bg-zinc-800/50',    border: 'border-zinc-600/40'   },
  { id: 'Unsichtbar',       icon: '👻', color: 'text-violet-400',  bg: 'bg-violet-900/30',  border: 'border-violet-700/40' },
  { id: 'Versteint',        icon: '🪨', color: 'text-stone-400',   bg: 'bg-stone-900/30',   border: 'border-stone-700/40'  },
  { id: 'Geblendet',        icon: '🕶️', color: 'text-amber-400',   bg: 'bg-amber-900/30',   border: 'border-amber-700/40'  },
  { id: 'Betört',           icon: '💗', color: 'text-rose-400',    bg: 'bg-rose-900/30',    border: 'border-rose-700/40'   },
  { id: 'Taub',             icon: '🔇', color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-700/40'   },
  { id: 'Konzentration',    icon: '🎯', color: 'text-indigo-400',  bg: 'bg-indigo-900/30',  border: 'border-indigo-700/40' },
]

const TOKEN_SIZES: { id: TokenSize; label: string; span: number; gridLabel: string }[] = [
  { id: 'tiny',       label: 'Winzig',      span: 0.5, gridLabel: '½ Feld'      },
  { id: 'small',      label: 'Klein',        span: 1,   gridLabel: '1×1'        },
  { id: 'medium',     label: 'Mittel',       span: 1,   gridLabel: '1×1'        },
  { id: 'large',      label: 'Groß',         span: 2,   gridLabel: '2×2'        },
  { id: 'huge',       label: 'Riesig',       span: 3,   gridLabel: '3×3'        },
  { id: 'gargantuan', label: 'Gigantisch',   span: 4,   gridLabel: '4×4'        },
  { id: 'colossal',   label: 'Koloss',       span: 5,   gridLabel: '5×5'        },
]

// ─── Effect Types ─────────────────────────────────────────────────────────────
interface EffectType {
  id: string; icon: string; label: string; color: string
  simple: boolean; category: 'hazard' | 'terrain' | 'magic' | 'aoe'
}
const EFFECT_TYPES: EffectType[] = [
  // Hazards
  { id: 'fire',      icon: '🔥', label: 'Feuer',        color: '#ff4400', simple: true,  category: 'hazard'  },
  { id: 'ice',       icon: '❄️', label: 'Frost',        color: '#66ccff', simple: true,  category: 'hazard'  },
  { id: 'lightning', icon: '⚡', label: 'Blitz',        color: '#ffdd22', simple: true,  category: 'hazard'  },
  { id: 'poison',    icon: '☠️', label: 'Gift',         color: '#44cc00', simple: true,  category: 'hazard'  },
  { id: 'acid',      icon: '🧪', label: 'Säure',        color: '#aaff00', simple: true,  category: 'hazard'  },
  { id: 'lava',      icon: '🌋', label: 'Lava',         color: '#ff6600', simple: true,  category: 'hazard'  },
  { id: 'blood',     icon: '🩸', label: 'Blut',         color: '#880000', simple: true,  category: 'hazard'  },
  { id: 'explosion', icon: '💥', label: 'Explosion',    color: '#ffaa00', simple: true,  category: 'hazard'  },
  // Terrain
  { id: 'rock',      icon: '🪨', label: 'Fels/Mauer',  color: '#888888', simple: true,  category: 'terrain' },
  { id: 'tree',      icon: '🌲', label: 'Baum',         color: '#226622', simple: true,  category: 'terrain' },
  { id: 'water',     icon: '🌊', label: 'Wasser',       color: '#0055aa', simple: true,  category: 'terrain' },
  { id: 'web',       icon: '🕸️', label: 'Spinnennetz',  color: '#cccc88', simple: true,  category: 'terrain' },
  { id: 'grease',    icon: '🟡', label: 'Schmierfett',  color: '#ddcc00', simple: true,  category: 'terrain' },
  // Magic
  { id: 'darkness',  icon: '🌑', label: 'Dunkelheit',   color: '#220044', simple: true,  category: 'magic'   },
  { id: 'fog',       icon: '🌫️', label: 'Nebel',        color: '#aaaaaa', simple: true,  category: 'magic'   },
  { id: 'holy',      icon: '✨', label: 'Heiliges Licht',color: '#ffee44', simple: true,  category: 'magic'   },
  { id: 'necrotic',  icon: '💀', label: 'Nekrose',      color: '#662288', simple: true,  category: 'magic'   },
  { id: 'shadow',    icon: '🖤', label: 'Schatten',     color: '#110022', simple: true,  category: 'magic'   },
  { id: 'force',     icon: '🔵', label: 'Kraftfeld',    color: '#4488ff', simple: true,  category: 'magic'   },
  { id: 'silence',   icon: '🔇', label: 'Stille',       color: '#558899', simple: true,  category: 'magic'   },
  // AOE
  { id: 'circle',    icon: '⭕', label: 'Kreis (AOE)',  color: '#ff2200', simple: false, category: 'aoe'     },
  { id: 'cone',      icon: '🔺', label: 'Kegel (AOE)',  color: '#ff8800', simple: false, category: 'aoe'     },
  { id: 'line',      icon: '➡️', label: 'Linie (AOE)',  color: '#ff4488', simple: false, category: 'aoe'     },
  { id: 'aura',      icon: '🌟', label: 'Aura',         color: '#ffcc00', simple: false, category: 'aoe'     },
]

interface MonsterTemplate {
  name: string; icon: string; cr: string; max_hp: number
  armor_class: number; speed: number; stats: Record<string, number>; notes: string
}
const MONSTER_TEMPLATES: MonsterTemplate[] = [
  { name: 'Goblin',         icon: '👺', cr: '1/4', max_hp: 7,   armor_class: 15, speed: 30, stats: {str:8,dex:14,con:10,int:10,wis:8,cha:8},    notes: 'Nimble Escape' },
  { name: 'Kobold',         icon: '🦎', cr: '1/8', max_hp: 5,   armor_class: 12, speed: 30, stats: {str:7,dex:15,con:9,int:8,wis:7,cha:8},     notes: 'Pack Tactics' },
  { name: 'Skelett',        icon: '💀', cr: '1/4', max_hp: 13,  armor_class: 13, speed: 30, stats: {str:10,dex:14,con:15,int:6,wis:8,cha:5},   notes: 'Imm: Gift, Res: Piercing' },
  { name: 'Zombie',         icon: '🧟', cr: '1/4', max_hp: 22,  armor_class: 8,  speed: 20, stats: {str:13,dex:6,con:16,int:3,wis:6,cha:5},    notes: 'Undead Fortitude' },
  { name: 'Orc',            icon: '👹', cr: '1/2', max_hp: 15,  armor_class: 13, speed: 30, stats: {str:16,dex:12,con:16,int:7,wis:11,cha:10},  notes: 'Aggressive' },
  { name: 'Hobgoblin',      icon: '⚔️', cr: '1/2', max_hp: 11,  armor_class: 18, speed: 30, stats: {str:13,dex:12,con:12,int:10,wis:10,cha:9},  notes: 'Martial Advantage' },
  { name: 'Gnoll',          icon: '🐺', cr: '1/2', max_hp: 22,  armor_class: 15, speed: 30, stats: {str:14,dex:12,con:11,int:6,wis:10,cha:7},   notes: 'Rampage' },
  { name: 'Bugbear',        icon: '🐻', cr: '1',   max_hp: 27,  armor_class: 16, speed: 30, stats: {str:15,dex:14,con:13,int:8,wis:11,cha:9},   notes: 'Brute, Überraschungsangriff' },
  { name: 'Ghoul',          icon: '😱', cr: '1',   max_hp: 22,  armor_class: 12, speed: 30, stats: {str:13,dex:15,con:10,int:7,wis:10,cha:6},   notes: 'Claw: Lähmung' },
  { name: 'Ogre',           icon: '🦣', cr: '2',   max_hp: 59,  armor_class: 11, speed: 40, stats: {str:19,dex:8,con:16,int:5,wis:7,cha:7},    notes: 'Large – Keule 2d8+4' },
  { name: 'Bandit',         icon: '🗡️', cr: '1/8', max_hp: 11,  armor_class: 12, speed: 30, stats: {str:11,dex:12,con:12,int:10,wis:10,cha:10},  notes: '' },
  { name: 'Bandit Captain', icon: '🎩', cr: '2',   max_hp: 65,  armor_class: 15, speed: 30, stats: {str:15,dex:16,con:14,int:14,wis:11,cha:14},  notes: 'Mehrfachangriff, Parieren' },
  { name: 'Drow',           icon: '🌑', cr: '1/4', max_hp: 13,  armor_class: 15, speed: 30, stats: {str:10,dex:14,con:10,int:11,wis:11,cha:12},  notes: 'Feyzauber, Sonnenphobie' },
  { name: 'Vampir Spawn',   icon: '🧛', cr: '5',   max_hp: 82,  armor_class: 15, speed: 30, stats: {str:16,dex:16,con:16,int:11,wis:10,cha:12},  notes: 'Regeneration 10' },
  { name: 'Troll',          icon: '🦴', cr: '5',   max_hp: 84,  armor_class: 15, speed: 30, stats: {str:18,dex:13,con:20,int:7,wis:9,cha:7},   notes: 'Regeneration 10 (Feuer/Säure)' },
  { name: 'Wyvern',         icon: '🐉', cr: '6',   max_hp: 110, armor_class: 13, speed: 20, stats: {str:19,dex:10,con:16,int:5,wis:12,cha:6},   notes: 'Fliegen 80, Giftstachel' },
  { name: 'Manticore',      icon: '🦁', cr: '3',   max_hp: 68,  armor_class: 14, speed: 30, stats: {str:17,dex:16,con:17,int:7,wis:12,cha:8},   notes: 'Fliegen 50, Schwanzstacheln' },
  { name: 'Minotaurus',     icon: '🐂', cr: '3',   max_hp: 114, armor_class: 14, speed: 40, stats: {str:18,dex:11,con:16,int:6,wis:16,cha:9},   notes: 'Charge, Gore' },
  { name: 'Hydra',          icon: '🐍', cr: '8',   max_hp: 172, armor_class: 15, speed: 30, stats: {str:20,dex:12,con:20,int:2,wis:10,cha:7},   notes: 'Fünf Köpfe, Regeneration' },
  { name: 'Mind Flayer',    icon: '🧠', cr: '7',   max_hp: 71,  armor_class: 15, speed: 30, stats: {str:11,dex:12,con:12,int:19,wis:17,cha:17},  notes: 'Psionischer Blitz' },
  { name: 'Schwarzdrache',  icon: '🖤', cr: '7',   max_hp: 127, armor_class: 18, speed: 40, stats: {str:19,dex:14,con:17,int:12,wis:11,cha:15},  notes: 'Fliegen 80, Säureatem' },
  { name: 'Roter Drache',   icon: '❤️', cr: '10',  max_hp: 178, armor_class: 18, speed: 40, stats: {str:23,dex:10,con:21,int:14,wis:11,cha:19},  notes: 'Fliegen 80, Feueratem' },
  { name: 'Lich',           icon: '💫', cr: '21',  max_hp: 135, armor_class: 17, speed: 30, stats: {str:11,dex:16,con:16,int:20,wis:14,cha:16},  notes: 'Legendär, Seelenglas' },
  { name: 'Beholder',       icon: '👁️', cr: '13',  max_hp: 180, armor_class: 18, speed: 0,  stats: {str:10,dex:14,con:18,int:17,wis:15,cha:17},  notes: 'Antimagie-Kegel, 10 Strahlen' },
  { name: 'Gelatinous Cube',icon: '🟩', cr: '2',   max_hp: 84,  armor_class: 6,  speed: 15, stats: {str:14,dex:3,con:20,int:1,wis:6,cha:1},     notes: 'Transparent, Umhüllung' },
]

// ─── Helper Functions ─────────────────────────────────────────────────────────
function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }
function statMod(v: number) { return Math.floor((v - 10) / 2) }
function rollDie(sides: number) { return Math.floor(Math.random() * sides) + 1 }
function parseSides(type: string) { return parseInt(type.slice(1)) }

function getSizeSpan(size: TokenSize | string | undefined): number {
  switch (size) {
    case 'tiny':       return 0.5
    case 'small':      return 1
    case 'large':      return 2
    case 'huge':       return 3
    case 'gargantuan': return 4
    case 'colossal':   return 5
    default:           return 1
  }
}

function getReachableCells(
  startCol: number, startRow: number, speedFeet: number, movementUsed: number,
  feetPerCell: number, gridCols: number, gridRows: number,
  difficultTerrain: { col: number; row: number }[], tokens: BattleToken[], selfId: string,
): Map<string, number> {
  const remaining = speedFeet - movementUsed
  if (remaining <= 0) return new Map<string, number>()
  const dtSet = new Set(difficultTerrain.map(d => `${d.col},${d.row}`))
  const occupied = new Set<string>()
  tokens.forEach(t => {
    if (t.id === selfId) return
    const span = Math.ceil(getSizeSpan(t.token_size || 'medium'))
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++)
        occupied.add(`${t.col + dc},${t.row + dr}`)
  })
  const dist = new Map<string, number>([[`${startCol},${startRow}`, 0]])
  const queue: { col: number; row: number; cost: number }[] = [{ col: startCol, row: startRow, cost: 0 }]
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const { col, row, cost } = queue.shift()!
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nc = col + dc, nr = row + dr
      const key = `${nc},${nr}`
      if (nc < 0 || nr < 0 || nc >= gridCols || nr >= gridRows) continue
      if (occupied.has(key)) continue
      const isHard = dtSet.has(key)
      const newCost = cost + (isHard ? feetPerCell * 2 : feetPerCell)
      if (newCost <= remaining && (!dist.has(key) || dist.get(key)! > newCost)) {
        dist.set(key, newCost)
        queue.push({ col: nc, row: nr, cost: newCost })
      }
    }
  }
  dist.delete(`${startCol},${startRow}`)
  return dist
}

function buildPath(
  start: { col: number; row: number }, target: { col: number; row: number },
  dist: Map<string, number>,
): { col: number; row: number }[] {
  const path: { col: number; row: number }[] = [target]
  let cur = target
  let safety = 0
  while ((cur.col !== start.col || cur.row !== start.row) && safety < 100) {
    safety++
    const curCost = dist.get(`${cur.col},${cur.row}`) ?? 0
    let best: { col: number; row: number } | null = null
    let bestCost = Infinity
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nc = cur.col + dc, nr = cur.row + dr
      const cost = (nc === start.col && nr === start.row) ? -1 : (dist.get(`${nc},${nr}`) ?? Infinity)
      if (cost < curCost && cost < bestCost) { best = { col: nc, row: nr }; bestCost = cost }
    }
    if (!best) break
    path.unshift(best)
    cur = best
  }
  return path
}

// ─── Token Modal ──────────────────────────────────────────────────────────────
const BLANK_TOKEN_FORM = {
  token_type: 'monster' as 'player' | 'monster' | 'npc',
  name: '', icon: '💀', cr: '',
  max_hp: '10', armor_class: '10', speed: '30', initiative: '0',
  str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10',
  notes: '', token_size: 'medium' as TokenSize,
}

function TokenModal({ initial, onSave, onClose, title }: {
  initial?: Partial<typeof BLANK_TOKEN_FORM>; onSave: (d: typeof BLANK_TOKEN_FORM) => void
  onClose: () => void; title: string
}) {
  const [form, setForm] = useState({ ...BLANK_TOKEN_FORM, ...initial })
  const [showIcons, setShowIcons] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-700/80 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <span className="text-2xl">{form.icon}</span>
          <p className="flex-1 font-bold text-zinc-100">{title}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Typ</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-700"
                value={form.token_type} onChange={e => setForm(f => ({ ...f, token_type: e.target.value as typeof f.token_type }))}>
                <option value="player">Spielerfigur</option>
                <option value="monster">Kreatur / Monster</option>
                <option value="npc">NPC / Verbündeter</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Name *</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700"
                placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          {/* Größe */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Größe</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-700"
              value={form.token_size} onChange={e => setForm(f => ({ ...f, token_size: e.target.value as TokenSize }))}>
              {TOKEN_SIZES.map(s => (
                <option key={s.id} value={s.id}>{s.label} ({s.gridLabel})</option>
              ))}
            </select>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Token-Symbol</label>
            <button onClick={() => setShowIcons(!showIcons)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 hover:border-zinc-500">
              <span className="text-xl">{form.icon}</span>
              <span className="text-zinc-400 text-xs">Symbol wählen</span>
              {showIcons ? <ChevronDown className="w-4 h-4 text-zinc-500 ml-auto" /> : <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />}
            </button>
            {showIcons && (
              <div className="mt-2 bg-zinc-900 rounded-xl p-3 border border-zinc-700">
                <div className="grid grid-cols-10 gap-1 max-h-52 overflow-y-auto">
                  {TOKEN_ICONS.map((icon, i) => (
                    <button key={i} onClick={() => { setForm(f => ({ ...f, icon })); setShowIcons(false) }}
                      className={`text-xl p-1.5 rounded-lg hover:bg-zinc-700 transition-colors ${form.icon === icon ? 'bg-red-900/30 ring-1 ring-red-700' : ''}`}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2 border-t border-zinc-700 pt-2">
                  <input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
                    placeholder="Eigenes Emoji…"
                    onChange={e => { if (e.target.value) setForm(f => ({ ...f, icon: e.target.value })) }} />
                </div>
              </div>
            )}
          </div>

          {/* Kampfwerte */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Kampfwerte</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'max_hp', label: 'Max HP' }, { key: 'armor_class', label: 'RK' },
                { key: 'speed', label: 'Speed ft' }, { key: 'initiative', label: 'Initiative' }, { key: 'cr', label: 'CR' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[9px] uppercase text-zinc-600 block mb-0.5">{label}</label>
                  <input type={key === 'cr' ? 'text' : 'number'}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-red-700"
                    value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Attribute */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Attribute</label>
            <div className="grid grid-cols-6 gap-2">
              {(['str','dex','con','int','wis','cha'] as const).map(ab => (
                <div key={ab} className="flex flex-col items-center">
                  <label className="text-[9px] uppercase text-zinc-600 mb-0.5">{ab.toUpperCase()}</label>
                  <input type="number" min={1} max={30}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-red-700"
                    value={(form as any)[ab]} onChange={e => setForm(f => ({ ...f, [ab]: e.target.value }))} />
                  <span className="text-[9px] text-zinc-600 mt-0.5">{modSign(statMod(parseInt((form as any)[ab]) || 10))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Fähigkeiten / Notizen</label>
            <textarea rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 resize-none"
              placeholder="Besondere Fähigkeiten, Traits…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200">Abbrechen</button>
          <button onClick={() => { if (form.name.trim()) onSave(form) }} disabled={!form.name.trim()}
            className="flex-1 py-2 rounded-lg bg-red-900 hover:bg-red-800 border border-red-700/60 disabled:opacity-40 text-sm font-bold text-zinc-100">
            <Save className="w-4 h-4 inline mr-1.5" />Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Token Piece ──────────────────────────────────────────────────────────────
function TokenPiece({ token, selected, cellSize, isMoving, isDragged }: {
  token: BattleToken; selected: boolean; cellSize: number; isMoving?: boolean; isDragged?: boolean
}) {
  const span = getSizeSpan(token.token_size || 'medium')
  const pixW = span >= 1 ? Math.round(span) * cellSize - 4 : Math.round(cellSize * span) - 2
  const pixH = pixW
  const hpPct = token.max_hp && token.current_hp !== null
    ? Math.max(0, Math.min(1, token.current_hp / token.max_hp)) : null
  const hpColor = hpPct === null ? '' : hpPct > 0.6 ? '#4ade80' : hpPct > 0.3 ? '#facc15' : '#f87171'
  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))
  const fontSize = Math.max(10, Math.min(pixW * 0.45, 32))

  const borderClass = isMoving
    ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
    : selected
      ? 'border-amber-500 shadow-lg shadow-amber-500/30 scale-105'
      : token.token_type === 'player'
        ? 'border-sky-700/70 shadow-sky-900/20'
        : token.token_type === 'monster'
          ? 'border-red-800/80 shadow-red-900/20'
          : 'border-zinc-600/60'

  const bgClass = token.token_type === 'player'
    ? 'bg-slate-800/85'
    : token.token_type === 'monster'
      ? 'bg-stone-900/90'
      : 'bg-zinc-800/80'

  return (
    <div style={{ width: pixW, height: pixH, userSelect: 'none', position: 'relative', opacity: isDragged ? 0.3 : 1 }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 transition-all shadow-md ${borderClass} ${bgClass}`}>
      <span style={{ fontSize, lineHeight: 1 }}>{token.icon}</span>
      {pixW >= 36 && (
        <span className="text-[8px] font-bold text-zinc-200/90 leading-tight max-w-full truncate px-0.5 mt-0.5">
          {token.name.slice(0, 9)}
        </span>
      )}
      {hpPct !== null && (
        <div className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full bg-black/50">
          <div style={{ width: `${hpPct * 100}%`, backgroundColor: hpColor }} className="h-full rounded-full" />
        </div>
      )}
      {token.is_hidden && (
        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-zinc-900 rounded-full flex items-center justify-center">
          <EyeOff className="w-2 h-2 text-zinc-500" />
        </div>
      )}
      {activeConds.length > 0 && (
        <div className="absolute top-0 left-0 flex gap-0.5 flex-wrap max-w-full">
          {activeConds.slice(0, 3).map(c => (
            <div key={c.id} className={`w-3.5 h-3.5 rounded-full ${c.bg} border ${c.border} flex items-center justify-center text-[7px]`} title={c.id}>
              {c.icon}
            </div>
          ))}
        </div>
      )}
      {token.token_size !== 'medium' && token.token_size !== 'small' && token.token_size !== 'tiny' && pixW >= 30 && (
        <div className="absolute bottom-0 right-0.5 text-[7px] text-zinc-400/80 font-bold bg-black/40 px-0.5 rounded">
          {token.token_size === 'large' ? 'L' : token.token_size === 'huge' ? 'H' :
           token.token_size === 'gargantuan' ? 'G' : 'K'}
        </div>
      )}
    </div>
  )
}

// ─── Token Panel ──────────────────────────────────────────────────────────────
function TokenPanel({ token, onUpdate, onDelete, onClose, onEdit, isGM, myFavorites, onRoll, ownToken, onStartMove, moveMode, movementInfo }: {
  token: BattleToken; onUpdate: (t: Partial<BattleToken>) => void; onDelete: () => void
  onClose: () => void; onEdit: () => void; isGM: boolean; myFavorites: DiceFavorite[]
  onRoll: (cfg: DiceConfig[], bonus: number, label: string) => void
  ownToken: boolean; onStartMove: () => void; moveMode: boolean
  movementInfo?: { used: number; speed: number; feetPerCell: number }
}) {
  const [hpInput, setHpInput] = useState('')
  const [showFavForm, setShowFavForm] = useState(false)
  const [newFavName, setNewFavName] = useState('')
  const [newFavAtk, setNewFavAtk] = useState('0')
  const [newFavDmg, setNewFavDmg] = useState('0')
  const [newFavDice, setNewFavDice] = useState<DiceConfig[]>([])
  const [showCondPicker, setShowCondPicker] = useState(false)
  const canEdit = isGM || ownToken
  const DICE_TYPES = ['d4','d6','d8','d10','d12','d20']
  const remainingMove = movementInfo ? movementInfo.speed - movementInfo.used : null

  const applyHp = (delta: number) => {
    const cur = token.current_hp ?? token.max_hp ?? 0
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, cur + delta)) })
  }
  const applyHpAbsolute = (v: number) => {
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, v)) })
  }
  const addFavoriteAction = () => {
    if (!newFavName.trim() || newFavDice.length === 0) return
    onUpdate({ favorite_actions: [...(token.favorite_actions ?? []), {
      name: newFavName.trim(), attack_bonus: parseInt(newFavAtk)||0,
      damage_bonus: parseInt(newFavDmg)||0, dice_config: newFavDice,
    }]})
    setNewFavName(''); setNewFavAtk('0'); setNewFavDmg('0'); setNewFavDice([]); setShowFavForm(false)
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
  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))
  const availConds = CONDITIONS.filter(c => !token.conditions.includes(c.id))

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 w-72">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{token.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-zinc-100 truncate">{token.name}</p>
          <p className="text-xs text-zinc-500">
            {token.token_type === 'player' ? 'Spielerfigur' : token.token_type === 'monster' ? 'Kreatur' : 'NPC'}
            {token.challenge_rating && ` · CR ${token.challenge_rating}`}
          </p>
        </div>
        <div className="flex gap-1">
          {canEdit && <button onClick={onEdit} className="p-1 text-zinc-500 hover:text-amber-400" title="Bearbeiten"><Edit2 className="w-3.5 h-3.5" /></button>}
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Quick Size Change */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-semibold text-zinc-600 whitespace-nowrap">Größe</span>
          <select
            className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-red-700"
            value={token.token_size ?? 'medium'}
            onChange={e => onUpdate({ token_size: e.target.value as TokenSize })}
          >
            {TOKEN_SIZES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.gridLabel})</option>)}
          </select>
        </div>
      )}

      {/* Bewegung */}
      {(ownToken || isGM) && (token.speed ?? 0) > 0 && (
        <div className="space-y-1">
          {movementInfo && (
            <div className="flex items-center gap-2 text-xs">
              <Footprints className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-zinc-400">Bewegung</span>
              <span className={`ml-auto font-bold tabular-nums ${remainingMove === 0 ? 'text-red-400' : 'text-sky-300'}`}>
                {remainingMove} / {movementInfo.speed} ft
              </span>
            </div>
          )}
          {movementInfo && movementInfo.speed > 0 && (
            <div className="h-1.5 rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-sky-700 transition-all"
                style={{ width: `${Math.max(0, (remainingMove! / movementInfo.speed) * 100)}%` }} />
            </div>
          )}
          <button onClick={onStartMove}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              moveMode
                ? 'bg-emerald-900/30 border-emerald-700/60 text-emerald-300'
                : remainingMove === 0
                  ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-sky-900/20 border-sky-700/40 text-sky-300 hover:bg-sky-900/40'
            }`}
            disabled={remainingMove === 0 && !moveMode}>
            <Move className="w-3.5 h-3.5" />
            {moveMode ? 'Bewegungsmodus aktiv' : remainingMove === 0 ? 'Keine Bewegung mehr' : 'Bewegen (Klick-Modus)'}
          </button>
          <p className="text-[10px] text-zinc-600 text-center">oder: Token ziehen / Pfeiltasten</p>
        </div>
      )}

      {/* HP */}
      {token.max_hp !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-red-700" />
            <span className="text-xs text-zinc-400">Trefferpunkte</span>
            <span className="ml-auto text-sm font-bold text-zinc-100 tabular-nums">{token.current_hp} / {token.max_hp}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, ((token.current_hp ?? 0) / (token.max_hp ?? 1)) * 100))}%`,
                backgroundColor: (() => { const p = (token.current_hp ?? 0) / (token.max_hp ?? 1); return p > 0.6 ? '#4ade80' : p > 0.3 ? '#facc15' : '#f87171' })() }} />
          </div>
          {canEdit && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[-10,-5,-1,1,5,10].map(d => (
                  <button key={d} onClick={() => applyHp(d)}
                    className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${
                      d < 0 ? 'bg-red-950/50 border-red-800/60 text-red-300 hover:bg-red-900/70'
                            : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                    }`}>{d > 0 ? `+${d}` : d}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="HP setzen" value={hpInput} onChange={e => setHpInput(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-red-700" />
                <button onClick={() => { applyHpAbsolute(parseInt(hpInput)||0); setHpInput('') }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-700 text-xs text-zinc-300 hover:bg-zinc-600">Setzen</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {token.armor_class !== null && (
          <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
            <Shield className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold text-zinc-100">{token.armor_class}</p>
            <p className="text-[10px] text-zinc-600">Rüstung</p>
          </div>
        )}
        {token.speed !== null && (
          <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
            <Zap className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold text-zinc-100">{token.speed}</p>
            <p className="text-[10px] text-zinc-600">ft/Runde</p>
          </div>
        )}
        {token.initiative !== null && (
          <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
            <p className="text-sm font-bold text-amber-500">{modSign(token.initiative)}</p>
            <p className="text-[10px] text-zinc-600">Ini</p>
          </div>
        )}
      </div>

      {/* Ability Scores */}
      {token.stats && (
        <div className="grid grid-cols-6 gap-1">
          {['str','dex','con','int','wis','cha'].map(ab => (
            <div key={ab} className="text-center">
              <p className="text-[9px] text-zinc-600 uppercase">{ab}</p>
              <p className="text-[11px] font-bold text-zinc-200">{modSign(statMod(token.stats![ab] ?? 10))}</p>
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
            <button onClick={() => setShowCondPicker(!showCondPicker)}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200">
              + Zustand
            </button>
            {showCondPicker && availConds.length > 0 && (
              <div className="absolute bottom-7 left-0 z-10 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl w-56 max-h-48 overflow-y-auto">
                {availConds.map(c => (
                  <button key={c.id} onClick={() => { onUpdate({ conditions: [...token.conditions, c.id] }); setShowCondPicker(false) }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-zinc-800 ${c.color}`}>
                    {c.icon} {c.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {token.notes && <p className="text-xs text-zinc-500 bg-zinc-800/40 rounded p-2 italic border border-zinc-700/40">{token.notes}</p>}

      {/* Token Aktionen */}
      {((token.favorite_actions?.length ?? 0) > 0 || (isGM && token.token_type !== 'player')) && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-zinc-600 flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> Angriffe
            </p>
            {isGM && <button onClick={() => setShowFavForm(!showFavForm)} className="text-[10px] text-amber-600 hover:text-amber-400">+ Aktion</button>}
          </div>
          {(token.favorite_actions ?? []).map((fa, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{fa.name}</p>
                <p className="text-[10px] text-zinc-500">
                  Atk {modSign(fa.attack_bonus)} · {fa.dice_config.map(c => `${c.count}×${c.type}`).join('+')}
                  {fa.damage_bonus !== 0 ? modSign(fa.damage_bonus) : ''}
                </p>
              </div>
              <button onClick={() => onRoll([{type:'d20',count:1}], fa.attack_bonus, `${token.name}: ${fa.name} Atk`)}
                className="px-1.5 py-1 rounded bg-amber-900/40 border border-amber-700/50 text-[10px] text-amber-200 hover:bg-amber-900/70">Atk</button>
              <button onClick={() => onRoll(fa.dice_config, fa.damage_bonus, `${token.name}: ${fa.name} Schaden`)}
                className="px-1.5 py-1 rounded bg-red-950/50 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">Dmg</button>
              {isGM && (
                <button onClick={() => onUpdate({ favorite_actions: token.favorite_actions.filter((_, idx) => idx !== i) })}
                  className="text-zinc-700 hover:text-red-500"><X className="w-3 h-3" /></button>
              )}
            </div>
          ))}
          {showFavForm && isGM && (
            <div className="bg-zinc-800/40 rounded-lg p-2.5 space-y-2 border border-zinc-700/60">
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                placeholder="Aktionsname…" value={newFavName} onChange={e => setNewFavName(e.target.value)} />
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-zinc-600">Atk Bonus</label>
                  <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                    value={newFavAtk} onChange={e => setNewFavAtk(e.target.value)} />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-600">Schad Bonus</label>
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
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cnt > 0 ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                        {cnt > 0 ? `${cnt}×` : ''}{t}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowFavForm(false)} className="flex-1 py-1 rounded-lg bg-zinc-700 text-xs text-zinc-400">Abbrechen</button>
                <button onClick={addFavoriteAction} disabled={!newFavName.trim() || newFavDice.length === 0}
                  className="flex-1 py-1 rounded-lg bg-red-900 disabled:opacity-40 text-xs text-white font-semibold">
                  <BookmarkCheck className="w-3 h-3 inline mr-1" />Hinzufügen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Würfelfavoriten */}
      {(ownToken || (isGM && token.token_type === 'player')) && myFavorites.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <p className="text-[10px] uppercase font-semibold text-zinc-600 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-sky-600" /> Würfelfavoriten
          </p>
          {myFavorites.map(fav => (
            <div key={fav.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-950/20 border border-sky-900/40">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{fav.name}</p>
                <p className="text-[10px] text-zinc-600">Atk {modSign(fav.attack_bonus)}</p>
              </div>
              <button onClick={() => onRoll([{type:'d20',count:1}], fav.attack_bonus, `${fav.name} Angriff`)}
                className="px-1.5 py-1 rounded bg-amber-900/30 border border-amber-700/50 text-[10px] text-amber-200 hover:bg-amber-900/50">Atk</button>
              {(fav.dice_config?.length ?? 0) > 0 && (
                <button onClick={() => onRoll(fav.dice_config, fav.damage_bonus, `${fav.name} Schaden`)}
                  className="px-1.5 py-1 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">Dmg</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GM Controls */}
      {isGM && (
        <div className="flex gap-2 pt-1 border-t border-zinc-800">
          <button onClick={() => onUpdate({ is_hidden: !token.is_hidden })}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200">
            {token.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {token.is_hidden ? 'Sichtbar' : 'Verstecken'}
          </button>
          <button onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-500 hover:text-red-300">
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

  // Core
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
  const [gmRollsVisible, setGmRollsVisible] = useState(true)
  const [myTokenInitial, setMyTokenInitial] = useState<Partial<typeof BLANK_TOKEN_FORM>>({ token_type: 'player', icon: '🧙' })
  const [hoverCoord, setHoverCoord] = useState<{col:number;row:number} | null>(null)

  // Movement
  const [moveMode, setMoveMode] = useState(false)
  const [movingTokenId, setMovingTokenId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<{ col: number; row: number } | null>(null)
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null)

  // Terrain / Effects
  const [terrainMode, setTerrainMode] = useState(false)
  const [effectMode, setEffectMode] = useState<string | null>(null)
  const [showEffectsPanel, setShowEffectsPanel] = useState(false)
  const [pendingEffect, setPendingEffect] = useState<{ col: number; row: number; type: string } | null>(null)
  const [pendingRadius, setPendingRadius] = useState(3)
  const [pendingDirection, setPendingDirection] = useState(0)
  const [pendingAngle, setPendingAngle] = useState(60)
  const [pendingColor, setPendingColor] = useState('#ff2200')

  // Grid resize
  const [isDraggingResize, setIsDraggingResize] = useState(false)
  const [resizeDragStart, setResizeDragStart] = useState({ x: 0, y: 0, cellSize: 50, canvasW: 1200, canvasH: 800 })

  // Drag & Drop
  // All drag state in ref to avoid stale closures
  const dragStateRef = useRef<{
    tokenId: string; startX: number; startY: number
    dragging: boolean; hoverCol: number | null; hoverRow: number | null
  } | null>(null)
  const [dragRender, setDragRender] = useState<{ tokenId: string; hoverCell: { col: number; row: number } | null } | null>(null)

  const mapRef = useRef<HTMLDivElement>(null)
  const activeMapRef = useRef<BattleMap | null>(null)
  useEffect(() => { activeMapRef.current = activeMap }, [activeMap])

  // ── Computed ──
  const cs = activeMap?.cell_size ?? 50
  const ox = activeMap?.grid_offset_x ?? 0
  const oy = activeMap?.grid_offset_y ?? 0

  const reachableCells = useMemo(() => {
    if (!moveMode || !movingTokenId || !activeMap) return new Map<string, number>()
    const token = tokens.find(t => t.id === movingTokenId)
    if (!token || !token.speed) return new Map<string, number>()
    return getReachableCells(
      token.col, token.row, token.speed, token.movement_used ?? 0,
      activeMap.feet_per_cell ?? 5, activeMap.grid_cols, activeMap.grid_rows,
      activeMap.difficult_terrain ?? [], tokens, movingTokenId,
    )
  }, [moveMode, movingTokenId, tokens, activeMap])

  const movePath = useMemo(() => {
    if (!moveMode || !movingTokenId || !hoverCell) return []
    const token = tokens.find(t => t.id === movingTokenId)
    if (!token) return []
    const key = `${hoverCell.col},${hoverCell.row}`
    if (!reachableCells.has(key)) return []
    return buildPath({ col: token.col, row: token.row }, hoverCell, reachableCells)
  }, [moveMode, movingTokenId, hoverCell, reachableCells, tokens])

  // ── Global drag & drop handlers (registered once) ──
  useEffect(() => {
    const THRESHOLD = 6
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current
      if (!ds) return
      if (!ds.dragging) {
        const dist = Math.sqrt((e.clientX - ds.startX) ** 2 + (e.clientY - ds.startY) ** 2)
        if (dist > THRESHOLD) {
          ds.dragging = true
          setDragRender({ tokenId: ds.tokenId, hoverCell: null })
          setSelectedToken(ds.tokenId)
        }
        return
      }
      const map = activeMapRef.current
      if (!map || !mapRef.current) return
      const rect = mapRef.current.getBoundingClientRect()
      const col = Math.floor((e.clientX - rect.left - (map.grid_offset_x ?? 0)) / map.cell_size)
      const row = Math.floor((e.clientY - rect.top - (map.grid_offset_y ?? 0)) / map.cell_size)
      const valid = col >= 0 && row >= 0 && col < map.grid_cols && row < map.grid_rows
      ds.hoverCol = valid ? col : null
      ds.hoverRow = valid ? row : null
      setDragRender({ tokenId: ds.tokenId, hoverCell: valid ? { col, row } : null })
    }

    const onUp = async () => {
      const ds = dragStateRef.current
      if (!ds) return
      if (!ds.dragging) {
        // was a click: toggle selection
        setSelectedToken(prev => prev === ds.tokenId ? null : ds.tokenId)
      } else if (ds.hoverCol !== null && ds.hoverRow !== null) {
        const col = ds.hoverCol, row = ds.hoverRow
        const tokenId = ds.tokenId
        await supabase.from('battle_tokens').update({ col, row }).eq('id', tokenId)
        setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, col, row } : t))
      }
      dragStateRef.current = null
      setDragRender(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [supabase]) // only supabase in deps; all other values via refs

  // ── Arrow key movement ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedToken || !activeMap) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      }
      const dir = dirs[e.key]
      if (!dir) return
      e.preventDefault()
      const token = tokens.find(t => t.id === selectedToken)
      if (!token) return
      const canMove = isGM || token.player_user_id === user?.id
      if (!canMove) return
      const nc = token.col + dir[0], nr = token.row + dir[1]
      if (nc < 0 || nr < 0 || nc >= activeMap.grid_cols || nr >= activeMap.grid_rows) return
      const span = Math.max(1, Math.ceil(getSizeSpan(token.token_size)))
      const blocked = tokens.some(other => {
        if (other.id === token.id) return false
        const os = Math.max(1, Math.ceil(getSizeSpan(other.token_size)))
        return !(nc + span <= other.col || nc >= other.col + os || nr + span <= other.row || nr >= other.row + os)
      })
      if (blocked) return
      const fpc = activeMap.feet_per_cell ?? 5
      const dtSet = new Set((activeMap.difficult_terrain ?? []).map(d => `${d.col},${d.row}`))
      const cost = dtSet.has(`${nc},${nr}`) ? fpc * 2 : fpc
      const newUsed = (token.movement_used ?? 0) + cost
      const canAfford = isGM || token.speed === null || newUsed <= token.speed
      if (!canAfford) return
      const patch: Partial<BattleToken> = { col: nc, row: nr }
      if (token.speed !== null) patch.movement_used = newUsed
      supabase.from('battle_tokens').update(patch).eq('id', token.id)
      setTokens(prev => prev.map(t => t.id === token.id ? { ...t, ...patch } : t))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedToken, tokens, activeMap, isGM, user, supabase])

  // ── Grid resize mouse handlers (fixed) ──
  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingResize || !activeMap) return
    const delta = ((e.clientX - resizeDragStart.x) + (e.clientY - resizeDragStart.y)) / 2
    const newSize = Math.max(20, Math.min(150, Math.round(resizeDragStart.cellSize + delta)))
    // Keep canvas dimensions constant — only change grid resolution
    const newCols = Math.max(4, Math.round(resizeDragStart.canvasW / newSize))
    const newRows = Math.max(4, Math.round(resizeDragStart.canvasH / newSize))
    setActiveMap(prev => prev ? { ...prev, cell_size: newSize, grid_cols: newCols, grid_rows: newRows } : prev)
  }, [isDraggingResize, resizeDragStart, activeMap])

  const handleResizeMouseUp = useCallback(async () => {
    if (!isDraggingResize || !activeMap) return
    setIsDraggingResize(false)
    await supabase.from('battle_maps').update({
      cell_size: activeMap.cell_size,
      grid_cols: activeMap.grid_cols,
      grid_rows: activeMap.grid_rows,
    }).eq('id', activeMap.id)
  }, [isDraggingResize, activeMap, supabase])

  useEffect(() => {
    if (isDraggingResize) {
      window.addEventListener('mousemove', handleResizeMouseMove)
      window.addEventListener('mouseup', handleResizeMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove)
        window.removeEventListener('mouseup', handleResizeMouseUp)
      }
    }
  }, [isDraggingResize, handleResizeMouseMove, handleResizeMouseUp])

  // ── Load ──
  useEffect(() => { const s = localStorage.getItem('gm-rolls-visible'); if (s !== null) setGmRollsVisible(s === 'true') }, [])

  const loadMaps = useCallback(async () => {
    const { data } = await supabase.from('battle_maps').select('*').order('created_at', { ascending: false })
    const parsed = (data ?? []).map((m: any) => ({
      ...m, difficult_terrain: m.difficult_terrain ?? [], map_effects: m.map_effects ?? [],
      feet_per_cell: m.feet_per_cell ?? 5, grid_locked: m.grid_locked !== false,
    }))
    setMaps(parsed)
    if (!activeMap && parsed[0]) setActiveMap(parsed[0])
  }, [supabase, activeMap])

  const loadTokens = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_tokens').select('*').eq('map_id', mapId)
    setTokens((data ?? []).map((t: any) => ({
      ...t, conditions: t.conditions ?? [], favorite_actions: t.favorite_actions ?? [],
      token_size: t.token_size ?? 'medium', movement_used: t.movement_used ?? 0,
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
    const cols = parseInt(newMapForm.grid_cols) || 24
    const rows = parseInt(newMapForm.grid_rows) || 16
    const size = parseInt(newMapForm.cell_size) || 50
    const { data } = await supabase.from('battle_maps').insert({
      name: newMapForm.name || 'Neue Karte',
      image_url: newMapForm.image_url || null,
      grid_cols: cols, grid_rows: rows, cell_size: size,
      is_active: true, created_by: user.id,
      grid_opacity: 0.15, grid_offset_x: 0, grid_offset_y: 0,
      difficult_terrain: [], map_effects: [], feet_per_cell: 5, grid_locked: true,
    }).select().single()
    if (data) { setActiveMap(data as BattleMap); setShowMapForm(false); loadMaps() }
  }

  const updateMap = async (patch: Partial<BattleMap>) => {
    if (!activeMap) return
    const updated = { ...activeMap, ...patch }
    setActiveMap(updated)
    await supabase.from('battle_maps').update(patch).eq('id', activeMap.id)
  }

  // ── Token CRUD ──
  const addTokenFromForm = async (form: typeof BLANK_TOKEN_FORM, override?: { player_user_id?: string }) => {
    if (!activeMap || !user) return
    await supabase.from('battle_tokens').insert({
      map_id: activeMap.id, token_type: form.token_type,
      name: form.name, icon: form.icon, col: 0, row: 0,
      max_hp: parseInt(form.max_hp) || null, current_hp: parseInt(form.max_hp) || null,
      armor_class: parseInt(form.armor_class) || null, speed: parseInt(form.speed) || null,
      initiative: parseInt(form.initiative) || 0, challenge_rating: form.cr || null,
      conditions: [], notes: form.notes || null,
      stats: { str:parseInt(form.str)||10, dex:parseInt(form.dex)||10, con:parseInt(form.con)||10,
               int:parseInt(form.int)||10, wis:parseInt(form.wis)||10, cha:parseInt(form.cha)||10 },
      is_hidden: false, favorite_actions: [],
      player_user_id: override?.player_user_id ?? null,
      token_size: form.token_size, movement_used: 0,
    })
    loadTokens(activeMap.id); setShowAddModal(false); setShowMonsterLib(false)
  }

  const addFromTemplate = (m: MonsterTemplate) => {
    if (!activeMap || !user) return
    supabase.from('battle_tokens').insert({
      map_id: activeMap.id, token_type: 'monster',
      name: m.name, icon: m.icon, col: 0, row: 0,
      max_hp: m.max_hp, current_hp: m.max_hp, armor_class: m.armor_class,
      speed: m.speed, initiative: 0, challenge_rating: m.cr,
      conditions: [], notes: m.notes || null, stats: m.stats,
      is_hidden: false, favorite_actions: [], player_user_id: null,
      token_size: 'medium', movement_used: 0,
    }).then(() => loadTokens(activeMap.id))
    setShowMonsterLib(false)
  }

  const updateToken = async (id: string, patch: Partial<BattleToken>) => {
    await supabase.from('battle_tokens').update(patch).eq('id', id)
    setTokens(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const saveEditedToken = async (form: typeof BLANK_TOKEN_FORM) => {
    if (!editingToken) return
    await updateToken(editingToken.id, {
      name: form.name, icon: form.icon, token_type: form.token_type,
      max_hp: parseInt(form.max_hp) || null, armor_class: parseInt(form.armor_class) || null,
      speed: parseInt(form.speed) || null, initiative: parseInt(form.initiative) || 0,
      challenge_rating: form.cr || null, notes: form.notes || null, token_size: form.token_size,
      stats: { str:parseInt(form.str)||10, dex:parseInt(form.dex)||10, con:parseInt(form.con)||10,
               int:parseInt(form.int)||10, wis:parseInt(form.wis)||10, cha:parseInt(form.cha)||10 },
    })
    setEditingToken(null)
  }

  const deleteToken = async (id: string) => {
    await supabase.from('battle_tokens').delete().eq('id', id)
    setTokens(prev => prev.filter(t => t.id !== id))
    if (selectedToken === id) { setSelectedToken(null); setMoveMode(false); setMovingTokenId(null) }
  }

  const addMyPlayerToken = async () => {
    let initial: Partial<typeof BLANK_TOKEN_FORM> = { token_type: 'player', icon: '🧙' }
    if (user) {
      const { data } = await supabase.from('character_links').select('full_data, character_name').eq('user_id', user.id).maybeSingle()
      if (data?.full_data) {
        const fd = data.full_data as CharacterFullData
        initial = {
          token_type: 'player', name: fd.character_name || data.character_name || '',
          max_hp: String(fd.max_hp || 10), armor_class: String(fd.armor_class || 10),
          speed: String(fd.speed || 30), initiative: String(fd.initiative || 0),
          str: String(fd.stats?.str || 10), dex: String(fd.stats?.dex || 10),
          con: String(fd.stats?.con || 10), int: String(fd.stats?.int || 10),
          wis: String(fd.stats?.wis || 10), cha: String(fd.stats?.cha || 10), icon: '🧙',
        }
      }
    }
    setMyTokenInitial(initial); setShowAddModal(true)
  }

  const myToken = tokens.find(t => t.player_user_id === user?.id)

  // ── Token drag handler ──
  const handleTokenMouseDown = useCallback((e: React.MouseEvent, token: BattleToken) => {
    const canEdit = isGM || token.player_user_id === user?.id
    if (!canEdit || terrainMode || effectMode || moveMode) return
    e.preventDefault(); e.stopPropagation()
    dragStateRef.current = {
      tokenId: token.id, startX: e.clientX, startY: e.clientY,
      dragging: false, hoverCol: null, hoverRow: null,
    }
  }, [isGM, user, terrainMode, effectMode, moveMode])

  // ── Movement handlers ──
  const startMove = (tokenId: string) => {
    if (moveMode && movingTokenId === tokenId) {
      setMoveMode(false); setMovingTokenId(null); setMoveTarget(null)
    } else {
      setMoveMode(true); setMovingTokenId(tokenId); setMoveTarget(null)
    }
  }

  const confirmMove = async () => {
    if (!moveTarget || !movingTokenId || !activeMap) return
    const token = tokens.find(t => t.id === movingTokenId)
    if (!token) return
    const cost = reachableCells.get(`${moveTarget.col},${moveTarget.row}`) ?? 0
    await updateToken(movingTokenId, { col: moveTarget.col, row: moveTarget.row, movement_used: (token.movement_used ?? 0) + cost })
    setMoveMode(false); setMovingTokenId(null); setMoveTarget(null); setHoverCell(null)
  }

  const cancelMove = () => { setMoveMode(false); setMovingTokenId(null); setMoveTarget(null); setHoverCell(null) }
  const resetAllMovement = async () => {
    if (!activeMap) return
    await Promise.all(tokens.map(t => supabase.from('battle_tokens').update({ movement_used: 0 }).eq('id', t.id)))
    setTokens(prev => prev.map(t => ({ ...t, movement_used: 0 })))
  }

  // ── Terrain / Effects ──
  const toggleTerrain = (col: number, row: number) => {
    if (!activeMap) return
    const dt = activeMap.difficult_terrain ?? []
    const idx = dt.findIndex(d => d.col === col && d.row === row)
    updateMap({ difficult_terrain: idx === -1 ? [...dt, { col, row }] : dt.filter((_, i) => i !== idx) })
  }

  const placeSimpleEffect = (col: number, row: number, type: string) => {
    if (!activeMap) return
    const et = EFFECT_TYPES.find(e => e.id === type)
    updateMap({ map_effects: [...(activeMap.map_effects ?? []), {
      id: `${Date.now()}-${Math.random()}`, type, col, row,
      icon: et?.icon ?? '❓', color: et?.color ?? '#ff0000', label: et?.label,
    }]})
  }

  const placeAoeEffect = () => {
    if (!pendingEffect || !activeMap) return
    const et = EFFECT_TYPES.find(e => e.id === pendingEffect.type)
    updateMap({ map_effects: [...(activeMap.map_effects ?? []), {
      id: `${Date.now()}-${Math.random()}`, type: pendingEffect.type,
      col: pendingEffect.col, row: pendingEffect.row,
      icon: et?.icon ?? '⭕', color: pendingColor,
      radius: pendingEffect.type === 'circle' || pendingEffect.type === 'aura' ? pendingRadius : undefined,
      length: pendingEffect.type === 'line' ? pendingRadius : undefined,
      angle: pendingEffect.type === 'cone' ? pendingAngle : undefined,
      direction: (pendingEffect.type === 'cone' || pendingEffect.type === 'line') ? pendingDirection : undefined,
    }]})
    setPendingEffect(null)
  }

  const removeEffect = (id: string) => {
    if (!activeMap) return
    updateMap({ map_effects: (activeMap.map_effects ?? []).filter(e => e.id !== id) })
  }

  // ── Grid click / move ──
  const getCellFromEvent = (e: React.MouseEvent) => {
    if (!activeMap || !mapRef.current) return null
    const rect = mapRef.current.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left - ox) / cs)
    const row = Math.floor((e.clientY - rect.top - oy) / cs)
    if (col < 0 || row < 0 || col >= activeMap.grid_cols || row >= activeMap.grid_rows) return null
    return { col, row }
  }

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRender?.tokenId) return // don't process click during drag
    const cell = getCellFromEvent(e)
    if (!cell) return
    if (terrainMode && isGM) { toggleTerrain(cell.col, cell.row); return }
    if (effectMode) {
      const et = EFFECT_TYPES.find(x => x.id === effectMode)
      if (et?.simple) placeSimpleEffect(cell.col, cell.row, effectMode)
      else setPendingEffect({ col: cell.col, row: cell.row, type: effectMode })
      return
    }
    if (moveMode && movingTokenId) {
      if (reachableCells.has(`${cell.col},${cell.row}`)) setMoveTarget(cell)
      return
    }
    const clickedToken = visibleTokens.find(t => {
      const span = Math.max(1, Math.ceil(getSizeSpan(t.token_size || 'medium')))
      return cell.col >= t.col && cell.col < t.col + span && cell.row >= t.row && cell.row < t.row + span
    })
    setSelectedToken(clickedToken ? (clickedToken.id === selectedToken ? null : clickedToken.id) : null)
  }

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cell = getCellFromEvent(e)
    setHoverCoord(cell)
    if (moveMode) setHoverCell(cell)
    else setHoverCell(null)
  }

  // ── Roll ──
  const performRoll = async (cfg: DiceConfig[], mod: number, lbl: string) => {
    if (!user || cfg.length === 0) return
    const results = cfg.map(c => Array.from({ length: c.count }, () => rollDie(parseSides(c.type))))
    const total = results.flat().reduce((s, n) => s + n, 0) + mod
    await supabase.from('dice_rolls').insert({
      user_id: user.id, dice_config: cfg, results, total,
      label: lbl || null, visible_to_players: isGM ? gmRollsVisible : true,
    })
  }

  const sel = selectedToken ? tokens.find(t => t.id === selectedToken) ?? null : null
  const visibleTokens = isGM ? tokens : tokens.filter(t => !t.is_hidden)
  const movingToken = movingTokenId ? tokens.find(t => t.id === movingTokenId) : null

  // ── SVG helpers ──
  const cellPx = (col: number, row: number) => ({ x: col * cs + ox, y: row * cs + oy })

  const renderAoeCircle = (eff: MapEffect) => {
    const cx = (eff.col + 0.5) * cs + ox, cy = (eff.row + 0.5) * cs + oy
    const r = (eff.radius ?? 3) * cs
    return (
      <g key={eff.id}>
        <circle cx={cx} cy={cy} r={r} fill={`${eff.color}1a`} stroke={eff.color} strokeWidth="2" strokeDasharray="8 4" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="16">{eff.icon ?? '⭕'}</text>
      </g>
    )
  }

  const renderAoeCone = (eff: MapEffect) => {
    const ax = (eff.col + 0.5) * cs + ox, ay = (eff.row + 0.5) * cs + oy
    const dir = ((eff.direction ?? 0) * Math.PI) / 180
    const half = ((eff.angle ?? 60) / 2 * Math.PI) / 180
    const len = (eff.radius ?? 4) * cs
    const x1 = ax + len * Math.cos(dir - half), y1 = ay + len * Math.sin(dir - half)
    const x2 = ax + len * Math.cos(dir + half), y2 = ay + len * Math.sin(dir + half)
    return (
      <g key={eff.id}>
        <polygon points={`${ax},${ay} ${x1},${y1} ${x2},${y2}`}
          fill={`${eff.color}28`} stroke={eff.color} strokeWidth="2" strokeDasharray="8 4" />
        <text x={ax + len * 0.45 * Math.cos(dir)} y={ay + len * 0.45 * Math.sin(dir)}
          textAnchor="middle" dominantBaseline="middle" fontSize="14">{eff.icon ?? '🔺'}</text>
      </g>
    )
  }

  const renderAoeLine = (eff: MapEffect) => {
    const ax = (eff.col + 0.5) * cs + ox, ay = (eff.row + 0.5) * cs + oy
    const dir = ((eff.direction ?? 0) * Math.PI) / 180
    const len = (eff.length ?? 4) * cs
    const ex = ax + len * Math.cos(dir), ey = ay + len * Math.sin(dir)
    return (
      <g key={eff.id}>
        <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={eff.color} strokeWidth={cs * 0.6} strokeOpacity="0.25" strokeLinecap="round" />
        <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={eff.color} strokeWidth="3" strokeDasharray="8 4" />
      </g>
    )
  }

  const renderAoeAura = (eff: MapEffect) => {
    const cx = (eff.col + 0.5) * cs + ox, cy = (eff.row + 0.5) * cs + oy
    const r = (eff.radius ?? 2) * cs
    return (
      <g key={eff.id}>
        <circle cx={cx} cy={cy} r={r} fill={`${eff.color}15`} stroke={eff.color} strokeWidth="2" strokeDasharray="4 2" />
        <circle cx={cx} cy={cy} r={cs * 0.4} fill={`${eff.color}40`} stroke={eff.color} strokeWidth="1" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14">{eff.icon ?? '🌟'}</text>
      </g>
    )
  }

  // ── Drag snap preview validity check ──
  const isDragCellValid = dragRender?.hoverCell ? (() => {
    const dtoken = tokens.find(t => t.id === dragRender.tokenId)
    if (!dtoken || !dragRender.hoverCell) return false
    const span = Math.max(1, Math.ceil(getSizeSpan(dtoken.token_size)))
    const { col, row } = dragRender.hoverCell
    return !tokens.some(other => {
      if (other.id === dtoken.id) return false
      const os = Math.max(1, Math.ceil(getSizeSpan(other.token_size)))
      return !(col + span <= other.col || col >= other.col + os || row + span <= other.row || row >= other.row + os)
    })
  })() : false

  const effectCategories = ['hazard', 'terrain', 'magic', 'aoe'] as const
  const catLabel: Record<string, string> = { hazard: 'Gefahren', terrain: 'Gelände', magic: 'Magie', aoe: 'Flächeneffekte' }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-zinc-950">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 flex-wrap">
        <MapIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <span className="text-sm font-bold text-zinc-300 tracking-wide">Spielfeld</span>

        {maps.length > 0 && (
          <select className="bg-zinc-800/80 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
            value={activeMap?.id ?? ''}
            onChange={e => { const m = maps.find(x => x.id === e.target.value); if (m) setActiveMap(m) }}>
            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}

        <div className="flex gap-1.5 flex-wrap items-center">
          {isGM && (
            <>
              <button onClick={() => setShowMapForm(!showMapForm)}
                className="flex items-center gap-1 px-2 py-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
                <Plus className="w-3 h-3" /> Karte
              </button>
              {activeMap && (
                <>
                  <button onClick={() => setShowGridControls(!showGridControls)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${showGridControls ? 'bg-zinc-700/60 border-zinc-500 text-zinc-200' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    <SlidersHorizontal className="w-3 h-3" /> Gitter
                  </button>
                  <button
                    onClick={() => updateMap({ grid_locked: !(activeMap.grid_locked) })}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${
                      !activeMap.grid_locked ? 'bg-amber-900/30 border-amber-700/60 text-amber-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'
                    }`}
                    title={activeMap.grid_locked ? 'Gitter entsperren' : 'Gitter sperren'}>
                    {activeMap.grid_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {activeMap.grid_locked ? 'Gesperrt' : 'Entsperrt'}
                  </button>
                  <button onClick={() => { setTerrainMode(!terrainMode); setEffectMode(null) }}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${terrainMode ? 'bg-orange-950/40 border-orange-700/60 text-orange-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    Schwieriges Gelände
                  </button>
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-zinc-700/60 border border-zinc-600/60 text-xs text-zinc-300 hover:bg-zinc-700">
                    <Plus className="w-3 h-3" /> Token
                  </button>
                  <button onClick={() => setShowMonsterLib(!showMonsterLib)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-red-950/40 border border-red-800/50 text-xs text-red-300 hover:bg-red-950/60">
                    <Skull className="w-3 h-3" /> Kreaturen
                  </button>
                  <button onClick={resetAllMovement} title="Neue Runde – Bewegung zurücksetzen"
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-500 hover:text-zinc-300">
                    <RotateCcw className="w-3 h-3" /> Neue Runde
                  </button>
                  <label className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                    <input type="checkbox" checked={gmRollsVisible} onChange={e => { setGmRollsVisible(e.target.checked); localStorage.setItem('gm-rolls-visible', String(e.target.checked)) }}
                      className="w-3 h-3 accent-red-700" />
                    Würfe sichtbar
                  </label>
                </>
              )}
            </>
          )}

          {activeMap && (
            <button onClick={() => { setShowEffectsPanel(!showEffectsPanel); setTerrainMode(false) }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${showEffectsPanel || effectMode ? 'bg-purple-950/40 border-purple-700/60 text-purple-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
              <Flame className="w-3 h-3" /> Effekte
            </button>
          )}

          {!isGM && activeMap && !myToken && (
            <button onClick={addMyPlayerToken}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-sky-950/40 border border-sky-800/50 text-xs text-sky-300 hover:bg-sky-950/60">
              <Plus className="w-3 h-3" /> Meine Figur
            </button>
          )}

          {isGM && activeMap && (
            <div className="flex rounded overflow-hidden border border-zinc-700/60 ml-auto">
              {(['map','tracker'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === t ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/80 text-zinc-500 hover:text-zinc-300'}`}>
                  {t === 'map' ? 'Karte' : 'Initiative'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid Controls ── */}
      {showGridControls && isGM && activeMap && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Gitter kalibrieren</p>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Deckkraft</label>
              <input type="range" min="0" max="0.6" step="0.01" value={activeMap.grid_opacity}
                onChange={e => updateMap({ grid_opacity: parseFloat(e.target.value) })}
                className="w-28 accent-zinc-500" />
              <span className="text-xs text-zinc-400 w-8">{Math.round(activeMap.grid_opacity * 100)}%</span>
            </div>
            {[
              { label: 'Offset X', key: 'grid_offset_x' }, { label: 'Offset Y', key: 'grid_offset_y' },
              { label: 'Zellgröße px', key: 'cell_size' }, { label: 'Spalten', key: 'grid_cols' }, { label: 'Zeilen', key: 'grid_rows' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">{label}</label>
                <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none"
                  value={(activeMap as any)[key]}
                  onChange={e => updateMap({ [key]: parseInt(e.target.value) || 0 } as any)} />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Fuß/Feld</label>
              <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                value={activeMap.feet_per_cell ?? 5}
                onChange={e => updateMap({ feet_per_cell: parseInt(e.target.value) })}>
                {[5,10,15,20].map(v => <option key={v} value={v}>{v} ft</option>)}
              </select>
            </div>
          </div>
          {!activeMap.grid_locked && (
            <p className="text-xs text-amber-600/80">Gitter entsperrt — ziehe den Griff unten rechts. Das Bild bleibt fixiert; nur die Gitterteilung ändert sich.</p>
          )}
        </div>
      )}

      {/* ── Effects Panel ── */}
      {showEffectsPanel && activeMap && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400">Effekte platzieren</p>
            <button onClick={() => { setShowEffectsPanel(false); setEffectMode(null) }} className="text-zinc-600 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          {effectCategories.map(cat => {
            const effects = EFFECT_TYPES.filter(e => e.category === cat)
            if (effects.length === 0) return null
            return (
              <div key={cat} className="mb-2">
                <p className="text-[10px] uppercase font-semibold text-zinc-600 mb-1">{catLabel[cat]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {effects.map(et => (
                    <button key={et.id}
                      onClick={() => setEffectMode(effectMode === et.id ? null : et.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
                        effectMode === et.id ? 'border-purple-600/60 bg-purple-950/40 text-purple-200' : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                      }`}>
                      <span>{et.icon}</span> {et.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {effectMode && (
            <p className="mt-1 text-xs text-purple-400/80">
              {EFFECT_TYPES.find(e => e.id === effectMode)?.simple
                ? `Klicke auf ein Feld zum Platzieren`
                : `Klicke auf den Mittelpunkt des Effekts`}
            </p>
          )}
          {(activeMap.map_effects?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-800 pt-2">
              {activeMap.map_effects.map(eff => (
                <span key={eff.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-400">
                  {eff.icon} {eff.label ?? eff.type}
                  <button onClick={() => removeEffect(eff.id)} className="text-zinc-600 hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AOE Config Modal ── */}
      {pendingEffect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-700 rounded-2xl p-6 w-80 shadow-2xl space-y-4">
            <p className="font-bold text-zinc-100 flex items-center gap-2">
              {EFFECT_TYPES.find(e => e.id === pendingEffect.type)?.icon}
              {EFFECT_TYPES.find(e => e.id === pendingEffect.type)?.label} konfigurieren
            </p>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Farbe</label>
              <input type="color" value={pendingColor} onChange={e => setPendingColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
            </div>
            {(pendingEffect.type === 'circle' || pendingEffect.type === 'aura') && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Radius: {pendingRadius} Felder</label>
                <input type="range" min={1} max={10} value={pendingRadius} onChange={e => setPendingRadius(parseInt(e.target.value))} className="w-full accent-purple-600" />
              </div>
            )}
            {(pendingEffect.type === 'cone' || pendingEffect.type === 'line') && (
              <>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Länge: {pendingRadius} Felder</label>
                  <input type="range" min={2} max={12} value={pendingRadius} onChange={e => setPendingRadius(parseInt(e.target.value))} className="w-full accent-orange-600" />
                </div>
                {pendingEffect.type === 'cone' && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Öffnungswinkel: {pendingAngle}°</label>
                    <input type="range" min={30} max={120} step={15} value={pendingAngle} onChange={e => setPendingAngle(parseInt(e.target.value))} className="w-full accent-orange-600" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Richtung</label>
                  <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                    {[[315,'↖'],[0,'↑'],[45,'↗'],[270,'←'],[null,''],[90,'→'],[225,'↙'],[180,'↓'],[135,'↘']].map(([deg, lbl], i) => (
                      deg === null ? <div key={i} /> :
                      <button key={i} onClick={() => setPendingDirection(deg as number)}
                        className={`w-8 h-8 rounded text-sm font-bold transition-colors ${pendingDirection === deg ? 'bg-orange-800 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPendingEffect(null)} className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400">Abbrechen</button>
              <button onClick={placeAoeEffect} className="flex-1 py-2 rounded-lg bg-purple-900 hover:bg-purple-800 border border-purple-700/60 text-sm font-bold text-white">Platzieren</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map Form ── */}
      {showMapForm && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Neue Karte erstellen</p>
          <div className="flex flex-wrap gap-2">
            <input className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              placeholder="Name" value={newMapForm.name} onChange={e => setNewMapForm(f => ({...f, name: e.target.value}))} />
            <input className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              placeholder="Bild-URL (optional)" value={newMapForm.image_url} onChange={e => setNewMapForm(f => ({...f, image_url: e.target.value}))} />
          </div>
          <div className="flex gap-2">
            <button onClick={createMap} className="px-4 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs font-bold text-zinc-200">Erstellen</button>
            <button onClick={() => setShowMapForm(false)} className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-500">Abbrechen</button>
            {activeMap && (
              <button onClick={async () => { await supabase.from('battle_maps').delete().eq('id', activeMap.id); setActiveMap(null); loadMaps() }}
                className="ml-auto px-3 py-1.5 rounded bg-red-950/40 border border-red-800/50 text-xs text-red-500">Karte löschen</button>
            )}
          </div>
        </div>
      )}

      {/* ── Monster Library ── */}
      {showMonsterLib && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400">Kreatur-Bibliothek</p>
            <button onClick={() => setShowMonsterLib(false)} className="text-zinc-600 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {MONSTER_TEMPLATES.map(m => (
              <button key={m.name} onClick={() => addFromTemplate(m)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-300 hover:bg-zinc-700/60">
                <span>{m.icon}</span><span>{m.name}</span>
                <span className="text-zinc-600">CR{m.cr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Movement bars ── */}
      {moveMode && moveTarget && (
        <div className="flex-shrink-0 px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center gap-3">
          <span className="text-xs text-emerald-300">
            Ziel: ({moveTarget.col},{moveTarget.row}) — Kosten: {reachableCells.get(`${moveTarget.col},${moveTarget.row}`) ?? 0} ft
          </span>
          <button onClick={confirmMove}
            className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-xs font-bold text-white ml-auto">
            <Check className="w-3.5 h-3.5" /> Bestätigen
          </button>
          <button onClick={cancelMove}
            className="flex items-center gap-1 px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300">
            <X className="w-3.5 h-3.5" /> Abbrechen
          </button>
        </div>
      )}
      {moveMode && !moveTarget && (
        <div className="flex-shrink-0 px-4 py-2 bg-sky-950/30 border-b border-sky-800/30 flex items-center gap-3">
          <Footprints className="w-4 h-4 text-sky-600" />
          <span className="text-xs text-sky-400">
            Klicke ein hervorgehobenes Feld
            {movingToken?.speed && activeMap && ` · ${movingToken.speed - (movingToken.movement_used ?? 0)} ft verbleibend`}
          </span>
          <button onClick={cancelMove} className="ml-auto flex items-center gap-1 px-3 py-1 rounded bg-zinc-700 text-xs text-zinc-300"><X className="w-3 h-3" /> Abbrechen</button>
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && isGM && (
        <TokenModal title="Token hinzufügen" onSave={form => addTokenFromForm(form)} onClose={() => setShowAddModal(false)} />
      )}
      {showAddModal && !isGM && (
        <TokenModal title="Meine Figur" initial={myTokenInitial}
          onSave={form => addTokenFromForm(form, { player_user_id: user?.id })}
          onClose={() => setShowAddModal(false)} />
      )}
      {editingToken && (
        <TokenModal title={`Bearbeiten — ${editingToken.name}`}
          initial={{
            token_type: editingToken.token_type, name: editingToken.name, icon: editingToken.icon,
            cr: editingToken.challenge_rating ?? '',
            max_hp: String(editingToken.max_hp ?? ''), armor_class: String(editingToken.armor_class ?? ''),
            speed: String(editingToken.speed ?? ''), initiative: String(editingToken.initiative ?? ''),
            str: String(editingToken.stats?.str ?? 10), dex: String(editingToken.stats?.dex ?? 10),
            con: String(editingToken.stats?.con ?? 10), int: String(editingToken.stats?.int ?? 10),
            wis: String(editingToken.stats?.wis ?? 10), cha: String(editingToken.stats?.cha ?? 10),
            notes: editingToken.notes ?? '', token_size: editingToken.token_size ?? 'medium',
          }}
          onSave={saveEditedToken}
          onClose={() => setEditingToken(null)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden flex">
        {!activeMap ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-3">
            <MapIcon className="w-12 h-12 opacity-20" />
            <p className="text-sm">Keine Karte ausgewählt</p>
            {isGM && (
              <button onClick={() => setShowMapForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100">
                <Plus className="w-4 h-4" /> Karte erstellen
              </button>
            )}
          </div>
        ) : activeTab === 'tracker' && isGM ? (
          /* GM Initiative Tracker */
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-400">Initiative — {tokens.length} Token</p>
              <button onClick={resetAllMovement}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300">
                <RotateCcw className="w-3 h-3" /> Bewegung reset
              </button>
            </div>
            {tokens.length === 0 && <p className="text-sm text-zinc-700 text-center py-8">Keine Token auf der Karte.</p>}
            {[...tokens].sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)).map(t => {
              const activeConds = CONDITIONS.filter(c => t.conditions.includes(c.id))
              const remainFt = (t.speed ?? 0) - (t.movement_used ?? 0)
              return (
                <div key={t.id} onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedToken === t.id ? 'border-zinc-500 bg-zinc-800/60' :
                    t.token_type === 'player' ? 'border-sky-900/50 bg-sky-950/20 hover:bg-sky-950/30' :
                    t.token_type === 'monster' ? 'border-red-900/50 bg-red-950/20 hover:bg-red-950/30' :
                    'border-zinc-700/60 bg-zinc-800/30 hover:bg-zinc-800/50'
                  } ${t.is_hidden ? 'opacity-40' : ''}`}>
                  {/* Initiative badge */}
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 flex-shrink-0">
                    <span className="text-xs font-bold text-amber-500">{modSign(t.initiative ?? 0)}</span>
                  </div>
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{t.name}</p>
                      {t.is_hidden && <EyeOff className="w-3 h-3 text-zinc-600" />}
                      {activeConds.map(c => <span key={c.id} className={`text-[10px] px-1 rounded ${c.bg} ${c.border} ${c.color}`}>{c.icon}</span>)}
                    </div>
                    <div className="flex gap-3 text-[11px] text-zinc-600 flex-wrap">
                      {t.max_hp !== null && <span className={t.current_hp === 0 ? 'text-red-500' : ''}>{t.current_hp}/{t.max_hp} HP</span>}
                      {t.armor_class !== null && <span>RK {t.armor_class}</span>}
                      {t.speed !== null && <span className={remainFt === 0 ? 'text-red-600' : 'text-sky-600'}>{remainFt}/{t.speed} ft</span>}
                    </div>
                  </div>
                  {t.max_hp !== null && (
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.max(0, (t.current_hp ?? 0) - 1) }) }}
                        className="w-6 h-6 rounded bg-red-950/50 border border-red-800/50 text-red-400 text-xs font-bold hover:bg-red-900/60">−</button>
                      <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.min(t.max_hp!, (t.current_hp ?? 0) + 1) }) }}
                        className="w-6 h-6 rounded bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs font-bold hover:bg-emerald-900/60">+</button>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditingToken(t) }} className="p-1 text-zinc-700 hover:text-zinc-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteToken(t.id) }} className="p-1 text-zinc-700 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* Map View */
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto relative bg-zinc-950">
              <div
                ref={mapRef}
                className="relative select-none"
                style={{
                  width: activeMap.grid_cols * cs + ox,
                  height: activeMap.grid_rows * cs + oy,
                  backgroundImage: activeMap.image_url
                    ? `url(${activeMap.image_url})`
                    : 'linear-gradient(160deg, #0c0008 0%, #050010 40%, #0a0005 70%, #000000 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: terrainMode ? 'crosshair' : effectMode ? 'cell' : moveMode ? 'pointer' : dragRender ? 'grabbing' : 'default',
                }}
                onClick={handleGridClick}
                onMouseMove={handleGridMouseMove}
                onMouseLeave={() => { setHoverCell(null); setHoverCoord(null) }}
              >
                {/* SVG Overlay */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                  {/* Grid lines */}
                  {Array.from({ length: activeMap.grid_cols + 1 }, (_, i) => (
                    <line key={`v${i}`}
                      x1={i * cs + ox} y1={oy} x2={i * cs + ox} y2={activeMap.grid_rows * cs + oy}
                      stroke={`rgba(200,180,150,${activeMap.grid_opacity ?? 0.15})`} strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: activeMap.grid_rows + 1 }, (_, i) => (
                    <line key={`h${i}`}
                      x1={ox} y1={i * cs + oy} x2={activeMap.grid_cols * cs + ox} y2={i * cs + oy}
                      stroke={`rgba(200,180,150,${activeMap.grid_opacity ?? 0.15})`} strokeWidth="0.5" />
                  ))}

                  {/* Difficult Terrain */}
                  {(activeMap.difficult_terrain ?? []).map(dt => {
                    const p = cellPx(dt.col, dt.row)
                    return <rect key={`dt-${dt.col}-${dt.row}`} x={p.x + 1} y={p.y + 1} width={cs - 2} height={cs - 2}
                      fill="rgba(255,100,0,0.14)" stroke="rgba(255,100,0,0.35)" strokeWidth="1" strokeDasharray="4 2" />
                  })}

                  {/* Reachable cells */}
                  {moveMode && Array.from(reachableCells.entries()).map(([key, _cost]) => {
                    const [col, row] = key.split(',').map(Number)
                    const p = cellPx(col, row)
                    const isTarget = moveTarget?.col === col && moveTarget?.row === row
                    const isHover = hoverCell?.col === col && hoverCell?.row === row
                    return <rect key={`reach-${key}`} x={p.x + 1} y={p.y + 1} width={cs - 2} height={cs - 2}
                      fill={isTarget ? 'rgba(52,211,153,0.30)' : isHover ? 'rgba(52,211,153,0.20)' : 'rgba(56,189,248,0.12)'}
                      stroke={isTarget ? 'rgba(52,211,153,0.8)' : isHover ? 'rgba(52,211,153,0.5)' : 'rgba(56,189,248,0.40)'}
                      strokeWidth={isTarget ? 2 : 1} />
                  })}

                  {/* Movement path */}
                  {moveMode && movePath.length > 1 && (
                    <polyline
                      points={movePath.map(p => { const px = cellPx(p.col, p.row); return `${px.x + cs / 2},${px.y + cs / 2}` }).join(' ')}
                      fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeDasharray="6 3" strokeLinecap="round" />
                  )}

                  {/* Drag snap preview highlight */}
                  {dragRender?.hoverCell && (() => {
                    const p = cellPx(dragRender.hoverCell.col, dragRender.hoverCell.row)
                    const dtoken = tokens.find(t => t.id === dragRender.tokenId)
                    const span = Math.max(1, Math.ceil(getSizeSpan(dtoken?.token_size ?? 'medium')))
                    return <rect x={p.x} y={p.y} width={span * cs} height={span * cs}
                      fill={isDragCellValid ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)'}
                      stroke={isDragCellValid ? 'rgba(52,211,153,0.7)' : 'rgba(239,68,68,0.7)'}
                      strokeWidth="2" strokeDasharray="6 3" rx="4" />
                  })()}

                  {/* AOE Effects */}
                  {(activeMap.map_effects ?? []).map(eff => {
                    if (eff.type === 'circle') return renderAoeCircle(eff)
                    if (eff.type === 'cone') return renderAoeCone(eff)
                    if (eff.type === 'line') return renderAoeLine(eff)
                    if (eff.type === 'aura') return renderAoeAura(eff)
                    return null
                  })}
                </svg>

                {/* Simple Effect Icons */}
                {(activeMap.map_effects ?? []).filter(e => !['circle','cone','line','aura'].includes(e.type)).map(eff => {
                  const p = cellPx(eff.col, eff.row)
                  return (
                    <div key={eff.id} style={{ position: 'absolute', left: p.x, top: p.y, width: cs, height: cs, pointerEvents: 'none' }}
                      className="flex items-center justify-center">
                      <span style={{ fontSize: Math.min(cs * 0.55, 28), filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.9))' }}>{eff.icon}</span>
                    </div>
                  )
                })}

                {/* Terrain mode hover hint */}
                {terrainMode && hoverCoord && (
                  <div style={{ position: 'absolute', left: hoverCoord.col * cs + ox, top: hoverCoord.row * cs + oy, width: cs, height: cs, pointerEvents: 'none' }}
                    className="border-2 border-orange-600/70 bg-orange-500/20" />
                )}

                {/* Tokens */}
                {visibleTokens.map(t => {
                  const span = getSizeSpan(t.token_size || 'medium')
                  const spanPx = span >= 1 ? Math.round(span) * cs : Math.round(cs * span)
                  const isDragged = dragRender?.tokenId === t.id && dragRender.hoverCell !== null
                  const canDrag = isGM || t.player_user_id === user?.id
                  return (
                    <div
                      key={t.id}
                      style={{
                        position: 'absolute',
                        left: t.col * cs + ox + (span < 1 ? 2 : 2),
                        top: t.row * cs + oy + (span < 1 ? 2 : 2),
                        width: spanPx - 4, height: spanPx - 4,
                        cursor: canDrag ? (isDragged ? 'grabbing' : 'grab') : 'pointer',
                        userSelect: 'none',
                        zIndex: selectedToken === t.id ? 10 : 5,
                      }}
                      onMouseDown={e => handleTokenMouseDown(e, t)}
                      onClick={e => {
                        e.stopPropagation()
                        if (terrainMode || effectMode || moveMode) return
                        if (dragStateRef.current?.dragging) return
                      }}
                    >
                      <TokenPiece
                        token={t}
                        selected={selectedToken === t.id}
                        cellSize={cs}
                        isMoving={movingTokenId === t.id}
                        isDragged={isDragged}
                      />
                    </div>
                  )
                })}

                {/* Drag snap ghost — show at hover cell position */}
                {dragRender?.hoverCell && (() => {
                  const dtoken = tokens.find(t => t.id === dragRender.tokenId)
                  if (!dtoken) return null
                  const span = getSizeSpan(dtoken.token_size || 'medium')
                  const spanPx = span >= 1 ? Math.round(span) * cs : Math.round(cs * span)
                  const p = cellPx(dragRender.hoverCell.col, dragRender.hoverCell.row)
                  return (
                    <div style={{
                      position: 'absolute', left: p.x + 2, top: p.y + 2,
                      width: spanPx - 4, height: spanPx - 4,
                      pointerEvents: 'none', zIndex: 50,
                      opacity: isDragCellValid ? 0.75 : 0.35,
                    }}>
                      <TokenPiece token={dtoken} selected={true} cellSize={cs} />
                    </div>
                  )
                })()}

                {/* Grid Resize Handle */}
                {isGM && activeMap && !activeMap.grid_locked && (
                  <div
                    style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, cursor: 'nwse-resize', zIndex: 20 }}
                    className="bg-amber-700/80 rounded-tl-lg flex items-center justify-center hover:bg-amber-600 active:bg-amber-500"
                    onMouseDown={e => {
                      e.preventDefault()
                      setIsDraggingResize(true)
                      setResizeDragStart({
                        x: e.clientX, y: e.clientY, cellSize: activeMap.cell_size,
                        canvasW: activeMap.grid_cols * activeMap.cell_size,
                        canvasH: activeMap.grid_rows * activeMap.cell_size,
                      })
                    }}
                    title="Ziehen: Gitter-Raster anpassen (Bild bleibt fixiert)"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 10L10 2M6 10L10 6M10 10V10" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}

                {/* Coordinate display */}
                {hoverCoord && !dragRender && (
                  <div className="absolute top-2 right-2 bg-black/60 text-zinc-400 text-[10px] px-2 py-0.5 rounded pointer-events-none font-mono">
                    {hoverCoord.col},{hoverCoord.row}
                  </div>
                )}

                {/* Status hints */}
                {terrainMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-orange-300 text-xs px-3 py-1.5 rounded-full pointer-events-none border border-orange-800/60">
                    Geländemodus — Klicke Felder zum Markieren/Entfernen (schwieriges Gelände)
                  </div>
                )}
                {effectMode && !terrainMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-purple-300 text-xs px-3 py-1.5 rounded-full pointer-events-none border border-purple-800/60">
                    {EFFECT_TYPES.find(e => e.id === effectMode)?.icon} Effektmodus — Klicke auf ein Feld
                  </div>
                )}
                {!moveMode && !terrainMode && !effectMode && (
                  <div className="absolute bottom-3 right-3 text-zinc-700 text-[10px] pointer-events-none">
                    Ziehen oder Pfeiltasten zum Bewegen
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel */}
            {sel && (
              <div className="flex-shrink-0 w-72 overflow-y-auto p-3 border-l border-zinc-800/80 bg-zinc-950">
                <TokenPanel
                  token={sel}
                  onUpdate={patch => updateToken(sel.id, patch)}
                  onDelete={() => deleteToken(sel.id)}
                  onClose={() => setSelectedToken(null)}
                  onEdit={() => setEditingToken(sel)}
                  isGM={isGM}
                  myFavorites={myFavorites}
                  onRoll={performRoll}
                  ownToken={sel.player_user_id === user?.id}
                  onStartMove={() => startMove(sel.id)}
                  moveMode={moveMode && movingTokenId === sel.id}
                  movementInfo={sel.speed != null ? {
                    used: sel.movement_used ?? 0,
                    speed: sel.speed,
                    feetPerCell: activeMap?.feet_per_cell ?? 5,
                  } : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
