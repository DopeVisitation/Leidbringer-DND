'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Map as MapIcon, Plus, Trash2, X, Eye, EyeOff, Shield, Heart, Zap,
  Edit2, Save, Bookmark, SlidersHorizontal,
  ChevronDown, ChevronRight, Lock, Unlock, Check, RotateCcw,
  Flame, Move, Footprints, Skull, ArrowUp, ArrowDown,
  Timer, Play, Pause, SkipForward, SkipBack, Cloud, BookmarkCheck,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight as ChevronRightIcon, Layers,
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

interface InitiativeData {
  round: number; current_turn: number; timer_seconds: number; active: boolean
}

interface BattleMap {
  id: string; name: string; image_url: string | null
  grid_cols: number; grid_rows: number; cell_size: number
  is_active: boolean; created_by: string; grid_opacity: number
  grid_offset_x: number; grid_offset_y: number
  difficult_terrain: { col: number; row: number }[]
  map_effects: MapEffect[]; feet_per_cell: number; grid_locked: boolean
  fog_cells: { col: number; row: number }[]
  grid_color: string
  initiative_data: InitiativeData
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
  is_staged: boolean
  companion_id: string | null
}

interface DiceFavorite {
  id: string; name: string; attack_bonus: number; damage_bonus: number
  dice_config: DiceConfig[]; damage_dice?: string | null; damage_type?: string | null
}

interface DiceRollEntry {
  id: string; user_id: string; label: string | null; total: number
  results: number[][]; dice_config: DiceConfig[]; visible_to_players: boolean
  created_at: string; username?: string
}

interface CombatLogEntry {
  id: string; actor_name: string; action_type: string; description: string
  is_gm_action: boolean; created_at: string; map_id: string
}

// ─── V20: Models & Assets ────────────────────────────────────────────────────
interface PlacedModel {
  id: string
  map_id: string
  name: string
  image_url: string
  col: number
  row: number
  span: number
  rotation: number
  is_hidden: boolean
  z_index: number
  // V21
  companion_id: string | null
  current_hp: number | null
  max_hp: number | null
  armor_class: number | null
  speed: number | null
  model_stats: Record<string, number> | null
  notes: string | null
  favorite_dice: any[]
  abilities: any[]
  conditions: string[]
}

interface PlacedAsset {
  id: string
  map_id: string
  name: string
  image_url: string
  x_pct: number
  y_pct: number
  width_cells: number
  height_cells: number
  rotation: number
  z_index: number
}

const DICE_TYPES_LIST = ['d4','d6','d8','d10','d12','d20'] as const
const DMG_TYPES_LIST  = ['','Hieb','Stich','Wucht','Feuer','Kälte','Blitz','Säure','Gift','Nekrose','Strahlend','Kraft','Psychisch','Donner'] as const

interface TokenImage {
  name: string
  url: string
  filename: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN_ICONS = [
  // Spieler / Helden
  '⚔️','🛡️','🏹','🪄','🔮','🗡️','🥷','🤺','🧙','💪',
  // Humanoide
  '🧝','🧔','👑','🤴','👸','🦸','🦹','💂','🧑‍⚕️','🧌',
  // Untote / Dunkel
  '💀','☠️','👻','🧟','🧛','🦴','🧠','👁️','🕷️','🦇',
  // Drachen / Große Kreaturen
  '🐉','🐲','🦕','🦖','🦣','🐂','🦏','🐘','🦍','🦬',
  // Bestien / Tiere
  '🐺','🦁','🐯','🐻','🦊','🐗','🐍','🐊','🦎','🦅',
  '🦉','🦆','🐓','🐎','🦂','🕸️','🐛','🦟','🪲','🦗',
  // Monster / Fabelwesen
  '👹','👺','👾','👿','😈','🧞','🧜','🧚','🧝','🫀',
  // Elementar / Magie
  '🔥','❄️','⚡','🌊','🌪️','☄️','💥','✨','🌟','🌑',
  '🍄','💎','⚗️','🔑','📜','🪬','🧿','🔔','🌿','🌋',
  // Umgebung / Objekte
  '🏰','⛰️','🌲','🌳','🪨','💧','⚓','🗺️','🕯️','⚙️',
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
  { id: 'tiny',       label: 'Winzig',    span: 0.5, gridLabel: '½ Feld' },
  { id: 'small',      label: 'Klein',     span: 1,   gridLabel: '1×1'   },
  { id: 'medium',     label: 'Mittel',    span: 1,   gridLabel: '1×1'   },
  { id: 'large',      label: 'Groß',      span: 2,   gridLabel: '2×2'   },
  { id: 'huge',       label: 'Riesig',    span: 3,   gridLabel: '3×3'   },
  { id: 'gargantuan', label: 'Gigantisch',span: 4,   gridLabel: '4×4'   },
  { id: 'colossal',   label: 'Koloss',    span: 5,   gridLabel: '5×5'   },
]

// ─── Effect Types ─────────────────────────────────────────────────────────────
interface EffectType {
  id: string; icon: string; label: string; color: string
  simple: boolean; category: 'hazard' | 'terrain' | 'magic' | 'aoe'
}
const EFFECT_TYPES: EffectType[] = [
  { id: 'fire',      icon: '🔥', label: 'Feuer',         color: '#ff4400', simple: true,  category: 'hazard'  },
  { id: 'ice',       icon: '❄️', label: 'Frost',         color: '#66ccff', simple: true,  category: 'hazard'  },
  { id: 'lightning', icon: '⚡', label: 'Blitz',         color: '#ffdd22', simple: true,  category: 'hazard'  },
  { id: 'poison',    icon: '☠️', label: 'Gift',          color: '#44cc00', simple: true,  category: 'hazard'  },
  { id: 'acid',      icon: '🧪', label: 'Säure',         color: '#aaff00', simple: true,  category: 'hazard'  },
  { id: 'lava',      icon: '🌋', label: 'Lava',          color: '#ff6600', simple: true,  category: 'hazard'  },
  { id: 'blood',     icon: '🩸', label: 'Blut',          color: '#880000', simple: true,  category: 'hazard'  },
  { id: 'explosion', icon: '💥', label: 'Explosion',     color: '#ffaa00', simple: true,  category: 'hazard'  },
  { id: 'rock',      icon: '🪨', label: 'Fels/Mauer',   color: '#888888', simple: true,  category: 'terrain' },
  { id: 'tree',      icon: '🌲', label: 'Baum',          color: '#226622', simple: true,  category: 'terrain' },
  { id: 'water',     icon: '🌊', label: 'Wasser',        color: '#0055aa', simple: true,  category: 'terrain' },
  { id: 'web',       icon: '🕸️', label: 'Spinnennetz',   color: '#cccc88', simple: true,  category: 'terrain' },
  { id: 'grease',    icon: '🟡', label: 'Schmierfett',   color: '#ddcc00', simple: true,  category: 'terrain' },
  { id: 'darkness',  icon: '🌑', label: 'Dunkelheit',    color: '#220044', simple: true,  category: 'magic'   },
  { id: 'fog',       icon: '🌫️', label: 'Nebel',         color: '#aaaaaa', simple: true,  category: 'magic'   },
  { id: 'holy',      icon: '✨', label: 'Heiliges Licht', color: '#ffee44', simple: true,  category: 'magic'   },
  { id: 'necrotic',  icon: '💀', label: 'Nekrose',       color: '#662288', simple: true,  category: 'magic'   },
  { id: 'shadow',    icon: '🖤', label: 'Schatten',      color: '#110022', simple: true,  category: 'magic'   },
  { id: 'force',     icon: '🔵', label: 'Kraftfeld',     color: '#4488ff', simple: true,  category: 'magic'   },
  { id: 'silence',   icon: '🔇', label: 'Stille',        color: '#558899', simple: true,  category: 'magic'   },
  { id: 'circle',    icon: '⭕', label: 'Kreis (AOE)',   color: '#ff2200', simple: false, category: 'aoe'     },
  { id: 'cone',      icon: '🔺', label: 'Kegel (AOE)',   color: '#ff8800', simple: false, category: 'aoe'     },
  { id: 'line',      icon: '➡️', label: 'Linie (AOE)',   color: '#ff4488', simple: false, category: 'aoe'     },
  { id: 'aura',      icon: '🌟', label: 'Aura',          color: '#ffcc00', simple: false, category: 'aoe'     },
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

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(200,180,150,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getSizeSpan(size: TokenSize | string | undefined): number {
  switch (size) {
    case 'tiny': return 0.5; case 'small': return 1; case 'large': return 2
    case 'huge': return 3; case 'gargantuan': return 4; case 'colossal': return 5
    default: return 1
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
      const newCost = cost + (dtSet.has(key) ? feetPerCell * 2 : feetPerCell)
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
  let cur = target; let safety = 0
  while ((cur.col !== start.col || cur.row !== start.row) && safety < 100) {
    safety++
    const curCost = dist.get(`${cur.col},${cur.row}`) ?? 0
    let best: { col: number; row: number } | null = null; let bestCost = Infinity
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nc = cur.col + dc, nr = cur.row + dr
      const cost = (nc === start.col && nr === start.row) ? -1 : (dist.get(`${nc},${nr}`) ?? Infinity)
      if (cost < curCost && cost < bestCost) { best = { col: nc, row: nr }; bestCost = cost }
    }
    if (!best) break
    path.unshift(best); cur = best
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
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Größe</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-700"
              value={form.token_size} onChange={e => setForm(f => ({ ...f, token_size: e.target.value as TokenSize }))}>
              {TOKEN_SIZES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.gridLabel})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Token-Bild</label>
            {/* URL input – paste any portrait token image link */}
            <div className="flex gap-2 mb-2">
              {form.icon?.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.icon} alt="preview" className="w-10 h-10 rounded-full object-cover border border-zinc-600 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-xl flex-shrink-0">
                  {form.icon}
                </div>
              )}
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Portrait-URL einfügen (https://…)"
                value={form.icon?.startsWith('http') ? form.icon : ''}
                onChange={e => { if (e.target.value.trim()) setForm(f => ({ ...f, icon: e.target.value.trim() })) }}
              />
            </div>
            <p className="text-[10px] text-zinc-600 mb-2">— oder Emoji wählen —</p>
            <button onClick={() => setShowIcons(!showIcons)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:border-zinc-500 mb-1">
              {showIcons ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
              Emoji-Auswahl {showIcons ? 'schließen' : 'öffnen'}
            </button>
            {showIcons && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-2">
                <div className="grid grid-cols-10 gap-1 max-h-44 overflow-y-auto">
                  {TOKEN_ICONS.map((icon, i) => (
                    <button key={i} onClick={() => { setForm(f => ({ ...f, icon })); setShowIcons(false) }}
                      className={`text-xl p-1.5 rounded-lg hover:bg-zinc-700 transition-colors ${form.icon === icon ? 'bg-red-900/30 ring-1 ring-red-700' : ''}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Kampfwerte</label>
            <div className="grid grid-cols-5 gap-2">
              {[{key:'max_hp',label:'Max HP'},{key:'armor_class',label:'RK'},{key:'speed',label:'Speed ft'},{key:'initiative',label:'Initiative'},{key:'cr',label:'CR'}].map(({key,label}) => (
                <div key={key}>
                  <label className="text-[9px] uppercase text-zinc-600 block mb-0.5">{label}</label>
                  <input type={key==='cr'?'text':'number'}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-red-700"
                    value={(form as any)[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Attribute</label>
            <div className="grid grid-cols-6 gap-2">
              {(['str','dex','con','int','wis','cha'] as const).map(ab => (
                <div key={ab} className="flex flex-col items-center">
                  <label className="text-[9px] uppercase text-zinc-600 mb-0.5">{ab.toUpperCase()}</label>
                  <input type="number" min={1} max={30}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-red-700"
                    value={(form as any)[ab]} onChange={e => setForm(f => ({...f,[ab]:e.target.value}))} />
                  <span className="text-[9px] text-zinc-600 mt-0.5">{modSign(statMod(parseInt((form as any)[ab])||10))}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Fähigkeiten / Notizen</label>
            <textarea rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 resize-none"
              placeholder="Besondere Fähigkeiten, Traits…" value={form.notes} onChange={e => setForm(f => ({...f,notes:e.target.value}))} />
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
function TokenPiece({ token, selected, cellSize, isMoving, isDragged, isActiveTurn }: {
  token: BattleToken; selected: boolean; cellSize: number
  isMoving?: boolean; isDragged?: boolean; isActiveTurn?: boolean
}) {
  const span = getSizeSpan(token.token_size || 'medium')
  const pixW = span >= 1 ? Math.round(span) * cellSize - 4 : Math.round(cellSize * span) - 2
  const pixH = pixW
  const hpPct = token.max_hp && token.current_hp !== null
    ? Math.max(0, Math.min(1, token.current_hp / token.max_hp)) : null
  const hpColor = hpPct === null ? '' : hpPct > 0.6 ? '#4ade80' : hpPct > 0.3 ? '#facc15' : '#f87171'
  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))
  const fontSize = Math.max(10, Math.min(pixW * 0.45, 32))

  const borderClass = isActiveTurn
    ? 'border-amber-400 shadow-xl shadow-amber-500/40 scale-110'
    : isMoving
      ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
      : selected
        ? 'border-amber-500 shadow-lg shadow-amber-500/30 scale-105'
        : token.token_type === 'player'
          ? 'border-sky-700/70 shadow-sky-900/20'
          : token.token_type === 'monster'
            ? 'border-red-800/80 shadow-red-900/20'
            : 'border-zinc-600/60'

  const bgClass = token.token_type === 'player' ? 'bg-slate-800/85'
    : token.token_type === 'monster' ? 'bg-stone-900/90' : 'bg-zinc-800/80'

  return (
    <div style={{ width: pixW, height: pixH, userSelect: 'none', position: 'relative', opacity: isDragged ? 0.3 : 1 }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 transition-all shadow-md ${borderClass} ${bgClass}`}>
      {isActiveTurn && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
      )}
      {(token.icon?.startsWith('http') || token.icon?.startsWith('/')) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.icon} alt={token.name}
          style={{ width: pixW - 6, height: pixH - 6, objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        <span style={{ fontSize, lineHeight: 1 }}>{token.icon}</span>
      )}
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
          {token.token_size === 'large' ? 'L' : token.token_size === 'huge' ? 'H' : token.token_size === 'gargantuan' ? 'G' : 'K'}
        </div>
      )}
    </div>
  )
}

// ─── Token Panel ──────────────────────────────────────────────────────────────
function TokenPanel({ token, onUpdate, onDelete, onClose, onEdit, isGM, myFavorites, onRoll, ownToken, onStartMove, moveMode, movementInfo, onSaveToExtras }: {
  token: BattleToken; onUpdate: (t: Partial<BattleToken>) => void; onDelete: () => void
  onClose: () => void; onEdit: () => void; isGM: boolean; myFavorites: DiceFavorite[]
  onRoll: (cfg: DiceConfig[], bonus: number, label: string) => void
  ownToken: boolean; onStartMove: () => void; moveMode: boolean
  movementInfo?: { used: number; speed: number; feetPerCell: number }
  onSaveToExtras?: () => void
}) {
  const [hpInput, setHpInput] = useState('')
  const [showCondPicker, setShowCondPicker] = useState(false)
  const [showActionForm, setShowActionForm] = useState(false)
  const [newActionName, setNewActionName] = useState('')
  const [newActionAtk, setNewActionAtk] = useState(0)
  const [newActionDmgBonus, setNewActionDmgBonus] = useState(0)
  const [newActionDice, setNewActionDice] = useState<DiceConfig[]>([])
  const canEdit = isGM || ownToken

  const saveNewAction = () => {
    if (!newActionName.trim()) return
    const action: FavoriteAction = {
      name: newActionName.trim(),
      attack_bonus: newActionAtk,
      damage_bonus: newActionDmgBonus,
      dice_config: newActionDice,
    }
    onUpdate({ favorite_actions: [...(token.favorite_actions ?? []), action] })
    setNewActionName(''); setNewActionAtk(0); setNewActionDmgBonus(0); setNewActionDice([]); setShowActionForm(false)
  }
  const removeAction = (idx: number) =>
    onUpdate({ favorite_actions: (token.favorite_actions ?? []).filter((_, i) => i !== idx) })
  const addActionDie = () => setNewActionDice(d => [...d, { type: 'd6', count: 1 }])
  const removeActionDie = (idx: number) => setNewActionDice(d => d.filter((_, i) => i !== idx))
  const updateActionDie = (idx: number, patch: Partial<DiceConfig>) =>
    setNewActionDice(d => d.map((dc, i) => i === idx ? { ...dc, ...patch } : dc))
  const remainingMove = movementInfo ? movementInfo.speed - movementInfo.used : null
  const activeConds = CONDITIONS.filter(c => token.conditions.includes(c.id))
  const availConds = CONDITIONS.filter(c => !token.conditions.includes(c.id))

  const applyHp = (delta: number) => {
    const cur = token.current_hp ?? token.max_hp ?? 0
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, cur + delta)) })
  }
  const applyHpAbsolute = (v: number) => {
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, v)) })
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 w-72">
      {/* Header */}
      <div className="flex items-center gap-2">
        {(token.icon?.startsWith('http') || token.icon?.startsWith('/')) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={token.icon} alt={token.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <span className="text-2xl">{token.icon}</span>
        )}
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

      {/* Quick Size */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-semibold text-zinc-600 whitespace-nowrap">Größe</span>
          <select className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-red-700"
            value={token.token_size ?? 'medium'} onChange={e => onUpdate({ token_size: e.target.value as TokenSize })}>
            {TOKEN_SIZES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.gridLabel})</option>)}
          </select>
        </div>
      )}

      {/* Movement */}
      {(ownToken || isGM) && (token.speed ?? 0) > 0 && (
        <div className="space-y-1">
          {movementInfo && (
            <div className="flex items-center gap-2 text-xs">
              <Footprints className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-zinc-400">Bewegung</span>
              <span className={`ml-auto font-bold tabular-nums ${remainingMove === 0 ? 'text-red-400' : 'text-sky-300'}`}>
                {remainingMove} / {movementInfo.speed} ft
                <span className="text-zinc-600 ml-1">({movementInfo.feetPerCell} ft/Feld)</span>
              </span>
            </div>
          )}
          {movementInfo && (
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
            }`} disabled={remainingMove === 0 && !moveMode}>
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
              <button key={c.id} onClick={() => canEdit && onUpdate({ conditions: token.conditions.filter(x => x !== c.id) })}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${c.bg} ${c.border} ${c.color} ${canEdit ? 'hover:opacity-70' : ''}`}
                title={canEdit ? 'Klicken zum Entfernen' : ''}>
                {c.icon} {c.id}
              </button>
            ))}
          </div>
        )}
        {canEdit && availConds.length > 0 && (
          <button onClick={() => setShowCondPicker(!showCondPicker)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1">
            <span className="inline-block w-3 h-3 leading-none text-center">+</span> Zustand hinzufügen
          </button>
        )}
        {showCondPicker && (
          <div className="mt-1.5 grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
            {availConds.map(c => (
              <button key={c.id} onClick={() => { onUpdate({ conditions: [...token.conditions, c.id] }); setShowCondPicker(false) }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border ${c.bg} ${c.border} ${c.color} hover:opacity-80`}>
                {c.icon} {c.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Aktionen (token own actions + inline editor) ── */}
      {canEdit && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-zinc-600">⚔️ Aktionen</p>
            <button onClick={() => setShowActionForm(f => !f)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300">
              {showActionForm ? 'Abbrechen' : '+ Neu'}
            </button>
          </div>

          {/* Existing actions */}
          {(token.favorite_actions ?? []).map((fav, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-950/20 border border-sky-900/40">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{fav.name}</p>
                <p className="text-[10px] text-zinc-600">
                  Atk {modSign(fav.attack_bonus)}
                  {(fav.dice_config?.length ?? 0) > 0 && ` · ${fav.dice_config.map(d=>`${d.count}${d.type}`).join('+')}${fav.damage_bonus ? `+${fav.damage_bonus}` : ''}`}
                </p>
              </div>
              <button onClick={() => onRoll([{type:'d20',count:1}], fav.attack_bonus, `${fav.name} Angriff`)}
                className="px-1.5 py-1 rounded bg-amber-900/30 border border-amber-700/50 text-[10px] text-amber-200 hover:bg-amber-900/50">Atk</button>
              {(fav.dice_config?.length ?? 0) > 0 && (
                <button onClick={() => onRoll(fav.dice_config, fav.damage_bonus, `${fav.name} Schaden`)}
                  className="px-1.5 py-1 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">Dmg</button>
              )}
              {canEdit && (
                <button onClick={() => removeAction(idx)} className="p-0.5 text-zinc-700 hover:text-red-400 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Inline new-action form */}
          {showActionForm && (
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg p-2.5 space-y-2">
              <input
                placeholder="Name der Aktion *"
                value={newActionName}
                onChange={e => setNewActionName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">Atk +</span>
                  <input type="number" value={newActionAtk} onChange={e => setNewActionAtk(parseInt(e.target.value)||0)}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">Dmg +</span>
                  <input type="number" value={newActionDmgBonus} onChange={e => setNewActionDmgBonus(parseInt(e.target.value)||0)}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              {/* Dice rows */}
              <div className="space-y-1">
                {newActionDice.map((dc, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="number" min={1} max={20} value={dc.count}
                      onChange={e => updateActionDie(i, { count: parseInt(e.target.value)||1 })}
                      className="w-10 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                    <select value={dc.type} onChange={e => updateActionDie(i, { type: e.target.value })}
                      className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500">
                      {DICE_TYPES_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={dc.damageType ?? ''} onChange={e => updateActionDie(i, { damageType: e.target.value || undefined })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500">
                      {DMG_TYPES_LIST.map(d => <option key={d} value={d}>{d || '—'}</option>)}
                    </select>
                    <button type="button" onClick={() => removeActionDie(i)} className="p-0.5 text-zinc-600 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addActionDie}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300">
                  + Würfel
                </button>
              </div>
              <button onClick={saveNewAction} disabled={!newActionName.trim()}
                className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white">
                Aktion speichern
              </button>
            </div>
          )}
        </div>
      )}

      {/* Player dice favorites (from dice_favorites table) */}
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

      {/* Save to Extras */}
      {isGM && onSaveToExtras && (
        <button
          onClick={onSaveToExtras}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-400 hover:text-emerald-200 mt-1"
        >
          🐾 Zu Extras speichern
        </button>
      )}

      {token.notes && (
        <p className="text-[11px] text-zinc-500 italic border-t border-zinc-800 pt-2">{token.notes}</p>
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
  const [trackerSubTab, setTrackerSubTab] = useState<'initiative' | 'log'>('initiative')
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

  // Fog of War
  const [fogMode, setFogMode] = useState(false)
  const [fogBrushMode, setFogBrushMode] = useState<'paint' | 'erase'>('paint')
  const fogPaintingRef = useRef(false)
  const fogBrushCells = useRef<Set<string>>(new Set())
  const fogBrushModeRef = useRef<'paint' | 'erase'>('paint')
  useEffect(() => { fogBrushModeRef.current = fogBrushMode }, [fogBrushMode])

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

  // Initiative Timer (local state)
  const [timerRemaining, setTimerRemaining] = useState(60)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── V17: Zoom / Pan ──
  const [zoom, setZoom] = useState(1.0)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const zoomRef = useRef(1.0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 })
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // ── V17: Staging ──
  const [showStaging, setShowStaging] = useState(true)
  // ── V19: Click-to-deploy ──
  const [deployingTokenId, setDeployingTokenId] = useState<string | null>(null)

  // ── Encounter Presets ──
  const [encounters, setEncounters] = useState<Array<{id: string; name: string; description?: string; tokens: any[]}>>([])
  const [showEncounterForm, setShowEncounterForm] = useState(false)
  const [encName, setEncName] = useState('')
  const [showEncounters, setShowEncounters] = useState(false)

  // ── Music Player ──
  const MUSIC_ID = '00000000-0000-0000-0000-000000000001'
  const [musicState, setMusicState] = useState<{url?: string; title?: string; is_playing: boolean; volume: number} | null>(null)
  const [showMusicPanel, setShowMusicPanel] = useState(false)
  const [musicInput, setMusicInput] = useState('')
  const [musicTitle, setMusicTitle] = useState('')

  // ── V17: Dice Wall ──
  const [diceWallRolls, setDiceWallRolls] = useState<DiceRollEntry[]>([])
  const [showDiceWall, setShowDiceWall] = useState(true)

  // ── V17: Combat Log ──
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([])
  const [logInput, setLogInput] = useState('')

  // ── V20: Models & Assets ──
  const [placedModels, setPlacedModels] = useState<PlacedModel[]>([])
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([])
  const [sidebarTab, setSidebarTab] = useState<'staging' | 'models' | 'assets'>('staging')
  // Model picker
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [modelImages, setModelImages] = useState<TokenImage[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [selectedModelImage, setSelectedModelImage] = useState<TokenImage | null>(null)
  const [modelForm, setModelForm] = useState({ name: '', span: 1, rotation: 0 })
  const [deployingModelData, setDeployingModelData] = useState<{ image_url: string; name: string; span: number; rotation: number } | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  // Asset picker
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [assetImages, setAssetImages] = useState<TokenImage[]>([])
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetImage, setSelectedAssetImage] = useState<TokenImage | null>(null)
  const [assetForm, setAssetForm] = useState({ name: '', width_cells: 2, height_cells: 2, rotation: 0 })
  const [deployingAssetData, setDeployingAssetData] = useState<{ image_url: string; name: string; width_cells: number; height_cells: number; rotation: number } | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [assetEditUnlocked, setAssetEditUnlocked] = useState<string | null>(null)
  // Map form preset gallery
  const [mapPresets, setMapPresets] = useState<TokenImage[]>([])
  const [mapPresetsLoaded, setMapPresetsLoaded] = useState(false)
  const [mapPresetSearch, setMapPresetSearch] = useState('')
  const [mapGalleryTab, setMapGalleryTab] = useState<'all' | 'favorites'>('all')
  const [mapFavorites, setMapFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('mapFavorites') ?? '[]') } catch { return [] }
  })

  // Drag & Drop – all drag state in ref to avoid stale closures
  const dragStateRef = useRef<{
    tokenId: string; startX: number; startY: number
    dragging: boolean; hoverCol: number | null; hoverRow: number | null
  } | null>(null)
  const [dragRender, setDragRender] = useState<{ tokenId: string; hoverCell: { col: number; row: number } | null } | null>(null)

  // Mutable refs for use inside window event listeners
  const mapRef = useRef<HTMLDivElement>(null)
  const activeMapRef = useRef<BattleMap | null>(null)
  const tokensRef = useRef<BattleToken[]>([])
  const isGMRef = useRef(false)
  const userRef = useRef(user)

  useEffect(() => { activeMapRef.current = activeMap }, [activeMap])
  useEffect(() => { tokensRef.current = tokens }, [tokens])
  useEffect(() => { isGMRef.current = isGM }, [isGM])
  useEffect(() => { userRef.current = user }, [user])

  // ── Computed ──
  const cs = activeMap?.cell_size ?? 50
  const ox = activeMap?.grid_offset_x ?? 0
  const oy = activeMap?.grid_offset_y ?? 0
  const initiativeData: InitiativeData = activeMap?.initiative_data ?? { round: 1, current_turn: 0, timer_seconds: 60, active: false }

  const sortedInitiative = useMemo(() =>
    [...tokens].sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)),
    [tokens]
  )
  const activeTurnToken = sortedInitiative.length > 0
    ? sortedInitiative[initiativeData.current_turn % sortedInitiative.length]
    : null
  // V19: all tokens with the same initiative as the active token move simultaneously
  const activeTurnGroup = useMemo(() => {
    if (!activeTurnToken || !initiativeData.active) return new Set<string>()
    const activeInit = activeTurnToken.initiative ?? 0
    return new Set(sortedInitiative.filter(t => (t.initiative ?? 0) === activeInit).map(t => t.id))
  }, [activeTurnToken, initiativeData.active, sortedInitiative])

  const fogSet = useMemo(() =>
    new Set((activeMap?.fog_cells ?? []).map(f => `${f.col},${f.row}`)),
    [activeMap?.fog_cells]
  )

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
    if (!reachableCells.has(`${hoverCell.col},${hoverCell.row}`)) return []
    return buildPath({ col: token.col, row: token.row }, hoverCell, reachableCells)
  }, [moveMode, movingTokenId, hoverCell, reachableCells, tokens])

  // ── V17: Staged / Map tokens ──
  const stagedTokens = useMemo(() => tokens.filter(t => t.is_staged === true), [tokens])
  const visibleTokensAll = useMemo(() =>
    isGM ? tokens : tokens.filter(t => !t.is_hidden && !fogSet.has(`${t.col},${t.row}`)),
    [tokens, isGM, fogSet]
  )
  const mapTokens = useMemo(() => visibleTokensAll.filter(t => !t.is_staged), [visibleTokensAll])

  // ── Timer ──
  const prevTurnRef = useRef<number>(-1)
  useEffect(() => {
    const curTurn = initiativeData.current_turn
    if (curTurn !== prevTurnRef.current && prevTurnRef.current !== -1) {
      setTimerRemaining(initiativeData.timer_seconds)
    }
    prevTurnRef.current = curTurn
  }, [initiativeData.current_turn, initiativeData.timer_seconds])

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerRemaining(v => {
          if (v <= 1) {
            clearInterval(timerIntervalRef.current!)
            timerIntervalRef.current = null
            setTimerRunning(false)
            return 0
          }
          return v - 1
        })
      }, 1000)
      return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
    }
  }, [timerRunning])

  const toggleTimer = () => {
    if (timerRunning) {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }
      setTimerRunning(false)
    } else {
      if (timerRemaining <= 0) setTimerRemaining(initiativeData.timer_seconds)
      setTimerRunning(true)
    }
  }

  // ── V17: Wheel zoom (passive: false, registered via useEffect) ──
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setZoom(z => {
        const newZoom = Math.max(0.15, Math.min(5, z * factor))
        const rect = viewport.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        setPanX(px => cursorX - (cursorX - px) * (newZoom / z))
        setPanY(py => cursorY - (cursorY - py) * (newZoom / z))
        return newZoom
      })
    }
    viewport.addEventListener('wheel', handler, { passive: false })
    return () => viewport.removeEventListener('wheel', handler)
  }, [])

  // ── V17: Middle-click pan handler on viewport ──
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      isPanningRef.current = true
      panStartRef.current = { x: e.clientX, y: e.clientY, px: panX, py: panY }
    }
  }

  // ── Global drag & drop / fog brush / pan handlers ──
  useEffect(() => {
    const THRESHOLD = 6
    const onMove = (e: MouseEvent) => {
      // Middle-click pan
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        setPanX(panStartRef.current.px + dx)
        setPanY(panStartRef.current.py + dy)
        return
      }

      // Fog brush
      if (fogPaintingRef.current && mapRef.current) {
        const map = activeMapRef.current
        if (!map) return
        const rect = mapRef.current.getBoundingClientRect()
        const canvasX = (e.clientX - rect.left) / zoomRef.current
        const canvasY = (e.clientY - rect.top) / zoomRef.current
        const col = Math.floor((canvasX - (map.grid_offset_x ?? 0)) / map.cell_size)
        const row = Math.floor((canvasY - (map.grid_offset_y ?? 0)) / map.cell_size)
        const key = `${col},${row}`
        if (col >= 0 && row >= 0 && col < map.grid_cols && row < map.grid_rows && !fogBrushCells.current.has(key)) {
          fogBrushCells.current.add(key)
          setActiveMap(prev => {
            if (!prev) return prev
            const fc = prev.fog_cells ?? []
            if (fogBrushModeRef.current === 'paint') {
              if (!fc.some(f => f.col === col && f.row === row)) return { ...prev, fog_cells: [...fc, { col, row }] }
            } else {
              return { ...prev, fog_cells: fc.filter(f => !(f.col === col && f.row === row)) }
            }
            return prev
          })
        }
        return
      }

      // Token drag
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
      const canvasX = (e.clientX - rect.left) / zoomRef.current
      const canvasY = (e.clientY - rect.top) / zoomRef.current
      const col = Math.floor((canvasX - (map.grid_offset_x ?? 0)) / map.cell_size)
      const row = Math.floor((canvasY - (map.grid_offset_y ?? 0)) / map.cell_size)
      const valid = col >= 0 && row >= 0 && col < map.grid_cols && row < map.grid_rows
      ds.hoverCol = valid ? col : null
      ds.hoverRow = valid ? row : null
      setDragRender({ tokenId: ds.tokenId, hoverCell: valid ? { col, row } : null })
    }

    const onUp = async (e: MouseEvent) => {
      // Middle-click pan end
      if (isPanningRef.current) {
        isPanningRef.current = false
        return
      }

      // Fog brush end – save to DB
      if (fogPaintingRef.current) {
        fogPaintingRef.current = false
        const map = activeMapRef.current
        if (map) {
          setActiveMap(prev => {
            if (prev) {
              supabase.from('battle_maps').update({ fog_cells: prev.fog_cells }).eq('id', prev.id)
            }
            return prev
          })
        }
        return
      }

      const ds = dragStateRef.current
      if (!ds) return
      if (!ds.dragging) {
        setSelectedToken(prev => prev === ds.tokenId ? null : ds.tokenId)
      } else if (ds.hoverCol !== null && ds.hoverRow !== null) {
        const col = ds.hoverCol, row = ds.hoverRow
        const tokenId = ds.tokenId
        const map = activeMapRef.current
        const allTokens = tokensRef.current
        const token = allTokens.find(t => t.id === tokenId)

        if (!isGMRef.current && token && token.speed !== null && map) {
          const fpc = map.feet_per_cell ?? 5
          const distCells = Math.abs(col - token.col) + Math.abs(row - token.row)
          const distFeet = distCells * fpc
          const remaining = token.speed - (token.movement_used ?? 0)
          if (distFeet > remaining) {
            dragStateRef.current = null; setDragRender(null); return
          }
          const patch = { col, row, movement_used: (token.movement_used ?? 0) + distFeet }
          await supabase.from('battle_tokens').update(patch).eq('id', tokenId)
          setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, ...patch } : t))
          dragStateRef.current = null; setDragRender(null); return
        }

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
  }, [supabase])

  // ── Arrow key movement + ESC for deploy cancel ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDeployingTokenId(null); setDeployingModelData(null); setDeployingAssetData(null); return }
      if (!selectedToken || !activeMap) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      }
      const dir = dirs[e.key]; if (!dir) return
      e.preventDefault()
      const token = tokens.find(t => t.id === selectedToken); if (!token) return
      const ownsToken = isGM || token.player_user_id === user?.id
      // V19: if initiative is active, token must be in the current initiative group
      const inTurn = !initiativeData.active || isGM || activeTurnGroup.has(token.id)
      const canMove = ownsToken && inTurn; if (!canMove) return
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
  }, [selectedToken, tokens, activeMap, isGM, user, supabase, initiativeData, activeTurnGroup])

  // ── Grid resize mouse handlers ──
  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingResize || !activeMap) return
    const delta = ((e.clientX - resizeDragStart.x) + (e.clientY - resizeDragStart.y)) / 2
    const newSize = Math.max(20, Math.min(150, Math.round(resizeDragStart.cellSize + delta)))
    const newCols = Math.max(4, Math.round(resizeDragStart.canvasW / newSize))
    const newRows = Math.max(4, Math.round(resizeDragStart.canvasH / newSize))
    setActiveMap(prev => prev ? { ...prev, cell_size: newSize, grid_cols: newCols, grid_rows: newRows } : prev)
  }, [isDraggingResize, resizeDragStart, activeMap])

  const handleResizeMouseUp = useCallback(async () => {
    if (!isDraggingResize || !activeMap) return
    setIsDraggingResize(false)
    await supabase.from('battle_maps').update({
      cell_size: activeMap.cell_size, grid_cols: activeMap.grid_cols, grid_rows: activeMap.grid_rows,
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
      ...m,
      difficult_terrain: m.difficult_terrain ?? [],
      map_effects: m.map_effects ?? [],
      feet_per_cell: m.feet_per_cell ?? 5,
      grid_locked: m.grid_locked !== false,
      fog_cells: m.fog_cells ?? [],
      grid_color: m.grid_color ?? '#C8B496',
      initiative_data: m.initiative_data ?? { round: 1, current_turn: 0, timer_seconds: 60, active: false },
    }))
    setMaps(parsed)
    setActiveMap(prev => {
      if (!prev) return parsed[0] ?? null
      const updated = parsed.find((m: BattleMap) => m.id === prev.id)
      return updated ?? prev
    })
  }, [supabase])

  const loadTokens = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_tokens').select('*').eq('map_id', mapId)
    setTokens((data ?? []).map((t: any) => ({
      ...t, conditions: t.conditions ?? [], favorite_actions: t.favorite_actions ?? [],
      token_size: t.token_size ?? 'medium', movement_used: t.movement_used ?? 0,
      is_staged: t.is_staged ?? false, companion_id: t.companion_id ?? null,
    })))
  }, [supabase])

  const loadMyFavorites = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('dice_favorites').select('*').eq('user_id', user.id).order('created_at')
    setMyFavorites((data ?? []) as DiceFavorite[])
  }, [user, supabase])

  // ── V17: Load dice wall rolls ──
  const loadDiceWall = useCallback(async () => {
    const { data } = await supabase
      .from('dice_rolls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(7)
    setDiceWallRolls((data ?? []) as DiceRollEntry[])
  }, [supabase])

  // ── V17: Load combat log ──
  const loadCombatLog = useCallback(async (mapId: string) => {
    const { data } = await supabase
      .from('combat_log')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: false })
      .limit(100)
    setCombatLog((data ?? []) as CombatLogEntry[])
  }, [supabase])

  // ── V20: Load models & assets ──
  const loadPlacedModels = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_placed_models').select('*').eq('map_id', mapId).order('z_index')
    setPlacedModels((data ?? []).map((m: any) => ({ ...m, conditions: m.conditions ?? [] })) as PlacedModel[])
  }, [supabase])

  const loadPlacedAssets = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_placed_assets').select('*').eq('map_id', mapId).order('z_index')
    setPlacedAssets((data ?? []) as PlacedAsset[])
  }, [supabase])

  const loadModelImages = useCallback(async () => {
    const res = await fetch('/api/tokens?category=creatures')
    const json = await res.json()
    setModelImages(json.images ?? [])
  }, [])

  const loadAssetImages = useCallback(async () => {
    const res = await fetch('/api/tokens?category=assets')
    const json = await res.json()
    setAssetImages(json.images ?? [])
  }, [])

  const loadMapPresets = useCallback(async () => {
    const res = await fetch('/api/tokens?category=maps')
    const json = await res.json()
    setMapPresets(json.images ?? [])
    setMapPresetsLoaded(true)
  }, [])

  const toggleMapFavorite = (filename: string) => {
    setMapFavorites(prev => {
      const next = prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
      localStorage.setItem('mapFavorites', JSON.stringify(next))
      return next
    })
  }

  // ── V20: Model overlap check ──
  const modelOverlaps = (col: number, row: number, span: number, excludeId?: string): boolean => {
    const spanInt = Math.max(1, Math.ceil(span))
    // Check against other models
    for (const m of placedModels) {
      if (m.id === excludeId) continue
      const ms = Math.max(1, Math.ceil(m.span))
      if (!(col + spanInt <= m.col || col >= m.col + ms || row + spanInt <= m.row || row >= m.row + ms)) return true
    }
    // Check against map tokens
    for (const t of mapTokens) {
      const ts = Math.max(1, Math.ceil(getSizeSpan(t.token_size || 'medium')))
      if (!(col + spanInt <= t.col || col >= t.col + ts || row + spanInt <= t.row || row >= t.row + ts)) return true
    }
    return false
  }

  // ── V20: Place model on grid ──
  const placeModelAt = async (col: number, row: number) => {
    if (!deployingModelData || !activeMap) return
    if (modelOverlaps(col, row, deployingModelData.span)) return
    const maxZ = placedModels.reduce((m, x) => Math.max(m, x.z_index), 0)
    const { data } = await supabase.from('battle_placed_models').insert({
      map_id: activeMap.id,
      name: deployingModelData.name,
      image_url: deployingModelData.image_url,
      col, row,
      span: deployingModelData.span,
      rotation: deployingModelData.rotation,
      is_hidden: false,
      z_index: maxZ + 1,
    }).select().single()
    if (data) setPlacedModels(prev => [...prev, data as PlacedModel])
    setDeployingModelData(null)
  }

  const deleteModel = async (id: string) => {
    await supabase.from('battle_placed_models').delete().eq('id', id)
    setPlacedModels(prev => prev.filter(m => m.id !== id))
    if (selectedModelId === id) setSelectedModelId(null)
  }

  const toggleModelHidden = async (m: PlacedModel) => {
    await supabase.from('battle_placed_models').update({ is_hidden: !m.is_hidden }).eq('id', m.id)
    setPlacedModels(prev => prev.map(x => x.id === m.id ? { ...x, is_hidden: !m.is_hidden } : x))
  }

  // ── V21: Model HP + abilities ──
  const applyModelHp = async (modelId: string, delta: number) => {
    const model = placedModels.find(m => m.id === modelId)
    if (!model || model.max_hp == null) return
    const newHp = Math.max(0, Math.min(model.max_hp, (model.current_hp ?? model.max_hp) + delta))
    await supabase.from('battle_placed_models').update({ current_hp: newHp }).eq('id', modelId)
    if (model.companion_id) {
      await supabase.from('companion_characters').update({ current_hp: newHp }).eq('id', model.companion_id)
    }
    setPlacedModels(prev => prev.map(x => x.id === modelId ? { ...x, current_hp: newHp } : x))
  }

  const useModelAbility = async (modelId: string, abilityId: string) => {
    const model = placedModels.find(m => m.id === modelId)
    if (!model) return
    const abilities = (model.abilities ?? []).map((a: any) =>
      a.id === abilityId && (a.charges_max === 0 || a.charges_used < a.charges_max)
        ? { ...a, charges_used: a.charges_used + 1 } : a
    )
    await supabase.from('battle_placed_models').update({ abilities }).eq('id', modelId)
    if (model.companion_id) {
      await supabase.from('companion_characters').update({ abilities }).eq('id', model.companion_id)
    }
    setPlacedModels(prev => prev.map(x => x.id === modelId ? { ...x, abilities } : x))
  }

  // ── V21: Generic model update ──
  const updateModel = async (id: string, patch: Partial<PlacedModel>) => {
    await supabase.from('battle_placed_models').update(patch).eq('id', id)
    setPlacedModels(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  // ── V20: Place asset on map (free position) ──
  const placeAssetAt = async (xPct: number, yPct: number) => {
    if (!deployingAssetData || !activeMap) return
    const maxZ = placedAssets.reduce((m, x) => Math.max(m, x.z_index), 0)
    const { data } = await supabase.from('battle_placed_assets').insert({
      map_id: activeMap.id,
      name: deployingAssetData.name,
      image_url: deployingAssetData.image_url,
      x_pct: xPct,
      y_pct: yPct,
      width_cells: deployingAssetData.width_cells,
      height_cells: deployingAssetData.height_cells,
      rotation: deployingAssetData.rotation,
      z_index: Math.max(1, maxZ + 1),
    }).select().single()
    if (data) setPlacedAssets(prev => [...prev, data as PlacedAsset])
    setDeployingAssetData(null)
  }

  const deleteAsset = async (id: string) => {
    await supabase.from('battle_placed_assets').delete().eq('id', id)
    setPlacedAssets(prev => prev.filter(a => a.id !== id))
    if (selectedAssetId === id) setSelectedAssetId(null)
    if (assetEditUnlocked === id) setAssetEditUnlocked(null)
  }

  const updateAssetField = async (id: string, patch: Partial<PlacedAsset>) => {
    await supabase.from('battle_placed_assets').update(patch).eq('id', id)
    setPlacedAssets(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  // ── Encounter helpers ──
  const loadEncounters = useCallback(async () => {
    const { data } = await supabase.from('encounters').select('*').order('created_at', { ascending: false })
    setEncounters(data ?? [])
  }, [supabase])

  const saveEncounter = async () => {
    if (!encName.trim() || !isGM) return
    const tokenData = stagedTokens.map(t => ({
      name: t.name, emoji: t.icon, color: '#ef4444',
      hp: t.current_hp ?? t.max_hp, max_hp: t.max_hp, ac: t.armor_class,
    }))
    await supabase.from('encounters').insert({ name: encName, tokens: tokenData })
    setEncName(''); setShowEncounterForm(false)
    loadEncounters()
  }

  const loadEncounter = async (enc: typeof encounters[0]) => {
    if (!activeMap || !isGM) return
    for (const t of enc.tokens) {
      await supabase.from('battle_tokens').insert({
        map_id: activeMap.id,
        name: t.name ?? 'Token',
        icon: t.emoji ?? '👾',
        col: -1, row: -1,
        max_hp: t.hp ?? 10, current_hp: t.hp ?? 10, armor_class: t.ac ?? 10,
        speed: 30, initiative: 0, challenge_rating: null,
        conditions: [], notes: null, stats: null,
        is_hidden: false, favorite_actions: [],
        player_user_id: null, token_size: 'medium', movement_used: 0,
        is_staged: true, token_type: 'monster',
      })
    }
    loadTokens(activeMap.id)
  }

  // ── Music helpers ──
  function extractYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return m?.[1] ?? null
  }

  const loadMusic = useCallback(async () => {
    const { data } = await supabase.from('music_state').select('*').eq('id', MUSIC_ID).single()
    if (data) {
      setMusicState(data)
      if (data.url) setMusicInput(data.url)
      if (data.title) setMusicTitle(data.title)
    }
  }, [supabase, MUSIC_ID])

  const updateMusic = async (patch: Partial<typeof musicState>) => {
    const newState = { ...(musicState ?? { is_playing: false, volume: 80 }), ...patch }
    setMusicState(newState as typeof musicState)
    await supabase.from('music_state').upsert({ id: MUSIC_ID, ...newState })
  }

  // ── V17: Add combat log entry ──
  const addLogEntry = useCallback(async (
    mapId: string, actorName: string, actionType: string, description: string, isGmAction: boolean
  ) => {
    await supabase.from('combat_log').insert({
      map_id: mapId, actor_name: actorName, action_type: actionType,
      description, is_gm_action: isGmAction,
    })
  }, [supabase])

  // Realtime for battle_maps
  useEffect(() => {
    loadMaps()
    const ch = supabase.channel('battle_maps_rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battle_maps' }, () => loadMaps())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadMaps, supabase])

  useEffect(() => { loadMyFavorites() }, [loadMyFavorites])

  useEffect(() => {
    if (!activeMap) return
    loadTokens(activeMap.id)
    loadCombatLog(activeMap.id)
    loadPlacedModels(activeMap.id)
    loadPlacedAssets(activeMap.id)
    const channel = supabase.channel('battle_' + activeMap.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_tokens', filter: `map_id=eq.${activeMap.id}` },
        () => loadTokens(activeMap.id))
      .subscribe()
    const logChannel = supabase.channel('combat_log_' + activeMap.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'combat_log', filter: `map_id=eq.${activeMap.id}` },
        () => loadCombatLog(activeMap.id))
      .subscribe()
    const modelsChannel = supabase.channel('placed_models_' + activeMap.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_placed_models', filter: `map_id=eq.${activeMap.id}` },
        () => loadPlacedModels(activeMap.id))
      .subscribe()
    const assetsChannel = supabase.channel('placed_assets_' + activeMap.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_placed_assets', filter: `map_id=eq.${activeMap.id}` },
        () => loadPlacedAssets(activeMap.id))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(logChannel)
      supabase.removeChannel(modelsChannel)
      supabase.removeChannel(assetsChannel)
    }
  }, [activeMap?.id, loadTokens, loadCombatLog, loadPlacedModels, loadPlacedAssets, supabase])

  // ── V17: Dice wall realtime ──
  useEffect(() => {
    loadDiceWall()
    const ch = supabase.channel('dice_rolls_wall')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls' }, () => loadDiceWall())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadDiceWall, supabase])

  // ── Encounter presets: load when GM ──
  useEffect(() => {
    if (isGM) loadEncounters()
  }, [isGM, loadEncounters])

  // ── Music: load + realtime ──
  useEffect(() => {
    loadMusic()
    const ch = supabase.channel('music_state_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_state' }, () => loadMusic())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadMusic, supabase])

  // ── Map CRUD ──
  const createMap = async () => {
    if (!user) return
    const cols = parseInt(newMapForm.grid_cols) || 24
    const rows = parseInt(newMapForm.grid_rows) || 16
    const size = parseInt(newMapForm.cell_size) || 50
    const { data } = await supabase.from('battle_maps').insert({
      name: newMapForm.name || 'Neue Karte', image_url: newMapForm.image_url || null,
      grid_cols: cols, grid_rows: rows, cell_size: size,
      is_active: true, created_by: user.id,
      grid_opacity: 0.15, grid_offset_x: 0, grid_offset_y: 0,
      difficult_terrain: [], map_effects: [], feet_per_cell: 5, grid_locked: true,
      fog_cells: [], grid_color: '#C8B496',
      initiative_data: { round: 1, current_turn: 0, timer_seconds: 60, active: false },
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
  const addTokenFromForm = async (form: typeof BLANK_TOKEN_FORM, override?: { player_user_id?: string; forceStaged?: boolean }) => {
    if (!activeMap || !user) return
    const isPlayer = form.token_type === 'player' && override?.player_user_id != null
    const isStaged = override?.forceStaged ? true : isGM && !isPlayer // GM-added go to staging; player "Meine Figur" goes directly to map; player summons go staged
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
      is_staged: isStaged,
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
      token_size: 'medium', movement_used: 0, is_staged: true,
    }).then(() => loadTokens(activeMap.id))
    setShowMonsterLib(false)
  }

  const updateToken = async (id: string, patch: Partial<BattleToken>) => {
    await supabase.from('battle_tokens').update(patch).eq('id', id)
    setTokens(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    // Sync HP to companion_characters if linked
    if (patch.current_hp !== undefined) {
      const token = tokens.find(t => t.id === id)
      if (token?.companion_id) {
        await supabase.from('companion_characters').update({ current_hp: patch.current_hp }).eq('id', token.companion_id)
      }
    }
  }

  // ── V19: Deploy token by click-to-place ──
  const deployToken = (id: string) => {
    // Enter deploy mode — user clicks cell to place
    setDeployingTokenId(id)
  }

  const deployTokenAt = async (id: string, col: number, row: number) => {
    if (!activeMap) return
    // Check overlap — is the cell occupied?
    const tokenToPlace = tokens.find(t => t.id === id)
    const span = Math.max(1, Math.ceil(getSizeSpan(tokenToPlace?.token_size || 'medium')))
    const occupied = mapTokens.some(t => {
      if (t.id === id) return false
      const os = Math.max(1, Math.ceil(getSizeSpan(t.token_size || 'medium')))
      return !(col + span <= t.col || col >= t.col + os || row + span <= t.row || row >= t.row + os)
    })
    if (occupied) return
    await updateToken(id, { is_staged: false, col, row })
    if (tokenToPlace) {
      addLogEntry(activeMap.id, tokenToPlace.name, 'move', `${tokenToPlace.name} wurde auf das Spielfeld gebracht`, true)
    }
    setDeployingTokenId(null)
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

  const saveTokenToExtras = async (token: BattleToken) => {
    const { error } = await supabase.from('companion_characters').insert({
      name:          token.name,
      type:          'npc',
      image_url:     token.icon?.startsWith('http') ? token.icon : null,
      max_hp:        token.max_hp,
      current_hp:    token.current_hp,
      armor_class:   token.armor_class,
      speed:         token.speed,
      str:           token.stats?.str ?? null,
      dex:           token.stats?.dex ?? null,
      con:           token.stats?.con ?? null,
      int:           token.stats?.int ?? null,
      wis:           token.stats?.wis ?? null,
      cha:           token.stats?.cha ?? null,
      notes:         token.notes,
      favorite_dice: (token.favorite_actions ?? []).map(a => ({
        id:           crypto.randomUUID(),
        name:         a.name,
        attack_bonus: a.attack_bonus,
        damage_bonus: a.damage_bonus,
        dice_config:  a.dice_config,
        notes:        '',
      })),
      abilities:     [],
      created_by:    user?.id,
      owner_id:      user?.id,
    })
    if (error) alert(`Fehler: ${error.message}`)
    else alert(`${token.name} wurde in Extras gespeichert!`)
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
    if (e.button !== 0) return
    const canEdit = isGM || token.player_user_id === user?.id
    if (!canEdit || terrainMode || effectMode || moveMode || fogMode) return
    e.preventDefault(); e.stopPropagation()
    dragStateRef.current = {
      tokenId: token.id, startX: e.clientX, startY: e.clientY,
      dragging: false, hoverCol: null, hoverRow: null,
    }
  }, [isGM, user, terrainMode, effectMode, moveMode, fogMode])

  // ── Movement handlers ──
  const startMove = (tokenId: string) => {
    if (moveMode && movingTokenId === tokenId) { setMoveMode(false); setMovingTokenId(null); setMoveTarget(null) }
    else { setMoveMode(true); setMovingTokenId(tokenId); setMoveTarget(null) }
  }

  const confirmMove = async () => {
    if (!moveTarget || !movingTokenId || !activeMap) return
    const token = tokens.find(t => t.id === movingTokenId); if (!token) return
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

  // ── Fog of War ──
  const toggleFog = (col: number, row: number) => {
    if (!activeMap) return
    const fc = activeMap.fog_cells ?? []
    const idx = fc.findIndex(f => f.col === col && f.row === row)
    updateMap({ fog_cells: idx === -1 ? [...fc, { col, row }] : fc.filter((_, i) => i !== idx) })
  }

  const fillFog = () => {
    if (!activeMap) return
    const cells: { col: number; row: number }[] = []
    for (let c = 0; c < activeMap.grid_cols; c++)
      for (let r = 0; r < activeMap.grid_rows; r++)
        cells.push({ col: c, row: r })
    updateMap({ fog_cells: cells })
  }

  const clearFog = () => { if (activeMap) updateMap({ fog_cells: [] }) }

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
      radius: (pendingEffect.type === 'circle' || pendingEffect.type === 'aura') ? pendingRadius : undefined,
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

  // ── Initiative Tracker ──
  const advanceTurn = async () => {
    if (!activeMap || sortedInitiative.length === 0) return
    const nextTurn = (initiativeData.current_turn + 1) % sortedInitiative.length
    const nextRound = nextTurn === 0 ? initiativeData.round + 1 : initiativeData.round
    const newData = { ...initiativeData, current_turn: nextTurn, round: nextRound }
    setActiveMap(prev => prev ? { ...prev, initiative_data: newData } : prev)
    await supabase.from('battle_maps').update({ initiative_data: newData }).eq('id', activeMap.id)
    setTimerRemaining(initiativeData.timer_seconds)
  }

  const prevTurnFn = async () => {
    if (!activeMap || sortedInitiative.length === 0) return
    const prev = (initiativeData.current_turn - 1 + sortedInitiative.length) % sortedInitiative.length
    const prevRound = initiativeData.current_turn === 0 && initiativeData.round > 1
      ? initiativeData.round - 1 : initiativeData.round
    const newData = { ...initiativeData, current_turn: prev, round: prevRound }
    setActiveMap(m => m ? { ...m, initiative_data: newData } : m)
    await supabase.from('battle_maps').update({ initiative_data: newData }).eq('id', activeMap.id)
  }

  const resetInitiative = async () => {
    if (!activeMap) return
    const newData: InitiativeData = { round: 1, current_turn: 0, timer_seconds: initiativeData.timer_seconds, active: false }
    setActiveMap(m => m ? { ...m, initiative_data: newData } : m)
    await supabase.from('battle_maps').update({ initiative_data: newData }).eq('id', activeMap.id)
    setTimerRunning(false); setTimerRemaining(newData.timer_seconds)
  }

  // ── Grid click / move ──
  const getCellFromEvent = (e: React.MouseEvent) => {
    if (!activeMap || !mapRef.current) return null
    const rect = mapRef.current.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) / zoom
    const canvasY = (e.clientY - rect.top) / zoom
    const col = Math.floor((canvasX - ox) / cs)
    const row = Math.floor((canvasY - oy) / cs)
    if (col < 0 || row < 0 || col >= activeMap.grid_cols || row >= activeMap.grid_rows) return null
    return { col, row }
  }

  // ── V17: Fog brush mousedown on canvas ──
  const handleMapMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (fogMode && isGM) {
      e.preventDefault()
      fogPaintingRef.current = true
      fogBrushCells.current = new Set()
      const cell = getCellFromEvent(e)
      if (cell) {
        const key = `${cell.col},${cell.row}`
        fogBrushCells.current.add(key)
        const fc = activeMap?.fog_cells ?? []
        if (fogBrushModeRef.current === 'paint') {
          if (!fc.some(f => f.col === cell.col && f.row === cell.row))
            updateMap({ fog_cells: [...fc, cell] })
        } else {
          updateMap({ fog_cells: fc.filter(f => !(f.col === cell.col && f.row === cell.row)) })
        }
      }
    }
  }

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (dragRender?.tokenId) return
    // Fog brush is handled by mousedown/mousemove, not click
    if (fogMode && isGM) return
    const cell = getCellFromEvent(e); if (!cell) return
    // ── V19: Click-to-deploy mode ──
    if (deployingTokenId) {
      deployTokenAt(deployingTokenId, cell.col, cell.row)
      return
    }
    // ── V20: Deploy model ──
    if (deployingModelData) {
      placeModelAt(cell.col, cell.row)
      return
    }
    // ── V20: Deploy asset (convert cell click to % position) ──
    if (deployingAssetData && activeMap) {
      const mapW = activeMap.grid_cols * cs
      const mapH = activeMap.grid_rows * cs
      const xPct = ((cell.col * cs + cs / 2 - ox) / mapW) * 100
      const yPct = ((cell.row * cs + cs / 2 - oy) / mapH) * 100
      placeAssetAt(Math.max(0, Math.min(100, xPct)), Math.max(0, Math.min(100, yPct)))
      return
    }
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
    const clickedToken = mapTokens.find(t => {
      const span = Math.max(1, Math.ceil(getSizeSpan(t.token_size || 'medium')))
      return cell.col >= t.col && cell.col < t.col + span && cell.row >= t.row && cell.row < t.row + span
    })
    setSelectedToken(clickedToken ? (clickedToken.id === selectedToken ? null : clickedToken.id) : null)
  }

  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cell = getCellFromEvent(e)
    setHoverCoord(cell)
    if (moveMode) setHoverCell(cell); else setHoverCell(null)
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
  const movingToken = movingTokenId ? tokens.find(t => t.id === movingTokenId) : null
  const concentratingTokens = tokens.filter(t => t.conditions.includes('Konzentration'))
  const playerTokens = tokens.filter(t => t.token_type === 'player')

  // ── SVG helpers ──
  const cellPx = (col: number, row: number) => ({ x: col * cs + ox, y: row * cs + oy })

  const renderAoeCircle = (eff: MapEffect) => {
    const cx = (eff.col + 0.5) * cs + ox, cy = (eff.row + 0.5) * cs + oy, r = (eff.radius ?? 3) * cs
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
        <polygon points={`${ax},${ay} ${x1},${y1} ${x2},${y2}`} fill={`${eff.color}28`} stroke={eff.color} strokeWidth="2" strokeDasharray="8 4" />
        <text x={ax + len * 0.45 * Math.cos(dir)} y={ay + len * 0.45 * Math.sin(dir)} textAnchor="middle" dominantBaseline="middle" fontSize="14">{eff.icon ?? '🔺'}</text>
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
    const cx = (eff.col + 0.5) * cs + ox, cy = (eff.row + 0.5) * cs + oy, r = (eff.radius ?? 2) * cs
    return (
      <g key={eff.id}>
        <circle cx={cx} cy={cy} r={r} fill={`${eff.color}15`} stroke={eff.color} strokeWidth="2" strokeDasharray="4 2" />
        <circle cx={cx} cy={cy} r={cs * 0.4} fill={`${eff.color}40`} stroke={eff.color} strokeWidth="1" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14">{eff.icon ?? '🌟'}</text>
      </g>
    )
  }

  // ── Drag snap validity ──
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

  // ── Timer display ──
  const timerMin = Math.floor(timerRemaining / 60).toString().padStart(2, '0')
  const timerSec = (timerRemaining % 60).toString().padStart(2, '0')
  const timerPct = initiativeData.timer_seconds > 0 ? timerRemaining / initiativeData.timer_seconds : 1
  const timerColor = timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171'

  // ── V17: Filtered dice wall ──
  const filteredDiceWall = diceWallRolls.filter(r => isGM || r.visible_to_players)

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
                <span className="text-xs leading-none">+</span> Karte
              </button>
              {activeMap && (
                <>
                  <button onClick={() => setShowGridControls(!showGridControls)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${showGridControls ? 'bg-zinc-700/60 border-zinc-500 text-zinc-200' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    <SlidersHorizontal className="w-3 h-3" /> Gitter
                  </button>
                  <button onClick={() => updateMap({ grid_locked: !(activeMap.grid_locked) })}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${!activeMap.grid_locked ? 'bg-amber-900/30 border-amber-700/60 text-amber-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    {activeMap.grid_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {activeMap.grid_locked ? 'Gesperrt' : 'Entsperrt'}
                  </button>
                  <button onClick={() => { setTerrainMode(!terrainMode); setEffectMode(null); setFogMode(false) }}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${terrainMode ? 'bg-orange-950/40 border-orange-700/60 text-orange-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    Gelände
                  </button>
                  <button onClick={() => { setFogMode(!fogMode); setTerrainMode(false); setEffectMode(null) }}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${fogMode ? 'bg-slate-700/60 border-slate-500/60 text-slate-200' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
                    <Cloud className="w-3 h-3" /> Nebel
                  </button>
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded bg-zinc-700/60 border border-zinc-600/60 text-xs text-zinc-300 hover:bg-zinc-700">
                    <span className="text-xs leading-none">+</span> Token
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
            <button onClick={() => { setShowEffectsPanel(!showEffectsPanel); setTerrainMode(false); setFogMode(false) }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${showEffectsPanel || effectMode ? 'bg-purple-950/40 border-purple-700/60 text-purple-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
              <Flame className="w-3 h-3" /> Effekte
            </button>
          )}

          {!isGM && activeMap && !myToken && (
            <button onClick={addMyPlayerToken}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-sky-950/40 border border-sky-800/50 text-xs text-sky-300 hover:bg-sky-950/60">
              <span className="text-xs leading-none">+</span> Meine Figur
            </button>
          )}
          {!isGM && activeMap && (
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-violet-950/40 border border-violet-800/50 text-xs text-violet-300 hover:bg-violet-950/60">
              <span className="text-xs leading-none">+</span> Beschwörung
            </button>
          )}
          {activeMap && (
            <button onClick={() => setShowMusicPanel(!showMusicPanel)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs transition-colors ${showMusicPanel ? 'bg-emerald-900/30 border-emerald-700/60 text-emerald-300' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 hover:text-zinc-300'}`}>
              🎵 Musik
            </button>
          )}

          {/* ── V17: Zoom controls ── */}
          {activeMap && activeTab === 'map' && (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))}
                className="p-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-500 hover:text-zinc-300" title="Zoom +">
                <ZoomIn className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-zinc-600 tabular-nums w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.max(0.15, z * 0.83))}
                className="p-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-500 hover:text-zinc-300" title="Zoom -">
                <ZoomOut className="w-3 h-3" />
              </button>
              <button onClick={() => { setZoom(1); setPanX(0); setPanY(0) }}
                className="px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 text-[10px] text-zinc-500 hover:text-zinc-300" title="Zoom zurücksetzen">
                1:1
              </button>
            </div>
          )}

          {isGM && activeMap && (
            <div className="flex rounded overflow-hidden border border-zinc-700/60 ml-auto">
              {(['map','tracker'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === t ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/80 text-zinc-500 hover:text-zinc-300'}`}>
                  {t === 'map' ? 'Karte' : 'Initiative'}
                  {t === 'tracker' && activeTurnToken && (
                    <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-amber-400 animate-pulse" />
                  )}
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
                onChange={e => updateMap({ grid_opacity: parseFloat(e.target.value) })} className="w-28 accent-zinc-500" />
              <span className="text-xs text-zinc-400 w-8">{Math.round(activeMap.grid_opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Gitterfarbe</label>
              <input type="color" value={activeMap.grid_color ?? '#C8B496'}
                onChange={e => updateMap({ grid_color: e.target.value })}
                className="w-9 h-7 rounded cursor-pointer border border-zinc-700 bg-transparent p-0.5" />
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
                value={activeMap.feet_per_cell ?? 5} onChange={e => updateMap({ feet_per_cell: parseInt(e.target.value) })}>
                {[5,10,15,20].map(v => <option key={v} value={v}>{v} ft</option>)}
              </select>
            </div>
          </div>
          {!activeMap.grid_locked && (
            <p className="text-xs text-amber-600/80">Gitter entsperrt — ziehe den Griff unten rechts. Das Bild bleibt fixiert; nur die Gitterteilung ändert sich.</p>
          )}
        </div>
      )}

      {/* ── Fog Controls (when fog mode active) ── */}
      {fogMode && isGM && activeMap && (
        <div className="flex-shrink-0 px-4 py-2 bg-slate-900/80 border-b border-slate-700/60 flex items-center gap-3 flex-wrap">
          <Cloud className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-semibold">Nebelkrieg</span>
          {/* V17: Pinsel/Radierer toggle */}
          <div className="flex rounded overflow-hidden border border-slate-700/60">
            <button onClick={() => setFogBrushMode('paint')}
              className={`px-2.5 py-1 text-xs transition-colors ${fogBrushMode === 'paint' ? 'bg-slate-600 text-slate-100' : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'}`}>
              Pinsel
            </button>
            <button onClick={() => setFogBrushMode('erase')}
              className={`px-2.5 py-1 text-xs transition-colors ${fogBrushMode === 'erase' ? 'bg-slate-600 text-slate-100' : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'}`}>
              Radierer
            </button>
          </div>
          <span className="text-xs text-slate-500">Ziehe über Felder zum Malen</span>
          <div className="ml-auto flex gap-2">
            <button onClick={fillFog}
              className="px-2.5 py-1 rounded bg-slate-700/60 border border-slate-600/60 text-xs text-slate-300 hover:bg-slate-700">
              Alles vernebeln
            </button>
            <button onClick={clearFog}
              className="px-2.5 py-1 rounded bg-zinc-700/60 border border-zinc-600/60 text-xs text-zinc-300 hover:bg-zinc-700">
              Nebel entfernen
            </button>
            <button onClick={() => setFogMode(false)}
              className="p-1 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
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
                    <button key={et.id} onClick={() => setEffectMode(effectMode === et.id ? null : et.id)}
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
              {EFFECT_TYPES.find(e => e.id === effectMode)?.simple ? 'Klicke auf ein Feld' : 'Klicke auf den Mittelpunkt'}
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
                    {[[315,'↖'],[0,'↑'],[45,'↗'],[270,'←'],[null,''],[90,'→'],[225,'↙'],[180,'↓'],[135,'↘']].map(([deg,lbl],i) => (
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
          <div className="flex flex-wrap gap-2 items-center">
            <input className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              placeholder="Name" value={newMapForm.name} onChange={e => setNewMapForm(f => ({...f, name: e.target.value}))} />
            <input className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              placeholder="Bild-URL (optional)" value={newMapForm.image_url} onChange={e => setNewMapForm(f => ({...f, image_url: e.target.value}))} />
            {/* V20: Upload button */}
            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-700/60 border border-zinc-600/60 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer">
              ⬆ Von PC hochladen
              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                const fd = new FormData(); fd.append('file', file)
                const res = await fetch('/api/upload-map', { method: 'POST', body: fd })
                const json = await res.json()
                if (json.url) setNewMapForm(f => ({ ...f, image_url: json.url, name: f.name || json.name }))
              }} />
            </label>
          </div>
          {/* V20: Preset map gallery */}
          <div>
            <button
              onClick={() => loadMapPresets()}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 underline mb-1">
              Preset-Maps neu laden
            </button>
            {mapPresets.length > 0 && (
              <div className="mt-1">
                {newMapForm.image_url && mapPresets.some(img => img.url === newMapForm.image_url) && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={newMapForm.image_url} alt="Vorschau" className="w-full aspect-[4/3] max-h-48 object-contain rounded-lg border border-amber-500 mb-2" />
                )}
                {/* Tab bar */}
                <div className="flex gap-1 mb-2">
                  <button onClick={() => setMapGalleryTab('all')}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${mapGalleryTab === 'all' ? 'bg-zinc-700 border-zinc-500 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                    Alle ({mapPresets.length})
                  </button>
                  <button onClick={() => setMapGalleryTab('favorites')}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${mapGalleryTab === 'favorites' ? 'bg-zinc-700 border-zinc-500 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                    ⭐ Favoriten ({mapFavorites.length})
                  </button>
                </div>
                {/* Search */}
                <input
                  type="text"
                  placeholder="Karte suchen…"
                  value={mapPresetSearch}
                  onChange={e => setMapPresetSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 mb-2"
                />
                {/* Grid */}
                <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                  {(() => {
                    const filtered = mapPresets.filter(img =>
                      img.name.toLowerCase().includes(mapPresetSearch.toLowerCase()) &&
                      (mapGalleryTab === 'all' || mapFavorites.includes(img.filename))
                    )
                    const sorted = [
                      ...filtered.filter(img => mapFavorites.includes(img.filename)),
                      ...filtered.filter(img => !mapFavorites.includes(img.filename)),
                    ]
                    return sorted.map(img => (
                      <div key={img.filename} className="relative">
                        <button onClick={() => setNewMapForm(f => ({ ...f, image_url: img.url, name: f.name || img.name }))}
                          title={img.name}
                          className={`w-full relative rounded overflow-hidden border transition-all ${newMapForm.image_url === img.url ? 'border-amber-500' : 'border-zinc-700/60 hover:border-zinc-500'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.name} className="w-full aspect-video object-cover rounded" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[8px] text-zinc-200 truncate px-0.5">{img.name}</div>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleMapFavorite(img.filename) }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/60 text-[10px] hover:bg-black/90 z-10"
                          title={mapFavorites.includes(img.filename) ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}>
                          {mapFavorites.includes(img.filename) ? '⭐' : '☆'}
                        </button>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
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

      {/* ── Music Player Bar ── */}
      {showMusicPanel && activeMap && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-zinc-900/90 border-b border-emerald-900/40 flex items-center gap-3 flex-wrap">
          <span className="text-base">🎵</span>
          {musicState?.title && (
            <span className="text-xs font-semibold text-emerald-300 max-w-40 truncate">{musicState.title}</span>
          )}
          {musicState?.is_playing
            ? <span className="text-[10px] text-emerald-500 animate-pulse">▶ Spielt…</span>
            : <span className="text-[10px] text-zinc-600">⏸ Pausiert</span>
          }
          {isGM && (
            <>
              <input
                className="flex-1 min-w-40 max-w-64 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700"
                placeholder="YouTube-URL…"
                value={musicInput}
                onChange={e => setMusicInput(e.target.value)}
              />
              <input
                className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700"
                placeholder="Titel…"
                value={musicTitle}
                onChange={e => setMusicTitle(e.target.value)}
              />
              <button
                onClick={() => updateMusic({ url: musicInput, title: musicTitle || musicInput, is_playing: true, volume: musicState?.volume ?? 80 })}
                className="px-2.5 py-1 rounded bg-emerald-800/60 border border-emerald-700/50 text-xs text-emerald-200 hover:bg-emerald-800">
                Laden & Starten
              </button>
              <button
                onClick={() => updateMusic({ is_playing: !musicState?.is_playing })}
                className={`px-2.5 py-1 rounded border text-xs transition-colors ${musicState?.is_playing ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                {musicState?.is_playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button onClick={() => updateMusic({ url: undefined, title: undefined, is_playing: false })}
                className="px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-xs text-zinc-500 hover:text-red-400">
                Stop
              </button>
            </>
          )}
          <button onClick={() => setShowMusicPanel(false)} className="ml-auto text-zinc-600 hover:text-zinc-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Hidden YouTube iframe for audio */}
      {musicState?.url && extractYouTubeId(musicState.url) && (
        <div style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', top: '-9999px' }}>
          <iframe
            key={`${extractYouTubeId(musicState.url)}-${musicState.is_playing}`}
            src={`https://www.youtube.com/embed/${extractYouTubeId(musicState.url)}?autoplay=${musicState.is_playing ? 1 : 0}&loop=1&playlist=${extractYouTubeId(musicState.url)}`}
            allow="autoplay"
            title="music"
          />
        </div>
      )}

      {/* ── Movement Bar ── */}
      {moveMode && moveTarget && (
        <div className="flex-shrink-0 px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center gap-3">
          <span className="text-xs text-emerald-300">
            Ziel: ({moveTarget.col},{moveTarget.row}) · Kosten: {reachableCells.get(`${moveTarget.col},${moveTarget.row}`) ?? 0} ft
          </span>
          <button onClick={confirmMove}
            className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-xs font-bold text-white ml-auto">
            <Check className="w-3.5 h-3.5" /> Bestätigen
          </button>
          <button onClick={cancelMove} className="flex items-center gap-1 px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300">
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
        <TokenModal title="Beschwörung / Figur hinzufügen" initial={myTokenInitial}
          onSave={form => addTokenFromForm(form, { player_user_id: user?.id, forceStaged: true })}
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
          onSave={saveEditedToken} onClose={() => setEditingToken(null)} />
      )}

      {/* ── V20: Model Picker Modal ── */}
      {showModelPicker && isGM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-700/80 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <span className="text-xl">🐉</span>
              <p className="flex-1 font-bold text-zinc-100">Modell platzieren</p>
              <button onClick={() => { setShowModelPicker(false); setSelectedModelImage(null) }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {!selectedModelImage ? (
                <>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-700"
                    placeholder="Suche…"
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                  />
                  {modelImages.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-4">Keine Kreatur-Bilder gefunden (public/tokens/creatures/)</p>
                  )}
                  <div className="grid grid-cols-5 gap-2">
                    {modelImages
                      .filter(img => img.name.toLowerCase().includes(modelSearch.toLowerCase()))
                      .map(img => (
                        <button key={img.filename} onClick={() => { setSelectedModelImage(img); setModelForm(f => ({ ...f, name: img.name })) }}
                          className="flex flex-col items-center gap-1 p-1 rounded-lg border border-zinc-700/60 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.name} className="w-14 h-14 object-contain rounded" />
                          <span className="text-[9px] text-zinc-400 text-center leading-tight line-clamp-2">{img.name}</span>
                        </button>
                      ))
                    }
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedModelImage.url} alt={selectedModelImage.name} className="w-16 h-16 object-contain rounded border border-zinc-700" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-200">{selectedModelImage.name}</p>
                      <button onClick={() => setSelectedModelImage(null)} className="text-[11px] text-zinc-600 hover:text-zinc-400 underline">← Anderes Bild</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Name</label>
                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-700"
                      value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Größe</label>
                    <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-700"
                      value={modelForm.span} onChange={e => setModelForm(f => ({ ...f, span: parseInt(e.target.value) }))}>
                      <option value={1}>Winzig/Klein/Mittel (1×1)</option>
                      <option value={2}>Groß (2×2)</option>
                      <option value={3}>Riesig (3×3)</option>
                      <option value={4}>Gigantisch (4×4)</option>
                      <option value={5}>Koloss (5×5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Rotation</label>
                    <div className="flex gap-2">
                      {[0, 90, 180, 270].map(deg => (
                        <button key={deg} onClick={() => setModelForm(f => ({ ...f, rotation: deg }))}
                          className={`flex-1 py-1.5 rounded border text-xs font-semibold transition-colors ${modelForm.rotation === deg ? 'bg-red-900/40 border-red-700/60 text-red-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {selectedModelImage && (
              <div className="flex gap-2 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
                <button onClick={() => { setShowModelPicker(false); setSelectedModelImage(null) }}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400">Abbrechen</button>
                <button
                  disabled={!modelForm.name.trim()}
                  onClick={() => {
                    if (!modelForm.name.trim()) return
                    setDeployingModelData({ image_url: selectedModelImage.url, name: modelForm.name, span: modelForm.span, rotation: modelForm.rotation })
                    setShowModelPicker(false); setSelectedModelImage(null)
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-900 hover:bg-red-800 border border-red-700/60 disabled:opacity-40 text-sm font-bold text-zinc-100">
                  📍 Platzieren
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── V20: Asset Picker Modal ── */}
      {showAssetPicker && isGM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-700/80 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <span className="text-xl">✨</span>
              <p className="flex-1 font-bold text-zinc-100">Asset / Effekt platzieren</p>
              <button onClick={() => { setShowAssetPicker(false); setSelectedAssetImage(null) }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {!selectedAssetImage ? (
                <>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-700"
                    placeholder="Suche…"
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                  />
                  {assetImages.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-4">Keine Asset-Bilder gefunden (public/tokens/assets/)</p>
                  )}
                  <div className="grid grid-cols-5 gap-2">
                    {assetImages
                      .filter(img => img.name.toLowerCase().includes(assetSearch.toLowerCase()))
                      .map(img => (
                        <button key={img.filename} onClick={() => { setSelectedAssetImage(img); setAssetForm(f => ({ ...f, name: img.name })) }}
                          className="flex flex-col items-center gap-1 p-1 rounded-lg border border-zinc-700/60 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.name} className="w-14 h-14 object-contain rounded" />
                          <span className="text-[9px] text-zinc-400 text-center leading-tight line-clamp-2">{img.name}</span>
                        </button>
                      ))
                    }
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedAssetImage.url} alt={selectedAssetImage.name} className="w-16 h-16 object-contain rounded border border-zinc-700" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-200">{selectedAssetImage.name}</p>
                      <button onClick={() => setSelectedAssetImage(null)} className="text-[11px] text-zinc-600 hover:text-zinc-400 underline">← Anderes Bild</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Name</label>
                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-700"
                      value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Breite (Felder)</label>
                      <input type="number" min={1} max={20} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-700"
                        value={assetForm.width_cells} onChange={e => setAssetForm(f => ({ ...f, width_cells: parseInt(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Höhe (Felder)</label>
                      <input type="number" min={1} max={20} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-700"
                        value={assetForm.height_cells} onChange={e => setAssetForm(f => ({ ...f, height_cells: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-2">Rotation</label>
                    <div className="flex gap-2">
                      {[0, 90, 180, 270].map(deg => (
                        <button key={deg} onClick={() => setAssetForm(f => ({ ...f, rotation: deg }))}
                          className={`flex-1 py-1.5 rounded border text-xs font-semibold transition-colors ${assetForm.rotation === deg ? 'bg-amber-900/40 border-amber-700/60 text-amber-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {selectedAssetImage && (
              <div className="flex gap-2 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
                <button onClick={() => { setShowAssetPicker(false); setSelectedAssetImage(null) }}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400">Abbrechen</button>
                <button
                  disabled={!assetForm.name.trim()}
                  onClick={() => {
                    if (!assetForm.name.trim()) return
                    setDeployingAssetData({ image_url: selectedAssetImage.url, name: assetForm.name, width_cells: assetForm.width_cells, height_cells: assetForm.height_cells, rotation: assetForm.rotation })
                    setShowAssetPicker(false); setSelectedAssetImage(null)
                  }}
                  className="flex-1 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 border border-amber-700/60 disabled:opacity-40 text-sm font-bold text-zinc-100">
                  📍 Platzieren
                </button>
              </div>
            )}
          </div>
        </div>
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
                <span>+</span> Karte erstellen
              </button>
            )}
          </div>
        ) : activeTab === 'tracker' && isGM ? (
          /* ── Initiative Tracker Tab ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* ── Sub-tab header ── */}
            <div className="flex rounded-lg overflow-hidden border border-zinc-800">
              <button onClick={() => setTrackerSubTab('initiative')}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${trackerSubTab === 'initiative' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}>
                Initiative
              </button>
              <button onClick={() => setTrackerSubTab('log')}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${trackerSubTab === 'log' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}>
                Kampflog
                {combatLog.length > 0 && <span className="ml-1 text-[10px] text-zinc-600">({combatLog.length})</span>}
              </button>
            </div>

            {trackerSubTab === 'initiative' ? (
              <>
                {/* ── Timer & Controls ── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold">Runde</p>
                      <p className="text-3xl font-black text-amber-400 leading-none">{initiativeData.round}</p>
                    </div>
                    {activeTurnToken && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/40">
                        <span className="text-lg">{activeTurnToken.icon}</span>
                        <div>
                          <p className="text-xs text-amber-400 font-semibold">Am Zug</p>
                          <p className="text-sm font-bold text-zinc-100">{activeTurnToken.name}</p>
                        </div>
                      </div>
                    )}
                    {sortedInitiative.length === 0 && (
                      <p className="text-xs text-zinc-600">Keine Token – füge Figuren zur Karte hinzu</p>
                    )}
                  </div>

                  {/* Timer */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-400">Zugtimer</span>
                      </div>
                      <span className="text-xl font-black tabular-nums" style={{ color: timerColor }}>
                        {timerMin}:{timerSec}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${timerPct * 100}%`, backgroundColor: timerColor }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={toggleTimer}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          timerRunning
                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-300 hover:bg-amber-900/50'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}>
                        {timerRunning ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Start</>}
                      </button>
                      <button onClick={() => setTimerRemaining(initiativeData.timer_seconds)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-500 hover:text-zinc-300">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-600">Limit:</span>
                        <select className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none"
                          value={initiativeData.timer_seconds}
                          onChange={e => updateMap({ initiative_data: { ...initiativeData, timer_seconds: parseInt(e.target.value) } })}>
                          {[30,60,90,120,180,300].map(s => <option key={s} value={s}>{s}s</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Navigation buttons – GM only */}
                  {isGM ? (
                    <div className="flex gap-2">
                      <button onClick={prevTurnFn}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200">
                        <SkipBack className="w-3.5 h-3.5" /> Zurück
                      </button>
                      <button onClick={advanceTurn}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-800 hover:bg-amber-700 border border-amber-600/60 text-xs font-bold text-amber-100">
                        <SkipForward className="w-3.5 h-3.5" /> Nächster Zug
                      </button>
                      <button onClick={resetInitiative}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200" title="Kampf zurücksetzen">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* V19: Player "end turn" button - only visible when it's their token's turn */
                    (() => {
                      const myActiveToken = sortedInitiative.find(t =>
                        activeTurnGroup.has(t.id) && t.player_user_id === user?.id
                      )
                      return myActiveToken ? (
                        <button onClick={advanceTurn}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-800 hover:bg-amber-700 border border-amber-600/60 text-sm font-bold text-amber-100 transition-colors shadow-lg shadow-amber-900/30">
                          <SkipForward className="w-4 h-4" /> Zug beenden
                        </button>
                      ) : (
                        <div className="text-center text-xs text-zinc-600 py-2">Warte auf deinen Zug…</div>
                      )
                    })()
                  )}
                </div>

                {/* ── Party HP Overview ── */}
                {playerTokens.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-semibold text-zinc-600 mb-2 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-700" /> Gruppen-HP
                    </p>
                    <div className="space-y-1.5">
                      {playerTokens.map(t => {
                        const pct = t.max_hp ? Math.max(0, Math.min(1, (t.current_hp ?? 0) / t.max_hp)) : null
                        const color = pct === null ? '#52525b' : pct > 0.6 ? '#4ade80' : pct > 0.3 ? '#facc15' : '#f87171'
                        return (
                          <div key={t.id}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-zinc-300 flex items-center gap-1">
                                <span>{t.icon}</span> {t.name}
                              </span>
                              <span className="font-bold tabular-nums" style={{ color }}>
                                {t.current_hp ?? '?'} / {t.max_hp ?? '?'}
                              </span>
                            </div>
                            {pct !== null && (
                              <div className="h-1 rounded-full bg-zinc-800">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Initiative Order ── */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-zinc-500">{tokens.length} Figuren · nach Initiative sortiert</p>
                    <button onClick={resetAllMovement}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-500 hover:text-zinc-300">
                      <RotateCcw className="w-3 h-3" /> Bewegung reset
                    </button>
                  </div>
                  {tokens.length === 0 && <p className="text-sm text-zinc-700 text-center py-8">Keine Token auf der Karte.</p>}
                  {sortedInitiative.map((t, idx) => {
                    const activeConds = CONDITIONS.filter(c => t.conditions.includes(c.id))
                    const remainFt = (t.speed ?? 0) - (t.movement_used ?? 0)
                    const isActive = initiativeData.active && activeTurnGroup.size > 0 ? activeTurnGroup.has(t.id) : activeTurnToken?.id === t.id
                    return (
                      <div key={t.id} onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                          isActive
                            ? 'border-amber-600/70 bg-amber-950/30 shadow-lg shadow-amber-900/20 scale-[1.01]'
                            : selectedToken === t.id ? 'border-zinc-500 bg-zinc-800/60'
                            : t.token_type === 'player' ? 'border-sky-900/50 bg-sky-950/20 hover:bg-sky-950/30'
                            : t.token_type === 'monster' ? 'border-red-900/50 bg-red-950/20 hover:bg-red-950/30'
                            : 'border-zinc-700/60 bg-zinc-800/30 hover:bg-zinc-800/50'
                        } ${t.is_hidden ? 'opacity-40' : ''}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${isActive ? 'bg-amber-700 text-amber-100' : 'bg-zinc-800 text-zinc-500'}`}>
                          {idx + 1}
                        </div>
                        <div className="w-7 h-7 rounded flex items-center justify-center bg-zinc-800/80 border border-zinc-700/60 flex-shrink-0">
                          <span className="text-xs font-bold text-amber-500">{modSign(t.initiative ?? 0)}</span>
                        </div>
                        {(t.icon?.startsWith('http') || t.icon?.startsWith('/')) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.icon} alt={t.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <span className="text-xl flex-shrink-0">{t.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{t.name}</p>
                            {t.is_staged && <span className="text-[9px] uppercase font-bold text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">Bereit</span>}
                            {isActive && <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">Am Zug</span>}
                            {t.is_hidden && <EyeOff className="w-3 h-3 text-zinc-600" />}
                            {activeConds.map(c => <span key={c.id} className={`text-[10px] px-1 rounded ${c.bg} ${c.border} ${c.color}`}>{c.icon}</span>)}
                          </div>
                          <div className="flex gap-3 text-[11px] text-zinc-600 flex-wrap">
                            {t.max_hp !== null && <span className={t.current_hp === 0 ? 'text-red-500' : ''}>{t.current_hp}/{t.max_hp} HP</span>}
                            {t.armor_class !== null && <span>RK {t.armor_class}</span>}
                            {t.speed !== null && <span className={remainFt <= 0 ? 'text-red-600' : 'text-sky-600'}>{remainFt}/{t.speed} ft</span>}
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

                {/* ── Concentration Tracker ── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-semibold text-zinc-600 mb-2 flex items-center gap-1">
                    🎯 Konzentrations-Tracker
                  </p>
                  {concentratingTokens.length === 0 ? (
                    <p className="text-xs text-zinc-700 italic">Keine aktiven Konzentrationszauber</p>
                  ) : (
                    <div className="space-y-1.5">
                      {concentratingTokens.map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40">
                          <span className="text-base">{t.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-indigo-200 truncate">{t.name}</p>
                            <p className="text-[10px] text-indigo-600">Konzentration aktiv</p>
                          </div>
                          <button
                            onClick={() => updateToken(t.id, { conditions: t.conditions.filter(c => c !== 'Konzentration') })}
                            className="text-xs text-indigo-500 hover:text-red-400 px-2 py-0.5 rounded border border-indigo-800/40 hover:border-red-800/40 transition-colors">
                            Unterbrechen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── V17: Combat Log Sub-Tab ── */
              <div className="space-y-3">
                {/* Manual entry for GM */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] uppercase font-semibold text-zinc-600">Eintrag hinzufügen</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      placeholder="Beschreibung…"
                      value={logInput}
                      onChange={e => setLogInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && logInput.trim() && activeMap) {
                          addLogEntry(activeMap.id, user?.email ?? 'GM', 'note', logInput.trim(), true)
                          setLogInput('')
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (logInput.trim() && activeMap) {
                          addLogEntry(activeMap.id, user?.email ?? 'GM', 'note', logInput.trim(), true)
                          setLogInput('')
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 text-xs text-zinc-300 hover:bg-zinc-600">
                      Hinzufügen
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (!activeMap) return
                      await supabase.from('combat_log').delete().eq('map_id', activeMap.id)
                      setCombatLog([])
                    }}
                    className="text-[10px] text-zinc-700 hover:text-red-500 transition-colors">
                    Log leeren
                  </button>
                </div>

                {/* Log entries */}
                <div className="space-y-1">
                  {combatLog.length === 0 && (
                    <p className="text-xs text-zinc-700 text-center py-8">Noch keine Kampflog-Einträge.</p>
                  )}
                  {combatLog.map(entry => (
                    <div key={entry.id}
                      className={`px-3 py-2 rounded-lg border text-xs ${
                        entry.is_gm_action
                          ? 'bg-red-950/20 border-red-900/40 text-red-300'
                          : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                      }`}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-[11px]">{entry.actor_name}</span>
                        <span className="text-[10px] text-zinc-600 tabular-nums">
                          {new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{entry.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Map View ── */
          <div className="flex-1 overflow-hidden flex">

            {/* ── Left Panel (Staging / Models / Assets tabs) ── */}
            {activeMap && (
              <div className={`flex-shrink-0 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-all ${showStaging ? 'w-56' : 'w-8'}`}>
                <button
                  onClick={() => setShowStaging(!showStaging)}
                  className="flex items-center justify-center p-2 text-zinc-600 hover:text-zinc-400 border-b border-zinc-800/60 flex-shrink-0"
                  title={showStaging ? 'Panel ausblenden' : 'Panel einblenden'}>
                  {showStaging ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                </button>
                {showStaging && (
                  <>
                    {/* Tab bar */}
                    <div className="flex border-b border-zinc-800/60 flex-shrink-0">
                      {([
                        { id: 'staging', label: 'Bereit' },
                        { id: 'models', label: 'Modelle' },
                        { id: 'assets', label: 'Assets' },
                      ] as const).map(tab => (
                        <button key={tab.id} onClick={() => setSidebarTab(tab.id)}
                          className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${sidebarTab === tab.id ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">

                    {/* ── Staging Tab ── */}
                    {sidebarTab === 'staging' && (
                      <>
                    <p className="text-[10px] uppercase font-semibold text-zinc-600 flex items-center gap-1 px-1">
                      <Layers className="w-3 h-3" /> Bereitstellung
                    </p>
                    {stagedTokens.length === 0 && (
                      <p className="text-[10px] text-zinc-700 italic px-1">Keine bereitgestellten Token</p>
                    )}
                    {stagedTokens.map(t => (
                      <div key={t.id}
                        className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                          selectedToken === t.id ? 'border-amber-600/70 bg-amber-950/20' : 'border-zinc-700/60 bg-zinc-900/60 hover:bg-zinc-800/60'
                        }`}
                        onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {(t.icon?.startsWith('http') || t.icon?.startsWith('/')) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.icon} alt={t.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="text-base flex-shrink-0">{t.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-zinc-200 truncate">{t.name}</p>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                              t.token_type === 'player' ? 'bg-sky-900/30 text-sky-400' :
                              t.token_type === 'monster' ? 'bg-red-900/30 text-red-400' :
                              'bg-zinc-800/60 text-zinc-500'
                            }`}>
                              {t.token_type === 'player' ? 'Spieler' : t.token_type === 'monster' ? 'Kreatur' : 'NPC'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deployToken(t.id) }}
                          className={`w-full py-1 rounded border text-[10px] font-semibold transition-colors ${
                            deployingTokenId === t.id
                              ? 'bg-emerald-600/40 border-emerald-500/70 text-emerald-200 animate-pulse'
                              : 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50'
                          }`}>
                          {deployingTokenId === t.id ? '📍 Feld klicken…' : '⬇ Platzieren'}
                        </button>
                      </div>
                    ))}

                    {/* ── Encounter Presets (GM only) ── */}
                    {isGM && (
                      <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                        <button
                          onClick={() => setShowEncounters(!showEncounters)}
                          className="w-full flex items-center justify-between px-1 py-0.5 text-[10px] uppercase font-semibold text-zinc-600 hover:text-zinc-400">
                          <span>⚔️ Encounter-Presets</span>
                          {showEncounters ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                        </button>
                        {showEncounters && (
                          <div className="space-y-1.5">
                            {/* Save current staging as preset */}
                            {!showEncounterForm ? (
                              <button
                                onClick={() => setShowEncounterForm(true)}
                                disabled={stagedTokens.length === 0}
                                className="w-full py-1 rounded border border-zinc-700/60 bg-zinc-800/40 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40">
                                + Bereitstellung speichern
                              </button>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700"
                                  placeholder="Name…"
                                  value={encName}
                                  onChange={e => setEncName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEncounter() }}
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <button onClick={saveEncounter}
                                    className="flex-1 py-1 rounded bg-red-900/40 border border-red-700/50 text-[10px] text-red-200 hover:bg-red-900/60">
                                    Speichern
                                  </button>
                                  <button onClick={() => { setShowEncounterForm(false); setEncName('') }}
                                    className="px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60 text-[10px] text-zinc-500">
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* Saved encounters list */}
                            {encounters.length === 0 && (
                              <p className="text-[10px] text-zinc-700 italic">Keine Presets gespeichert</p>
                            )}
                            {encounters.map(enc => (
                              <div key={enc.id} className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 p-1.5 space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-[11px] font-semibold text-zinc-200 truncate flex-1">{enc.name}</p>
                                  <span className="text-[9px] text-zinc-600">{enc.tokens?.length ?? 0} Token</span>
                                </div>
                                <button
                                  onClick={() => loadEncounter(enc)}
                                  className="w-full py-0.5 rounded bg-amber-900/30 border border-amber-700/50 text-[10px] text-amber-300 hover:bg-amber-900/50">
                                  Laden
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                      </>
                    )}

                    {/* ── Models Tab ── */}
                    {sidebarTab === 'models' && isGM && (
                      <>
                        <button
                          onClick={() => { loadModelImages(); setShowModelPicker(true) }}
                          className="w-full py-1.5 rounded border border-red-800/50 bg-red-950/30 text-[10px] font-semibold text-red-300 hover:bg-red-950/50 transition-colors">
                          🐉 Modell hinzufügen
                        </button>
                        {deployingModelData && (
                          <div className="rounded-lg border border-emerald-600/50 bg-emerald-950/30 px-2 py-1.5 text-[10px] text-emerald-300 animate-pulse text-center">
                            📍 Klicke auf ein Grid-Feld…<br />
                            <button onClick={() => setDeployingModelData(null)} className="text-zinc-500 hover:text-zinc-300 underline mt-0.5">Abbrechen</button>
                          </div>
                        )}
                        {placedModels.length === 0 && !deployingModelData && (
                          <p className="text-[10px] text-zinc-700 italic px-1">Keine Modelle auf der Karte</p>
                        )}
                        {placedModels.map(m => (
                          <div key={m.id}>
                            <div
                              className={`rounded-lg border p-1.5 cursor-pointer transition-colors ${selectedModelId === m.id ? 'border-red-600/60 bg-red-950/20' : 'border-zinc-700/60 bg-zinc-900/60 hover:bg-zinc-800/60'}`}
                              onClick={() => setSelectedModelId(m.id === selectedModelId ? null : m.id)}>
                              <div className="flex items-center gap-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.image_url} alt={m.name} className="w-8 h-8 object-contain rounded flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-zinc-200 truncate">{m.name}</p>
                                  <p className="text-[9px] text-zinc-600">{m.span}×{m.span} · {m.rotation}° {m.is_hidden ? '· versteckt' : ''}</p>
                                  {m.max_hp != null && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[9px] text-red-400">{m.current_hp ?? m.max_hp}/{m.max_hp} HP</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={e => { e.stopPropagation(); toggleModelHidden(m) }}
                                    className="p-0.5 text-zinc-600 hover:text-zinc-300">
                                    {m.is_hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); deleteModel(m.id) }}
                                    className="p-0.5 text-zinc-600 hover:text-red-500">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {/* V21: Model stat panel */}
                            {selectedModelId === m.id && (
                              <div className="bg-zinc-900/80 border border-red-800/30 rounded-lg p-2 mt-0.5 space-y-2">
                                {/* HP bar */}
                                {m.max_hp != null && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] text-zinc-400">HP</span>
                                      <span className="text-[10px] font-bold text-zinc-200">{m.current_hp ?? m.max_hp} / {m.max_hp}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all ${((m.current_hp ?? m.max_hp) / m.max_hp) > 0.6 ? 'bg-emerald-500' : ((m.current_hp ?? m.max_hp) / m.max_hp) > 0.3 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.max(0, Math.min(100, ((m.current_hp ?? m.max_hp) / m.max_hp) * 100))}%` }} />
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      <button onClick={() => applyModelHp(m.id, -1)} className="flex-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200">−1</button>
                                      <button onClick={() => applyModelHp(m.id, -5)} className="flex-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200">−5</button>
                                      <button onClick={() => applyModelHp(m.id, 5)} className="flex-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200">+5</button>
                                      <button onClick={() => applyModelHp(m.id, 1)} className="flex-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200">+1</button>
                                    </div>
                                  </div>
                                )}
                                {/* AC / Speed */}
                                <div className="flex gap-2 text-[10px]">
                                  {m.armor_class != null && <span className="text-zinc-400">🛡 <span className="text-zinc-200 font-bold">{m.armor_class}</span> RK</span>}
                                  {m.speed != null && <span className="text-zinc-400">⚡ <span className="text-zinc-200 font-bold">{m.speed}</span> ft</span>}
                                </div>
                                {/* Ability scores */}
                                {m.model_stats && Object.keys(m.model_stats).length > 0 && (
                                  <div className="grid grid-cols-6 gap-0.5">
                                    {(['str','dex','con','int','wis','cha'] as const).map(k => (
                                      <div key={k} className="text-center bg-zinc-800/60 rounded py-1">
                                        <p className="text-[8px] text-zinc-600 uppercase">{k}</p>
                                        <p className="text-[10px] font-bold text-zinc-200">{m.model_stats![k] != null ? (Math.floor((m.model_stats![k]-10)/2) >= 0 ? `+${Math.floor((m.model_stats![k]-10)/2)}` : `${Math.floor((m.model_stats![k]-10)/2)}`) : '—'}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Abilities */}
                                {m.abilities && m.abilities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {m.abilities.map((a: any) => {
                                      const exhausted = a.charges_max > 0 && a.charges_used >= a.charges_max
                                      return (
                                        <button key={a.id}
                                          onClick={() => !exhausted && useModelAbility(m.id, a.id)}
                                          disabled={exhausted}
                                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${exhausted ? 'border-zinc-700 text-zinc-600 cursor-not-allowed' : 'border-amber-700/60 text-amber-300 hover:bg-amber-950/40'}`}>
                                          {a.name}
                                          {a.charges_max > 0 && (
                                            <span className="flex gap-0.5">
                                              {Array.from({ length: a.charges_max }).map((_: any, i: number) => (
                                                <span key={i} className={i < a.charges_used ? 'text-zinc-600' : 'text-amber-400'}>{i < a.charges_used ? '○' : '●'}</span>
                                              ))}
                                            </span>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                                {/* Favorite dice */}
                                {m.favorite_dice && m.favorite_dice.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {m.favorite_dice.map((d: any) => (
                                      <span key={d.id} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] text-zinc-300">🎲 {d.dice}</span>
                                    ))}
                                  </div>
                                )}
                                {/* Notes */}
                                {m.notes && <p className="text-[9px] text-zinc-500 line-clamp-2">{m.notes}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {sidebarTab === 'models' && !isGM && (
                      <p className="text-[10px] text-zinc-700 italic px-1">Nur für GM sichtbar</p>
                    )}

                    {/* ── Assets Tab ── */}
                    {sidebarTab === 'assets' && isGM && (
                      <>
                        <button
                          onClick={() => { loadAssetImages(); setShowAssetPicker(true) }}
                          className="w-full py-1.5 rounded border border-amber-800/50 bg-amber-950/30 text-[10px] font-semibold text-amber-300 hover:bg-amber-950/50 transition-colors">
                          ✨ Asset hinzufügen
                        </button>
                        {deployingAssetData && (
                          <div className="rounded-lg border border-emerald-600/50 bg-emerald-950/30 px-2 py-1.5 text-[10px] text-emerald-300 animate-pulse text-center">
                            📍 Klicke auf die Karte…<br />
                            <button onClick={() => setDeployingAssetData(null)} className="text-zinc-500 hover:text-zinc-300 underline mt-0.5">Abbrechen</button>
                          </div>
                        )}
                        {placedAssets.length === 0 && !deployingAssetData && (
                          <p className="text-[10px] text-zinc-700 italic px-1">Keine Assets auf der Karte</p>
                        )}
                        {placedAssets.map(a => (
                          <div key={a.id}>
                            <div
                              className={`rounded-lg border p-1.5 cursor-pointer transition-colors ${selectedAssetId === a.id ? 'border-amber-600/60 bg-amber-950/20' : 'border-zinc-700/60 bg-zinc-900/60 hover:bg-zinc-800/60'}`}
                              onClick={() => setSelectedAssetId(a.id === selectedAssetId ? null : a.id)}>
                              <div className="flex items-center gap-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.image_url} alt={a.name} className="w-8 h-8 object-contain rounded flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-zinc-200 truncate">{a.name}</p>
                                  <p className="text-[9px] text-zinc-600">{a.width_cells}×{a.height_cells}F · {a.rotation}°</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); setAssetEditUnlocked(assetEditUnlocked === a.id ? null : a.id) }}
                                  className={`p-0.5 ${assetEditUnlocked === a.id ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                                  title={assetEditUnlocked === a.id ? 'Sperren' : 'Bearbeiten'}>
                                  {assetEditUnlocked === a.id ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                </button>
                                <button onClick={e => { e.stopPropagation(); deleteAsset(a.id) }}
                                  className="p-0.5 text-zinc-600 hover:text-red-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {/* V21: Asset editing panel */}
                            {assetEditUnlocked === a.id && (
                              <div className="bg-zinc-900/80 border border-amber-800/30 rounded-lg p-2 mt-0.5 space-y-2">
                                <p className="text-[9px] text-amber-400 font-semibold">Position verschieben</p>
                                <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                                  <div />
                                  <button onClick={() => updateAssetField(a.id, { y_pct: Math.max(0, a.y_pct - 1) })}
                                    className="py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 hover:text-zinc-100">▲</button>
                                  <div />
                                  <button onClick={() => updateAssetField(a.id, { x_pct: Math.max(0, a.x_pct - 1) })}
                                    className="py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 hover:text-zinc-100">◀</button>
                                  <div className="flex items-center justify-center text-[8px] text-zinc-600">pos</div>
                                  <button onClick={() => updateAssetField(a.id, { x_pct: Math.min(100, a.x_pct + 1) })}
                                    className="py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 hover:text-zinc-100">▶</button>
                                  <div />
                                  <button onClick={() => updateAssetField(a.id, { y_pct: Math.min(100, a.y_pct + 1) })}
                                    className="py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 hover:text-zinc-100">▼</button>
                                  <div />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[9px] text-zinc-500">Rotation: {Math.round(a.rotation)}°</label>
                                  </div>
                                  <input type="range" min={0} max={359} step={1} value={a.rotation}
                                    onChange={e => updateAssetField(a.id, { rotation: Number(e.target.value) })}
                                    className="w-full accent-amber-500" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-zinc-500 block mb-0.5">Breite: {a.width_cells}F</label>
                                  <input type="range" min={0.5} max={10} step={0.5} value={a.width_cells}
                                    onChange={e => updateAssetField(a.id, { width_cells: Number(e.target.value) })}
                                    className="w-full accent-amber-500" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-zinc-500 block mb-0.5">Höhe: {a.height_cells}F</label>
                                  <input type="range" min={0.5} max={10} step={0.5} value={a.height_cells}
                                    onChange={e => updateAssetField(a.id, { height_cells: Number(e.target.value) })}
                                    className="w-full accent-amber-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {sidebarTab === 'assets' && !isGM && (
                      <p className="text-[10px] text-zinc-700 italic px-1">Nur für GM sichtbar</p>
                    )}

                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── V17: Viewport (zoom/pan container) ── */}
            <div
              ref={viewportRef}
              className="flex-1 overflow-hidden relative bg-zinc-950"
              onMouseDown={handleViewportMouseDown}
              onDoubleClick={() => { setZoom(1); setPanX(0); setPanY(0) }}
              style={{ cursor: isPanningRef.current ? 'grabbing' : 'default' }}
            >
              {/* Canvas (transformed for zoom/pan) */}
              <div
                ref={mapRef}
                className="relative select-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  width: activeMap.grid_cols * cs + ox,
                  height: activeMap.grid_rows * cs + oy,
                  backgroundImage: activeMap.image_url
                    ? `url(${activeMap.image_url})`
                    : 'linear-gradient(160deg, #0c0008 0%, #050010 40%, #0a0005 70%, #000000 100%)',
                  backgroundSize: '100% 100%', backgroundPosition: 'top left',
                  cursor: fogMode ? 'crosshair' : terrainMode ? 'crosshair' : effectMode ? 'cell' : moveMode ? 'pointer' : dragRender ? 'grabbing' : 'default',
                }}
                onClick={handleGridClick}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleGridMouseMove}
                onMouseLeave={() => { setHoverCell(null); setHoverCoord(null) }}
              >
                {/* SVG Overlay */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                  {/* Grid lines */}
                  {Array.from({ length: activeMap.grid_cols + 1 }, (_, i) => (
                    <line key={`v${i}`}
                      x1={i * cs + ox} y1={oy} x2={i * cs + ox} y2={activeMap.grid_rows * cs + oy}
                      stroke={hexToRgba(activeMap.grid_color ?? '#C8B496', activeMap.grid_opacity ?? 0.15)} strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: activeMap.grid_rows + 1 }, (_, i) => (
                    <line key={`h${i}`}
                      x1={ox} y1={i * cs + oy} x2={activeMap.grid_cols * cs + ox} y2={i * cs + oy}
                      stroke={hexToRgba(activeMap.grid_color ?? '#C8B496', activeMap.grid_opacity ?? 0.15)} strokeWidth="0.5" />
                  ))}

                  {/* Difficult Terrain */}
                  {(activeMap.difficult_terrain ?? []).map(dt => {
                    const p = cellPx(dt.col, dt.row)
                    return <rect key={`dt-${dt.col}-${dt.row}`} x={p.x + 1} y={p.y + 1} width={cs - 2} height={cs - 2}
                      fill="rgba(255,100,0,0.14)" stroke="rgba(255,100,0,0.35)" strokeWidth="1" strokeDasharray="4 2" />
                  })}

                  {/* AOE Effects */}
                  {(activeMap.map_effects ?? []).map(eff => {
                    if (eff.type === 'circle') return renderAoeCircle(eff)
                    if (eff.type === 'cone') return renderAoeCone(eff)
                    if (eff.type === 'line') return renderAoeLine(eff)
                    if (eff.type === 'aura') return renderAoeAura(eff)
                    return null
                  })}

                  {/* Reachable cells */}
                  {moveMode && Array.from(reachableCells.entries()).map(([key]) => {
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

                  {/* Drag snap preview */}
                  {dragRender?.hoverCell && (() => {
                    const p = cellPx(dragRender.hoverCell.col, dragRender.hoverCell.row)
                    const dtoken = tokens.find(t => t.id === dragRender.tokenId)
                    const span = Math.max(1, Math.ceil(getSizeSpan(dtoken?.token_size ?? 'medium')))
                    return <rect x={p.x} y={p.y} width={span * cs} height={span * cs}
                      fill={isDragCellValid ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)'}
                      stroke={isDragCellValid ? 'rgba(52,211,153,0.7)' : 'rgba(239,68,68,0.7)'}
                      strokeWidth="2" strokeDasharray="6 3" rx="4" />
                  })()}

                  {/* Fog of War */}
                  {(activeMap.fog_cells ?? []).map(fc => {
                    const p = cellPx(fc.col, fc.row)
                    return (
                      <rect key={`fog-${fc.col}-${fc.row}`}
                        x={p.x} y={p.y} width={cs} height={cs}
                        fill={isGM ? 'rgba(5,0,20,0.72)' : 'rgba(0,0,0,0.97)'}
                        stroke={isGM ? 'rgba(80,60,120,0.35)' : 'none'}
                        strokeWidth={isGM ? 0.5 : 0}
                      />
                    )
                  })}

                  {/* Fog mode hover indicator */}
                  {fogMode && hoverCoord && (
                    <rect x={hoverCoord.col * cs + ox} y={hoverCoord.row * cs + oy}
                      width={cs} height={cs}
                      fill={
                        fogBrushMode === 'erase'
                          ? 'rgba(200,255,200,0.15)'
                          : fogSet.has(`${hoverCoord.col},${hoverCoord.row}`) ? 'rgba(200,200,255,0.15)' : 'rgba(80,60,120,0.30)'
                      }
                      stroke={fogBrushMode === 'erase' ? 'rgba(100,220,100,0.8)' : 'rgba(150,120,220,0.8)'}
                      strokeWidth="1.5" strokeDasharray="4 2" />
                  )}
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

                {/* ── V20: Placed Assets (below models & tokens) ── */}
                {placedAssets.map(a => {
                  const mapW = (activeMap?.grid_cols ?? 20) * cs
                  const mapH = (activeMap?.grid_rows ?? 20) * cs
                  const left = ox + (a.x_pct / 100) * mapW
                  const top = oy + (a.y_pct / 100) * mapH
                  const w = a.width_cells * cs
                  const h = a.height_cells * cs
                  return (
                    <div key={a.id} style={{
                      position: 'absolute',
                      left: left - w / 2,
                      top: top - h / 2,
                      width: w,
                      height: h,
                      transform: `rotate(${a.rotation}deg)`,
                      transformOrigin: 'center',
                      zIndex: Math.max(1, Math.min(4, a.z_index)),
                      cursor: isGM ? 'pointer' : 'default',
                    }}
                      onClick={e => { if (isGM) { e.stopPropagation(); setSelectedAssetId(a.id === selectedAssetId ? null : a.id) } }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.image_url} alt={a.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none',
                          outline: selectedAssetId === a.id ? '2px solid rgba(251,191,36,0.8)' : 'none' }}
                        draggable={false} />
                    </div>
                  )
                })}

                {/* ── V20/V21: Placed Models (above assets, below tokens) ── */}
                {placedModels.filter(m => isGM || !m.is_hidden).map(m => {
                  const spanPx = Math.max(1, Math.ceil(m.span)) * cs
                  const isDead = m.current_hp === 0
                  const hpPct = m.max_hp != null ? Math.max(0, Math.min(100, ((m.current_hp ?? m.max_hp) / m.max_hp) * 100)) : null
                  return (
                    <div key={m.id} style={{
                      position: 'absolute',
                      left: ox + m.col * cs,
                      top: oy + m.row * cs,
                      width: spanPx,
                      height: spanPx,
                      transform: `rotate(${m.rotation}deg)`,
                      transformOrigin: 'center',
                      zIndex: m.is_hidden ? 0 : 5,
                      cursor: isGM ? 'pointer' : 'default',
                      opacity: m.is_hidden ? 0.35 : 1,
                    }}
                      onClick={e => { if (isGM) { e.stopPropagation(); setSelectedModelId(m.id === selectedModelId ? null : m.id); setSelectedToken(null) } }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image_url} alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none',
                          outline: selectedModelId === m.id ? '2px solid rgba(239,68,68,0.8)' : 'none', outlineOffset: '-2px' }}
                        draggable={false} />
                      {/* Skull overlay if dead */}
                      {isDead && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.55)', borderRadius: 4 }}>
                          <span style={{ fontSize: Math.min(spanPx * 0.5, 32) }}>💀</span>
                        </div>
                      )}
                      {/* HP bar */}
                      {hpPct !== null && !isDead && (
                        <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, height: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 60 ? '#10b981' : hpPct > 30 ? '#f59e0b' : '#ef4444', transition: 'width 0.2s' }} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Tokens (map only, not staged) */}
                {mapTokens.map(t => {
                  const span = getSizeSpan(t.token_size || 'medium')
                  const spanPx = span >= 1 ? Math.round(span) * cs : Math.round(cs * span)
                  const isDragged = dragRender?.tokenId === t.id && dragRender.hoverCell !== null
                  const canDrag = isGM || t.player_user_id === user?.id
                  const isActiveTurn = activeTurnToken?.id === t.id
                  return (
                    <div key={t.id}
                      style={{
                        position: 'absolute',
                        left: t.col * cs + ox + 2, top: t.row * cs + oy + 2,
                        width: spanPx - 4, height: spanPx - 4,
                        cursor: canDrag ? (isDragged ? 'grabbing' : 'grab') : 'pointer',
                        userSelect: 'none',
                        zIndex: selectedToken === t.id ? 10 : isActiveTurn ? 8 : 5,
                      }}
                      onMouseDown={e => handleTokenMouseDown(e, t)}
                      onClick={e => {
                        e.stopPropagation()
                        if (terrainMode || effectMode || moveMode || fogMode) return
                        if (dragStateRef.current?.dragging) return
                      }}
                    >
                      <TokenPiece token={t} selected={selectedToken === t.id} cellSize={cs}
                        isMoving={movingTokenId === t.id} isDragged={isDragged} isActiveTurn={isActiveTurn} />
                    </div>
                  )
                })}

                {/* Drag ghost */}
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
                    title="Ziehen: Gitter-Raster anpassen (Bild bleibt fixiert)">
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
                {fogMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-200 text-xs px-3 py-1.5 rounded-full pointer-events-none border border-slate-700/60">
                    <Cloud className="w-3.5 h-3.5 inline mr-1.5" />
                    {fogBrushMode === 'paint' ? 'Pinsel' : 'Radierer'} — Ziehe über Felder
                  </div>
                )}
                {terrainMode && !fogMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-orange-300 text-xs px-3 py-1.5 rounded-full pointer-events-none border border-orange-800/60">
                    Geländemodus — Klicke Felder zum Markieren (schwieriges Gelände)
                  </div>
                )}
                {effectMode && !terrainMode && !fogMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-purple-300 text-xs px-3 py-1.5 rounded-full pointer-events-none border border-purple-800/60">
                    {EFFECT_TYPES.find(e => e.id === effectMode)?.icon} Effektmodus — Klicke auf ein Feld
                  </div>
                )}
                {!moveMode && !terrainMode && !effectMode && !fogMode && !deployingTokenId && (
                  <div className="absolute bottom-10 right-3 text-zinc-700 text-[10px] pointer-events-none">
                    Ziehen oder Pfeiltasten zum Bewegen · Mausrad = Zoom · Mitteltaste = Pan
                  </div>
                )}
                {/* V19: Click-to-deploy banner */}
                {deployingTokenId && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-md border border-emerald-500/40 rounded-2xl px-6 py-4 text-center shadow-2xl">
                      <p className="text-emerald-300 font-bold text-base">📍 Klicke auf ein Feld</p>
                      <p className="text-zinc-400 text-xs mt-1">um die Figur zu platzieren</p>
                      <p className="text-zinc-600 text-[10px] mt-2">ESC zum Abbrechen</p>
                    </div>
                  </div>
                )}
                {/* V20: Deploy model banner */}
                {deployingModelData && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-md border border-red-500/40 rounded-2xl px-6 py-4 text-center shadow-2xl">
                      <p className="text-red-300 font-bold text-base">🐉 Klicke auf ein Grid-Feld</p>
                      <p className="text-zinc-400 text-xs mt-1">um {deployingModelData.name} zu platzieren</p>
                      <p className="text-zinc-600 text-[10px] mt-2">ESC zum Abbrechen</p>
                    </div>
                  </div>
                )}
                {/* V20: Deploy asset banner */}
                {deployingAssetData && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                    <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 rounded-2xl px-6 py-4 text-center shadow-2xl">
                      <p className="text-amber-300 font-bold text-base">✨ Klicke auf die Karte</p>
                      <p className="text-zinc-400 text-xs mt-1">um {deployingAssetData.name} zu platzieren</p>
                      <p className="text-zinc-600 text-[10px] mt-2">ESC zum Abbrechen</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── V19: Dice Wall – redesigned glassmorphism overlay ── */}
              {filteredDiceWall.length > 0 && (
                <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-auto">
                  <button
                    onClick={() => setShowDiceWall(!showDiceWall)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-semibold hover:bg-black/80 hover:border-white/20 transition-all shadow-lg">
                    <span className="text-base leading-none">🎲</span>
                    <span>Würfelwand</span>
                    <span className="ml-1 opacity-60">{showDiceWall ? '▾' : '▸'}</span>
                  </button>
                  {showDiceWall && (
                    <div className="bg-black/55 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden min-w-[200px] max-w-[240px]">
                      {filteredDiceWall.slice(0, 6).map((r, i) => {
                        // Krit/Patzer NUR bei echtem d20-Einzelwurf (nicht bei Schadenswürfeln)
                        const isSingleD20 = r.dice_config?.length === 1 && r.dice_config[0].type === 'd20' && r.dice_config[0].count === 1
                        const allRolls = r.results?.flat() ?? []
                        const hasNat20 = isSingleD20 && allRolls.includes(20)
                        const hasNat1  = isSingleD20 && allRolls.includes(1) && !hasNat20
                        const diceLabel = r.dice_config?.map(d => `${d.count}${d.type}`).join('+') ?? ''
                        return (
                          <div key={r.id}
                            className={`flex items-center gap-3 px-3 py-2 border-b border-white/5 last:border-0 ${
                              hasNat20 ? 'bg-amber-500/10' : hasNat1 ? 'bg-red-900/20' : i === 0 ? 'bg-white/5' : ''
                            }`}>
                            {/* Left: label + dice */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold text-zinc-200 truncate leading-tight">
                                {r.label ?? 'Wurf'}
                              </p>
                              <p className="text-[9px] text-zinc-500 font-mono leading-tight">{diceLabel}</p>
                            </div>
                            {/* Right: total + badge */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {hasNat20 && <span className="text-[9px] font-bold text-amber-400 bg-amber-900/40 rounded px-1">KRIT</span>}
                              {hasNat1  && <span className="text-[9px] font-bold text-red-400 bg-red-900/40 rounded px-1">PATZER</span>}
                              <span className={`text-lg font-black tabular-nums leading-none ${
                                hasNat20 ? 'text-amber-300' : hasNat1 ? 'text-red-400' : 'text-white'
                              }`}>{r.total}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── V17: Feet per cell display (bottom-right of viewport) ── */}
              {activeMap && (
                <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
                  <span className="bg-black/60 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-mono">
                    {activeMap.feet_per_cell ?? 5} ft / Feld
                  </span>
                </div>
              )}
            </div>

            {/* Right Panel — Token */}
            {sel && !selectedModelId && (
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
                  onSaveToExtras={() => saveTokenToExtras(sel)}
                />
              </div>
            )}

            {/* Right Panel — Model */}
            {selectedModelId && (() => {
              const selModel = placedModels.find(m => m.id === selectedModelId)
              if (!selModel) return null
              const hpPct = selModel.max_hp != null
                ? Math.max(0, Math.min(1, (selModel.current_hp ?? selModel.max_hp) / selModel.max_hp)) : null
              const hpColor = hpPct == null ? '' : hpPct > 0.6 ? '#4ade80' : hpPct > 0.3 ? '#facc15' : '#f87171'
              const activeConds = CONDITIONS.filter(c => (selModel.conditions ?? []).includes(c.id))
              const availConds = CONDITIONS.filter(c => !(selModel.conditions ?? []).includes(c.id))
              return (
                <div className="flex-shrink-0 w-72 overflow-y-auto p-3 border-l border-zinc-800/80 bg-zinc-950">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selModel.image_url} alt={selModel.name} className="w-10 h-10 object-contain rounded border border-zinc-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-100 truncate">{selModel.name}</p>
                        <p className="text-xs text-zinc-500">Modell · {selModel.span}×{selModel.span}</p>
                      </div>
                      <button onClick={() => { deleteModel(selModel.id) }}
                        className="p-1 text-zinc-600 hover:text-red-400" title="Entfernen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setSelectedModelId(null)} className="p-1 text-zinc-500 hover:text-zinc-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* HP */}
                    {selModel.max_hp != null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-red-700" />
                          <span className="text-xs text-zinc-400">Trefferpunkte</span>
                          <span className="ml-auto text-sm font-bold text-zinc-100 tabular-nums">
                            {selModel.current_hp ?? selModel.max_hp} / {selModel.max_hp}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, hpPct! * 100))}%`, backgroundColor: hpColor }} />
                        </div>
                        <div className="flex gap-1">
                          {[-10,-5,-1,1,5,10].map(d => (
                            <button key={d} onClick={() => applyModelHp(selModel.id, d)}
                              className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${
                                d < 0 ? 'bg-red-950/50 border-red-800/60 text-red-300 hover:bg-red-900/70'
                                      : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                              }`}>{d > 0 ? `+${d}` : d}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Kampfwerte */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {selModel.armor_class != null && (
                        <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
                          <Shield className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
                          <p className="text-sm font-bold text-zinc-100">{selModel.armor_class}</p>
                          <p className="text-[10px] text-zinc-600">Rüstung</p>
                        </div>
                      )}
                      {selModel.speed != null && (
                        <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
                          <Zap className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
                          <p className="text-sm font-bold text-zinc-100">{selModel.speed}</p>
                          <p className="text-[10px] text-zinc-600">ft/Runde</p>
                        </div>
                      )}
                      <div className="text-center bg-zinc-800/60 border border-zinc-700/50 rounded-lg py-2">
                        <p className="text-sm font-bold text-zinc-100">{selModel.span}</p>
                        <p className="text-[10px] text-zinc-600">Größe</p>
                      </div>
                    </div>

                    {/* Attribute */}
                    {selModel.model_stats && Object.keys(selModel.model_stats).length > 0 && (
                      <div className="grid grid-cols-6 gap-1">
                        {(['str','dex','con','int','wis','cha'] as const).map(ab => (
                          <div key={ab} className="text-center">
                            <p className="text-[9px] text-zinc-600 uppercase">{ab}</p>
                            <p className="text-[11px] font-bold text-zinc-200">{modSign(statMod(selModel.model_stats![ab] ?? 10))}</p>
                            <p className="text-[9px] text-zinc-600">{selModel.model_stats![ab] ?? 10}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Conditions */}
                    <div>
                      {activeConds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {activeConds.map(c => (
                            <button key={c.id}
                              onClick={() => updateModel(selModel.id, { conditions: (selModel.conditions ?? []).filter(x => x !== c.id) })}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${c.bg} ${c.border} ${c.color} hover:opacity-70`}
                              title="Klicken zum Entfernen">
                              {c.icon} {c.id}
                            </button>
                          ))}
                        </div>
                      )}
                      {availConds.length > 0 && (
                        <details className="text-[10px] text-zinc-600">
                          <summary className="cursor-pointer hover:text-zinc-400 flex items-center gap-1">
                            <span>+ Zustand hinzufügen</span>
                          </summary>
                          <div className="mt-1.5 grid grid-cols-2 gap-1 max-h-36 overflow-y-auto">
                            {availConds.map(c => (
                              <button key={c.id}
                                onClick={() => updateModel(selModel.id, { conditions: [...(selModel.conditions ?? []), c.id] })}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border ${c.bg} ${c.border} ${c.color} hover:opacity-80`}>
                                {c.icon} {c.id}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Aktionen (favorite_dice) */}
                    {(selModel.favorite_dice ?? []).length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-zinc-800">
                        <p className="text-[10px] uppercase font-semibold text-zinc-600">⚔️ Aktionen</p>
                        {(selModel.favorite_dice ?? []).map((fav: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-950/20 border border-sky-900/40">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">{fav.name}</p>
                              <p className="text-[10px] text-zinc-600">
                                Atk {fav.attack_bonus >= 0 ? `+${fav.attack_bonus}` : fav.attack_bonus}
                                {(fav.dice_config?.length ?? 0) > 0 && ` · ${fav.dice_config.map((d: any) => `${d.count}${d.type}`).join('+')}${fav.damage_bonus ? `+${fav.damage_bonus}` : ''}`}
                              </p>
                            </div>
                            <button onClick={() => performRoll([{type:'d20',count:1}], fav.attack_bonus, `${fav.name} Angriff`)}
                              className="px-1.5 py-1 rounded bg-amber-900/30 border border-amber-700/50 text-[10px] text-amber-200 hover:bg-amber-900/50">Atk</button>
                            {(fav.dice_config?.length ?? 0) > 0 && (
                              <button onClick={() => performRoll(fav.dice_config, fav.damage_bonus, `${fav.name} Schaden`)}
                                className="px-1.5 py-1 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">Dmg</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fähigkeiten */}
                    {(selModel.abilities ?? []).length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-zinc-800">
                        <p className="text-[10px] uppercase font-semibold text-zinc-600">✨ Fähigkeiten</p>
                        <div className="flex flex-wrap gap-1">
                          {(selModel.abilities ?? []).map((a: any) => {
                            const exhausted = a.charges_max > 0 && a.charges_used >= a.charges_max
                            return (
                              <button key={a.id}
                                onClick={() => !exhausted && useModelAbility(selModel.id, a.id)}
                                disabled={exhausted}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${exhausted ? 'border-zinc-700 text-zinc-600 cursor-not-allowed' : 'border-amber-700/60 text-amber-300 hover:bg-amber-950/40'}`}>
                                {a.name}
                                {a.charges_max > 0 && (
                                  <span className="flex gap-0.5 ml-0.5">
                                    {Array.from({ length: a.charges_max }).map((_: any, i: number) => (
                                      <span key={i} className={i < a.charges_used ? 'text-zinc-600' : 'text-amber-400'}>{i < a.charges_used ? '○' : '●'}</span>
                                    ))}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notizen */}
                    <div className="pt-1 border-t border-zinc-800">
                      <p className="text-[10px] uppercase font-semibold text-zinc-600 mb-1">Notizen</p>
                      <textarea
                        rows={2}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 resize-none"
                        placeholder="Notizen…"
                        value={selModel.notes ?? ''}
                        onChange={e => updateModel(selModel.id, { notes: e.target.value })}
                      />
                    </div>

                    {/* Verstecken + Rotation */}
                    <div className="flex gap-2 pt-1 border-t border-zinc-800">
                      <button onClick={() => updateModel(selModel.id, { is_hidden: !selModel.is_hidden })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200">
                        {selModel.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {selModel.is_hidden ? 'Sichtbar' : 'Versteckt'}
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-zinc-600 block mb-1">Rotation: {selModel.rotation}°</label>
                      <input type="range" min={0} max={360} step={1} value={selModel.rotation}
                        onChange={e => updateModel(selModel.id, { rotation: Number(e.target.value) })}
                        className="w-full accent-red-600" />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
