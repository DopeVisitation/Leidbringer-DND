'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dices, Plus, Minus, Trash2, RotateCw, Sword, Shield, Sparkles, Star, Zap, ChevronDown, ChevronRight, Bookmark, BookmarkCheck, X, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { DiceRoll, DiceConfig, CharacterLink, CharacterFullData } from '@/types'

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

interface DiceFavorite {
  id: string
  name: string
  attack_bonus: number
  dice_config: DiceConfig[]
  damage_bonus: number
  damage_type?: string | null
  damage_dice?: string | null
}

const DICE_COLORS: Record<string, string> = {
  d4:   'text-green-400',
  d6:   'text-blue-400',
  d8:   'text-purple-400',
  d10:  'text-yellow-400',
  d12:  'text-orange-400',
  d20:  'text-amber-400',
  d100: 'text-red-400',
}

// ── DnD 5e Schadensarten ─────────────────────────────────────────────────────
interface DamageType {
  id: string
  label: string
  icon: string
  color: string
  bg: string
  border: string
  hex: string
}

const DAMAGE_TYPES: DamageType[] = [
  { id: 'fire',        label: 'Feuer',        icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/15',  border: 'border-orange-500/60',  hex: '#fb923c' },
  { id: 'cold',        label: 'Kälte',        icon: '❄️', color: 'text-cyan-300',   bg: 'bg-cyan-500/15',    border: 'border-cyan-400/60',    hex: '#67e8f9' },
  { id: 'lightning',   label: 'Blitz',        icon: '⚡', color: 'text-yellow-300', bg: 'bg-yellow-500/15',  border: 'border-yellow-400/60',  hex: '#fde047' },
  { id: 'thunder',     label: 'Donner',       icon: '🔊', color: 'text-sky-300',    bg: 'bg-sky-500/15',     border: 'border-sky-400/60',     hex: '#7dd3fc' },
  { id: 'acid',        label: 'Säure',        icon: '🧪', color: 'text-lime-400',   bg: 'bg-lime-500/15',    border: 'border-lime-500/60',    hex: '#a3e635' },
  { id: 'poison',      label: 'Gift',         icon: '☠️', color: 'text-green-400',  bg: 'bg-green-500/15',   border: 'border-green-500/60',   hex: '#4ade80' },
  { id: 'necrotic',    label: 'Nekrotisch',   icon: '💀', color: 'text-zinc-300',   bg: 'bg-zinc-500/15',    border: 'border-zinc-400/60',    hex: '#a1a1aa' },
  { id: 'radiant',     label: 'Strahlend',    icon: '☀️', color: 'text-amber-200',  bg: 'bg-amber-400/15',   border: 'border-amber-300/60',   hex: '#fde68a' },
  { id: 'psychic',     label: 'Psychisch',    icon: '🧠', color: 'text-pink-400',   bg: 'bg-pink-500/15',    border: 'border-pink-500/60',    hex: '#f472b6' },
  { id: 'force',       label: 'Energie',      icon: '✨', color: 'text-violet-300', bg: 'bg-violet-500/15',  border: 'border-violet-400/60',  hex: '#c4b5fd' },
  { id: 'slashing',    label: 'Hieb',         icon: '⚔️', color: 'text-red-400',    bg: 'bg-red-500/15',     border: 'border-red-500/60',     hex: '#f87171' },
  { id: 'piercing',    label: 'Stich',        icon: '🗡️', color: 'text-slate-300',  bg: 'bg-slate-500/15',   border: 'border-slate-400/60',   hex: '#cbd5e1' },
  { id: 'bludgeoning', label: 'Wucht',        icon: '🔨', color: 'text-stone-300',  bg: 'bg-stone-500/15',   border: 'border-stone-400/60',   hex: '#d6d3d1' },
]

const DAMAGE_BY_ID: Record<string, DamageType> = DAMAGE_TYPES.reduce((acc, d) => {
  acc[d.id] = d
  return acc
}, {} as Record<string, DamageType>)

function damageOf(id?: string | null): DamageType | null {
  if (!id) return null
  return DAMAGE_BY_ID[id] ?? null
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function parseSides(type: string): number {
  return parseInt(type.slice(1))
}

function fmtBonus(n: number): string { return n >= 0 ? `+${n}` : `${n}` }
function statMod(val: number): number { return Math.floor((val - 10) / 2) }

const STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_LABELS: Record<string, string> = {
  STR: 'Stärke', DEX: 'Geschicklichkeit', CON: 'Konstitution',
  INT: 'Intelligenz', WIS: 'Weisheit', CHA: 'Charisma',
}

// Map ability-id like "1d6" / "2d8" → DiceConfig[]
function parseDamageDice(diceString: string): DiceConfig[] {
  const re = /(\d+)d(\d+)/gi
  const out: DiceConfig[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(diceString)) !== null) {
    const count = parseInt(m[1])
    const sides = parseInt(m[2])
    out.push({ type: `d${sides}`, count })
  }
  return out
}

// Map a DnD damage type string to a DamageType ID
function damageIdFromText(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  const t = s.toLowerCase()
  const map: Record<string, string> = {
    fire: 'fire', cold: 'cold', lightning: 'lightning', thunder: 'thunder',
    acid: 'acid', poison: 'poison', necrotic: 'necrotic', radiant: 'radiant',
    psychic: 'psychic', force: 'force', slashing: 'slashing',
    piercing: 'piercing', bludgeoning: 'bludgeoning',
  }
  return map[t]
}

// ── Roll Result Toast (full-screen overlay) ────────────────────────────────────
interface RollToastData {
  config: DiceConfig[]
  results: number[][]
  total: number
  modifier: number
}

function RollResultToast({ data, onDismiss }: { data: RollToastData; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500)
    return () => clearTimeout(t)
  }, [data, onDismiss])

  // Detect crit/fumble: any d20 result
  const d20Results = data.config.flatMap((c, i) =>
    c.type === 'd20' ? (data.results[i] ?? []) : []
  )
  const isCrit   = d20Results.includes(20)
  const isFumble = d20Results.length > 0 && d20Results.every(v => v === 1)

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[300] flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={`flex flex-col items-center gap-4 px-10 py-8 rounded-2xl shadow-2xl border max-w-sm w-full mx-4 ${
          isCrit   ? 'bg-amber-950/95 border-amber-500/60' :
          isFumble ? 'bg-red-950/95 border-red-500/60' :
                     'bg-zinc-900/95 border-zinc-700/60'
        }`}
      >
        {/* Crit / fumble badge */}
        {isCrit && (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 py-1">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-black text-amber-300 tracking-widest uppercase">Kritischer Treffer!</span>
          </div>
        )}
        {isFumble && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-1">
            <span className="text-lg">💀</span>
            <span className="text-sm font-black text-red-300 tracking-widest uppercase">Patzer!</span>
          </div>
        )}

        {/* Total */}
        <div className={`text-8xl font-black tabular-nums leading-none ${
          isCrit ? 'text-amber-300' : isFumble ? 'text-red-400' : 'text-white'
        }`}>
          {data.total}
        </div>

        {/* Breakdown */}
        <div className="flex flex-wrap justify-center gap-2">
          {data.config.map((c, i) => {
            const dt = damageOf(c.damageType)
            const vals = data.results[i] ?? []
            return (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800/60 border-zinc-700 text-zinc-300'
              }`}>
                {dt && <span>{dt.icon}</span>}
                <span className="font-semibold">{c.count}×{c.type}</span>
                <span className="text-zinc-500">→</span>
                <span className="font-bold">[{vals.join(', ')}]</span>
              </div>
            )
          })}
          {data.modifier !== 0 && (
            <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
              data.modifier > 0 ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300' : 'bg-red-900/30 border-red-700/40 text-red-300'
            }`}>
              {data.modifier > 0 ? `+${data.modifier}` : data.modifier}
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-600">Tippe zum Schließen</p>
      </div>
    </div>
  )
}

// ── History Tab ────────────────────────────────────────────────────────────────
interface HistoryRoll extends Omit<DiceRoll, 'user'> {
  user: {
    id: string
    username: string
    avatar_emoji?: string | null
    role: string
  } | null
}

function HistoryTab({ currentUserRole }: { currentUserRole: string }) {
  const supabase = createClient()
  const [historyRolls, setHistoryRolls] = useState<HistoryRoll[]>([])
  const [filterPlayer, setFilterPlayer] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    const query = supabase
      .from('dice_rolls')
      .select('*, user:profiles(id, username, avatar_emoji, role)')
      .order('created_at', { ascending: false })
      .limit(50)
    const finalQuery = currentUserRole === 'gm' ? query : query.eq('visible_to_players', true)
    const { data } = await finalQuery
    if (data) setHistoryRolls(data as HistoryRoll[])
  }, [supabase, currentUserRole])

  useEffect(() => {
    loadHistory()
    const channel = supabase
      .channel('dice_history_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls' }, () => loadHistory())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadHistory, supabase])

  // Unique players for filter bar
  const players = Array.from(
    new Map(
      historyRolls
        .filter(r => r.user)
        .map(r => [r.user!.id, r.user!])
    ).values()
  )

  const filtered = filterPlayer
    ? historyRolls.filter(r => r.user?.id === filterPlayer)
    : historyRolls

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterPlayer(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            filterPlayer === null
              ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Alle
        </button>
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => setFilterPlayer(filterPlayer === p.id ? null : p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterPlayer === p.id
                ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.avatar_emoji && <span>{p.avatar_emoji}</span>}
            {p.username}
          </button>
        ))}
      </div>

      {/* Roll rows */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800/50 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-8">Keine Würfe</p>
          ) : (
            filtered.map((roll) => {
              // Detect crit/fumble
              const d20Results = roll.dice_config.flatMap((c, i) =>
                c.type === 'd20' ? ((roll.results as number[][])[i] ?? []) : []
              )
              const isCrit   = d20Results.includes(20)
              const isFumble = d20Results.length > 0 && d20Results.every(v => v === 1)

              return (
                <div
                  key={roll.id}
                  className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                    isCrit   ? 'bg-amber-950/20 hover:bg-amber-950/30' :
                    isFumble ? 'bg-red-950/20 hover:bg-red-950/30' :
                               'hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {roll.user?.avatar_emoji ?? roll.user?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-200">{roll.user?.username ?? '?'}</span>
                      {roll.label && (
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                          isCrit   ? 'text-amber-300 bg-amber-600/15 border-amber-600/40' :
                          isFumble ? 'text-red-300 bg-red-600/15 border-red-600/40' :
                                     'text-amber-400 bg-amber-600/10 border-amber-600/20'
                        }`}>{roll.label}</span>
                      )}
                      {isCrit   && <span className="text-[11px] font-black text-amber-400 tracking-wider">⭐ KRIT!</span>}
                      {isFumble && <span className="text-[11px] font-black text-red-400 tracking-wider">💀 PATZER!</span>}
                    </div>
                    {/* Dice breakdown */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {roll.dice_config.map((c, i) => {
                        const dt = damageOf(c.damageType)
                        const vals = ((roll.results as number[][])[i] ?? []).join(', ')
                        return (
                          <span
                            key={i}
                            className={`text-[11px] px-1.5 py-0.5 rounded border ${
                              dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {dt ? `${dt.icon} ` : ''}{c.type}: [{vals}]
                          </span>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {new Date(roll.created_at).toLocaleString('de', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Total */}
                  <div className={`text-right flex-shrink-0 font-black tabular-nums text-xl ${
                    isCrit   ? 'text-amber-400' :
                    isFumble ? 'text-red-400' :
                               'text-amber-400'
                  }`}>
                    {roll.total}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function DicePage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState<'wuerfeln' | 'verlauf'>('wuerfeln')
  const [config, setConfig] = useState<DiceConfig[]>([])
  const [label, setLabel] = useState('')
  const [modifier, setModifier] = useState<number>(0)
  const [sumDice, setSumDice] = useState(true)
  const [currentDamage, setCurrentDamage] = useState<string | null>(null)
  const [rolls, setRolls] = useState<DiceRoll[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastResult, setLastResult] = useState<{ config: DiceConfig[]; results: number[][]; total: number; modifier: number; sumDice: boolean } | null>(null)
  const [rollToast, setRollToast] = useState<{ config: DiceConfig[]; results: number[][]; total: number; modifier: number } | null>(null)
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [openSections, setOpenSections] = useState({ checks: true, saves: true, skills: false, attacks: true })
  const [favorites, setFavorites] = useState<DiceFavorite[]>([])
  const [showFavForm, setShowFavForm] = useState(false)
  const [favName, setFavName] = useState('')
  const [favAtkBonus, setFavAtkBonus] = useState('0')
  const [favDmgBonus, setFavDmgBonus] = useState('0')
  const [favDiceConfig, setFavDiceConfig] = useState<DiceConfig[]>([])
  const [favDamageType, setFavDamageType] = useState<string | null>(null)
  const [gmRollsVisible, setGmRollsVisible] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('gm-rolls-visible')
    if (stored !== null) setGmRollsVisible(stored === 'true')
  }, [])

  useEffect(() => {
    loadRolls()
    const channel = supabase
      .channel('dice_rolls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls' }, () => loadRolls())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('character_links')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setCharacter(data as CharacterLink) })
    loadFavorites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase])

  const loadFavorites = async () => {
    if (!user) return
    const { data } = await supabase
      .from('dice_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    if (data) setFavorites(data as DiceFavorite[])
  }

  const [favSaveError, setFavSaveError] = useState<string | null>(null)

  const saveFavorite = async () => {
    if (!user || !favName.trim() || favDiceConfig.length === 0) return
    setFavSaveError(null)
    const { error } = await supabase.from('dice_favorites').insert({
      user_id: user.id,
      name: favName.trim(),
      attack_bonus: parseInt(favAtkBonus) || 0,
      damage_bonus: parseInt(favDmgBonus) || 0,
      dice_config: favDiceConfig,
      damage_dice: '',
      damage_type: null,
    })
    if (error) {
      setFavSaveError('Fehler beim Speichern: ' + error.message)
      return
    }
    setFavName(''); setFavAtkBonus('0'); setFavDmgBonus('0')
    setFavDiceConfig([]); setFavDamageType(null)
    setShowFavForm(false)
    loadFavorites()
  }

  const favAdjustCount = (type: string, delta: number) => {
    setFavDiceConfig(prev => {
      const dmg = favDamageType ?? undefined
      const idx = prev.findIndex(c => c.type === type && (c.damageType ?? undefined) === dmg)
      if (idx === -1) {
        if (delta > 0) {
          const entry: DiceConfig = dmg ? { type, count: 1, damageType: dmg } : { type, count: 1 }
          return [...prev, entry]
        }
        return prev
      }
      const newCount = prev[idx].count + delta
      if (newCount <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((c, i) => i === idx ? { ...c, count: newCount } : c)
    })
  }

  const favGetCount = (type: string) =>
    favDiceConfig.filter(c => c.type === type && (c.damageType ?? undefined) === (favDamageType ?? undefined))
      .reduce((s, c) => s + c.count, 0)

  const deleteFavorite = async (id: string) => {
    await supabase.from('dice_favorites').delete().eq('id', id)
    loadFavorites()
  }

  const loadRolls = async () => {
    const query = supabase
      .from('dice_rolls')
      .select('*, user:profiles(id,username,role)')
      .order('created_at', { ascending: false })
      .limit(50)
    const finalQuery = user?.role === 'gm' ? query : query.eq('visible_to_players', true)
    const { data } = await finalQuery
    if (data) setRolls(data as DiceRoll[])
  }

  const adjustCount = (type: string, delta: number) => {
    setConfig((prev) => {
      const dmg = currentDamage ?? undefined
      const idx = prev.findIndex((c) => c.type === type && (c.damageType ?? undefined) === dmg)
      if (idx === -1) {
        if (delta > 0) {
          const entry: DiceConfig = dmg
            ? { type, count: 1, damageType: dmg }
            : { type, count: 1 }
          return [...prev, entry]
        }
        return prev
      }
      const newCount = prev[idx].count + delta
      if (newCount <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((c, i) => i === idx ? { ...c, count: newCount } : c)
    })
  }

  const removeEntry = (entry: DiceConfig) => {
    setConfig((prev) => prev.filter((c) => !(c.type === entry.type && (c.damageType ?? undefined) === (entry.damageType ?? undefined))))
  }

  const getCount = (type: string) =>
    config.filter((c) => c.type === type).reduce((s, c) => s + c.count, 0)
  const getCountForCurrent = (type: string) => {
    const dmg = currentDamage ?? undefined
    return config.find((c) => c.type === type && (c.damageType ?? undefined) === dmg)?.count ?? 0
  }

  const totalDice = config.reduce((s, c) => s + c.count, 0)

  // ── Wurf-Logik ────────────────────────────────────────────────────────────
  const performRoll = useCallback(async (cfg: DiceConfig[], mod: number, lbl: string) => {
    if (!user || cfg.length === 0) return
    setRolling(true)
    const results = cfg.map((c) =>
      Array.from({ length: c.count }, () => rollDie(parseSides(c.type)))
    )
    const diceSum = results.flat().reduce((s, n) => s + n, 0)
    const total = diceSum + mod
    const resultData = { config: [...cfg], results, total, modifier: mod, sumDice: true }
    setLastResult(resultData)
    setRollToast({ config: [...cfg], results, total, modifier: mod })

    await supabase.from('dice_rolls').insert({
      user_id: user.id,
      dice_config: cfg,
      results,
      total,
      label: lbl || null,
      visible_to_players: user.role === 'gm' ? gmRollsVisible : true,
    })
    setRolling(false)
    setTimeout(() => logRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }, [user, supabase, gmRollsVisible])

  const handleRoll = async () => {
    if (totalDice === 0) return
    await performRoll(config, modifier, label.trim())
  }

  const quickD20 = (bonus: number, label: string) =>
    performRoll([{ type: 'd20', count: 1 }], bonus, label)

  const quickDamage = (diceStr: string, bonus: number, damageType: string | undefined, label: string) => {
    const cfg = parseDamageDice(diceStr)
    if (cfg.length === 0) return
    const dmgId = damageIdFromText(damageType)
    if (dmgId) cfg.forEach((c) => { c.damageType = dmgId })
    return performRoll(cfg, bonus, label)
  }

  const formatConfigLabel = (cfg: DiceConfig[]) =>
    cfg.map((c) => {
      const d = damageOf(c.damageType)
      return d ? `${c.count}x ${c.type} ${d.icon}` : `${c.count}x ${c.type}`
    }).join(' + ')

  const d = character?.full_data ?? null
  const initiative = d?.initiative ?? 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Roll result toast */}
      {rollToast && (
        <RollResultToast data={rollToast} onDismiss={() => setRollToast(null)} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Dices className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold text-zinc-100">Würfelwürfe</h1>
        {user?.role === 'gm' && (
          <label className="ml-auto flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            <input
              type="checkbox"
              checked={gmRollsVisible}
              onChange={e => {
                const v = e.target.checked
                setGmRollsVisible(v)
                localStorage.setItem('gm-rolls-visible', String(v))
              }}
              className="w-3.5 h-3.5 accent-amber-500"
            />
            Würfe für Spieler sichtbar
          </label>
        )}
      </div>

      {/* ── Main Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setMainTab('wuerfeln')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            mainTab === 'wuerfeln'
              ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Dices className="w-4 h-4" /> Würfeln
        </button>
        <button
          onClick={() => setMainTab('verlauf')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            mainTab === 'verlauf'
              ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock className="w-4 h-4" /> Verlauf
        </button>
      </div>

      {/* ── Verlauf Tab ─────────────────────────────────────────────────────── */}
      {mainTab === 'verlauf' && (
        <HistoryTab currentUserRole={user?.role ?? 'player'} />
      )}

      {/* ── Würfeln Tab ─────────────────────────────────────────────────────── */}
      {mainTab === 'wuerfeln' && (
        <>
          {/* ── Schnellwürfe aus Charakter ──────────────────────────────────── */}
          {d && (
            <div className="bg-gradient-to-br from-[#1a0a02] to-[#0f0600] border border-[#8b2a0a]/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c84b11]" />
                <p className="text-sm font-bold text-[#f5deb3]">Schnellwürfe — {character?.character_name}</p>
                <span className="text-xs text-[#a0785a] ml-auto">{character?.class_name}</span>
              </div>

              {/* Initiative + Death Save */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => quickD20(initiative, `Initiative ${fmtBonus(initiative)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3a0d00]/60 border border-amber-500/40 text-xs font-bold text-amber-300 hover:bg-[#3a0d00] transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" /> Initiative {fmtBonus(initiative)}
                </button>
                <button
                  onClick={() => quickD20(0, 'Rettungswurf vs. Tod')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3a0d00]/60 border border-zinc-500/40 text-xs font-bold text-zinc-300 hover:bg-[#3a0d00] transition-colors"
                >
                  💀 Todeswurf
                </button>
                <button
                  onClick={() => quickD20(0, 'Glücks-d20')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3a0d00]/60 border border-zinc-500/40 text-xs font-bold text-zinc-300 hover:bg-[#3a0d00] transition-colors"
                >
                  🎲 d20 pur
                </button>
              </div>

              {/* Ability Checks */}
              <CollapsibleSection
                title="Eigenschaftsproben (1d20 + Mod)"
                open={openSections.checks}
                onToggle={() => setOpenSections((s) => ({ ...s, checks: !s.checks }))}
                icon={<Star className="w-3.5 h-3.5" />}
              >
                <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                  {STATS.map((s) => {
                    const mod = statMod(d.stats[s] ?? 10)
                    return (
                      <button
                        key={s}
                        onClick={() => quickD20(mod, `${STAT_LABELS[s]} ${fmtBonus(mod)}`)}
                        className="flex flex-col items-center py-1.5 rounded-lg bg-[#1a0a02] border border-[#8b2a0a]/40 hover:border-amber-500/60 transition-colors group"
                      >
                        <span className="text-[10px] text-[#a0785a] uppercase font-semibold">{s}</span>
                        <span className="text-sm font-bold text-[#f5deb3]">{fmtBonus(mod)}</span>
                      </button>
                    )
                  })}
                </div>
              </CollapsibleSection>

              {/* Saving Throws */}
              <CollapsibleSection
                title="Rettungswürfe"
                open={openSections.saves}
                onToggle={() => setOpenSections((s) => ({ ...s, saves: !s.saves }))}
                icon={<Shield className="w-3.5 h-3.5" />}
              >
                <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                  {d.saves.map((s) => (
                    <button
                      key={s.ability}
                      onClick={() => quickD20(s.bonus, `${STAT_LABELS[s.ability]}-Rettung ${fmtBonus(s.bonus)}`)}
                      className={`flex flex-col items-center py-1.5 rounded-lg border transition-colors ${
                        s.proficient
                          ? 'bg-[#3a0d00]/40 border-[#c84b11]/60 hover:border-amber-400'
                          : 'bg-[#1a0a02] border-[#8b2a0a]/40 hover:border-amber-500/60'
                      }`}
                    >
                      {s.proficient && <span className="text-[8px] text-amber-400">●</span>}
                      <span className="text-[10px] text-[#a0785a] uppercase font-semibold">{s.ability}</span>
                      <span className="text-sm font-bold text-[#f5deb3]">{fmtBonus(s.bonus)}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Skills */}
              <CollapsibleSection
                title={`Fertigkeiten (${d.skills.filter((s) => s.proficient || s.expertise).length} geübt)`}
                open={openSections.skills}
                onToggle={() => setOpenSections((s) => ({ ...s, skills: !s.skills }))}
                icon={<Star className="w-3.5 h-3.5" />}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {[...d.skills].sort((a, b) => Number(b.proficient || b.expertise) - Number(a.proficient || a.expertise) || b.bonus - a.bonus).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => quickD20(s.bonus, `${s.nameDe} ${fmtBonus(s.bonus)}`)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-colors text-left ${
                        s.expertise
                          ? 'bg-amber-900/30 border-amber-500/60 hover:border-amber-400'
                          : s.proficient
                            ? 'bg-[#3a0d00]/40 border-[#c84b11]/60 hover:border-amber-400'
                            : 'bg-[#1a0a02] border-[#8b2a0a]/40 hover:border-amber-500/60'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          s.expertise ? 'bg-amber-400 ring-1 ring-amber-300'
                            : s.proficient ? 'bg-[#c84b11]'
                              : s.halfProficient ? 'bg-[#c84b11]/40'
                                : 'bg-zinc-700'
                        }`}
                      />
                      <span className="text-[10px] text-[#a0785a] w-7">{s.ability}</span>
                      <span className="text-[#f5deb3] flex-1 truncate">{s.nameDe}</span>
                      <span className="font-bold text-[#f5deb3] tabular-nums">{fmtBonus(s.bonus)}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Weapons */}
              {d.weapons.length > 0 && (
                <CollapsibleSection
                  title="Angriffe & Schaden"
                  open={openSections.attacks}
                  onToggle={() => setOpenSections((s) => ({ ...s, attacks: !s.attacks }))}
                  icon={<Sword className="w-3.5 h-3.5" />}
                >
                  <div className="space-y-1.5">
                    {d.weapons.map((w, i) => (
                      <div
                        key={i}
                        className={`flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                          w.equipped ? 'bg-[#3a0d00]/40 border-[#c84b11]/60' : 'bg-[#1a0a02] border-[#8b2a0a]/40 opacity-70'
                        }`}
                      >
                        {w.equipped && <span className="text-amber-400">●</span>}
                        <span className="text-xs font-semibold text-[#f5deb3] flex-1 min-w-0 truncate">{w.name}</span>
                        <button
                          onClick={() => quickD20(w.attackBonus, `${w.name} Angriff ${fmtBonus(w.attackBonus)}`)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/60 text-[11px] font-bold text-amber-200 transition-colors"
                          title="1d20 + Angriffsbonus"
                        >
                          Atk {fmtBonus(w.attackBonus)}
                        </button>
                        {w.damage && (
                          <button
                            onClick={() => quickDamage(w.damage, w.damageBonus, w.damageType, `${w.name} Schaden ${w.damage}${w.damageBonus !== 0 ? fmtBonus(w.damageBonus) : ''}`)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-red-700/30 hover:bg-red-700/60 border border-red-500/60 text-[11px] font-bold text-red-200 transition-colors"
                            title={`Schaden: ${w.damage}${w.damageBonus !== 0 ? fmtBonus(w.damageBonus) : ''} ${w.damageType}`}
                          >
                            Dmg {w.damage}{w.damageBonus !== 0 ? fmtBonus(w.damageBonus) : ''}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* ── Favoriten ─────────────────────────────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-zinc-200">Favoriten</p>
                {favorites.length > 0 && <span className="text-xs text-zinc-600">({favorites.length})</span>}
              </div>
              <button
                onClick={() => setShowFavForm(!showFavForm)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-3 h-3" /> Neu
              </button>
            </div>

            {showFavForm && (
              <div className="bg-zinc-800/60 rounded-lg p-3 space-y-3 border border-zinc-700">
                {/* Name + bonuses */}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="col-span-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    placeholder="Name (z.B. Feuerschwert-Angriff)"
                    value={favName}
                    onChange={(e) => setFavName(e.target.value)}
                  />
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-semibold">Atk Bonus</label>
                    <input type="number" className="mt-0.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                      value={favAtkBonus} onChange={(e) => setFavAtkBonus(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-semibold">Schad Bonus</label>
                    <input type="number" className="mt-0.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                      value={favDmgBonus} onChange={(e) => setFavDmgBonus(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-semibold">Schadensart</label>
                    <select className="mt-0.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                      value={favDamageType ?? ''} onChange={(e) => setFavDamageType(e.target.value || null)}>
                      <option value="">Neutral</option>
                      {DAMAGE_TYPES.map((dt) => <option key={dt.id} value={dt.id}>{dt.icon} {dt.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Mini dice picker */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">Würfel auswählen</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DICE_TYPES.map((type) => {
                      const cnt = favGetCount(type)
                      const dt = damageOf(favDamageType)
                      return (
                        <div key={type} className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => favAdjustCount(type, 1)}
                            className={`w-10 h-10 rounded-lg border-2 font-bold text-xs transition-all ${
                              cnt > 0
                                ? dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-amber-600/20 border-amber-500 text-amber-300'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                          >{type}</button>
                          {cnt > 0 && (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => favAdjustCount(type, -1)} className="p-0.5 text-zinc-500 hover:text-zinc-300"><Minus className="w-2.5 h-2.5" /></button>
                              <span className={`text-xs font-bold w-4 text-center ${dt ? dt.color : DICE_COLORS[type]}`}>{cnt}</span>
                              <button onClick={() => favAdjustCount(type, 1)} className="p-0.5 text-zinc-500 hover:text-zinc-300"><Plus className="w-2.5 h-2.5" /></button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {favDiceConfig.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {favDiceConfig.map((c, i) => {
                        const dt = damageOf(c.damageType)
                        return (
                          <span key={i} className={`text-xs px-1.5 py-0.5 rounded border ${dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800 border-zinc-700 ' + DICE_COLORS[c.type]}`}>
                            {dt && `${dt.icon} `}{c.count}×{c.type}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {favSaveError && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-2 py-1.5">{favSaveError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowFavForm(false); setFavDiceConfig([]); setFavSaveError(null) }} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:text-zinc-200">Abbrechen</button>
                  <button onClick={saveFavorite} disabled={!favName.trim() || favDiceConfig.length === 0} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold">
                    <BookmarkCheck className="w-3.5 h-3.5" /> Speichern
                  </button>
                </div>
              </div>
            )}

            {favorites.length === 0 && !showFavForm && (
              <p className="text-xs text-zinc-600 text-center py-2">Noch keine Favoriten gespeichert</p>
            )}

            {favorites.length > 0 && (
              <div className="space-y-1.5">
                {favorites.map((fav) => {
                  const cfg: DiceConfig[] = fav.dice_config && fav.dice_config.length > 0
                    ? fav.dice_config
                    : fav.damage_dice ? parseDamageDice(fav.damage_dice).map(c => ({
                        ...c, damageType: fav.damage_type ?? undefined
                      })) : []
                  const firstDt = damageOf(cfg[0]?.damageType)
                  const diceLabel = cfg.map(c => {
                    const dt = damageOf(c.damageType)
                    return dt ? `${c.count}×${c.type} ${dt.icon}` : `${c.count}×${c.type}`
                  }).join(' + ')
                  return (
                    <div key={fav.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:border-zinc-600 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100">{fav.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          Atk {fmtBonus(fav.attack_bonus)} · {diceLabel}{fav.damage_bonus !== 0 ? fmtBonus(fav.damage_bonus) : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => quickD20(fav.attack_bonus, `${fav.name} Angriff ${fmtBonus(fav.attack_bonus)}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/60 text-[11px] font-bold text-amber-200 transition-colors"
                      >
                        Atk
                      </button>
                      <button
                        onClick={() => performRoll(cfg, fav.damage_bonus, `${fav.name} Schaden`)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-700/30 hover:bg-red-700/60 border border-red-500/60 text-[11px] font-bold text-red-200 transition-colors"
                      >
                        Dmg
                      </button>
                      <button
                        onClick={() => deleteFavorite(fav.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                        title="Löschen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Schadensart-Auswahl */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Schadensart</p>
              {currentDamage && (
                <button
                  onClick={() => setCurrentDamage(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  auf Neutral zurücksetzen
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Wähle eine Schadensart — neue Würfel werden ihr zugeordnet. Damit kannst du z.B. <span className="text-orange-300">🔥 Feuer-d8</span> und <span className="text-green-300">☠️ Gift-d8</span> in einem Wurf trennen.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCurrentDamage(null)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  currentDamage === null
                    ? 'bg-zinc-700 border-zinc-500 text-zinc-100 shadow-md'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                <span className="text-base leading-none">⚪</span> Neutral
              </button>
              {DAMAGE_TYPES.map((dt) => (
                <button
                  key={dt.id}
                  onClick={() => setCurrentDamage(dt.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    currentDamage === dt.id
                      ? `${dt.bg} ${dt.border} ${dt.color} shadow-md ring-1 ring-current/30`
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                  title={dt.label}
                >
                  <span className="text-base leading-none">{dt.icon}</span>
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Würfel auswählen */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Würfel auswählen</p>
              {currentDamage && (() => {
                const dt = damageOf(currentDamage)!
                return (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${dt.color}`}>
                    <span>{dt.icon}</span> {dt.label} aktiv
                  </span>
                )
              })()}
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {DICE_TYPES.map((type) => {
                const totalCount = getCount(type)
                const currentCount = getCountForCurrent(type)
                const dt = damageOf(currentDamage)
                return (
                  <div key={type} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustCount(type, 1)}
                      className={`relative w-14 h-14 rounded-xl border-2 font-bold text-sm transition-all ${
                        totalCount > 0
                          ? dt
                            ? `${dt.bg} ${dt.border} ${dt.color}`
                            : 'bg-amber-600/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {type}
                      {dt && currentCount > 0 && (
                        <span
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] leading-none flex items-center justify-center shadow"
                          title={dt.label}
                        >
                          {dt.icon}
                        </span>
                      )}
                    </button>
                    {currentCount > 0 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustCount(type, -1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`text-xs font-bold min-w-[1.25rem] text-center ${dt ? dt.color : DICE_COLORS[type]}`}>
                          {currentCount}
                        </span>
                        <button onClick={() => adjustCount(type, 1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {totalCount > currentCount && (
                      <span className="text-[10px] text-zinc-600">+{totalCount - currentCount} andere</span>
                    )}
                  </div>
                )
              })}
            </div>

            {config.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                <span className="text-sm text-zinc-400 w-full mb-1">Ausgewählt:</span>
                {config.map((c, i) => {
                  const dt = damageOf(c.damageType)
                  return (
                    <span
                      key={`${c.type}-${c.damageType ?? 'n'}-${i}`}
                      className={`group flex items-center gap-1.5 text-sm font-semibold pl-2 pr-1 py-0.5 rounded-md border ${
                        dt ? `${dt.bg} ${dt.border} ${dt.color}` : `bg-zinc-800 border-zinc-700 ${DICE_COLORS[c.type]}`
                      }`}
                    >
                      {dt && <span className="text-sm leading-none">{dt.icon}</span>}
                      {c.count}x {c.type}
                      {dt && <span className="text-[10px] opacity-70 -ml-0.5">{dt.label}</span>}
                      <button
                        onClick={() => removeEntry(c)}
                        className="ml-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                        title="Entfernen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
                <button
                  onClick={() => setConfig([])}
                  className="ml-auto text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Alles löschen
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 font-medium">Modifier</label>
                <input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 text-center font-bold focus:outline-none focus:border-amber-500"
                  placeholder="0"
                />
              </div>

              <button
                type="button"
                onClick={() => setSumDice(!sumDice)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  sumDice
                    ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center text-xs border ${sumDice ? 'bg-amber-500 border-amber-500 text-white' : 'border-zinc-600'}`}>
                  {sumDice ? '✓' : ''}
                </span>
                Würfel addieren
              </button>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Optionaler Label (z.B. Angriff, Initiative...)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleRoll}
                disabled={totalDice === 0 || rolling}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
              >
                <RotateCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} />
                Würfeln!
              </button>
            </div>
          </div>

          {/* Letztes Ergebnis */}
          {lastResult && (
            <div className="bg-zinc-900 border border-amber-600/40 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-amber-400/70 uppercase tracking-wide">Letzter Wurf</p>

              <div className="space-y-1.5">
                {lastResult.config.map((c, i) => {
                  const dt = damageOf(c.damageType)
                  const values = lastResult.results[i] ?? []
                  const sum = values.reduce((s, n) => s + n, 0)
                  return (
                    <div
                      key={`${c.type}-${c.damageType ?? 'n'}-${i}`}
                      className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border ${
                        dt ? `${dt.bg} ${dt.border}` : 'bg-zinc-800/40 border-zinc-700'
                      }`}
                    >
                      <span className="text-xl leading-none">{dt ? dt.icon : '🎲'}</span>
                      <span className={`text-sm font-bold ${dt ? dt.color : DICE_COLORS[c.type]}`}>
                        {c.count}x {c.type}
                        {dt && <span className="text-zinc-400 font-normal ml-1.5">{dt.label}</span>}
                      </span>
                      <div className="flex flex-wrap gap-1 ml-1">
                        {values.map((v, vi) => (
                          <span
                            key={vi}
                            className={`min-w-[2rem] text-center px-1.5 py-0.5 rounded text-sm font-bold bg-zinc-900/80 border ${
                              dt ? dt.border : 'border-zinc-700'
                            } ${dt ? dt.color : DICE_COLORS[c.type]}`}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                      <span className={`ml-auto text-sm font-black ${dt ? dt.color : DICE_COLORS[c.type]}`}>
                        Σ {sum}
                      </span>
                    </div>
                  )
                })}
              </div>

              {lastResult.sumDice && (
                lastResult.modifier !== 0 ? (
                  <div className="flex items-baseline gap-2 flex-wrap pt-1 border-t border-zinc-800">
                    <span className="text-3xl font-black text-zinc-300">{lastResult.total - lastResult.modifier}</span>
                    <span className={`text-2xl font-bold ${lastResult.modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {lastResult.modifier > 0 ? `+ ${lastResult.modifier}` : `− ${Math.abs(lastResult.modifier)}`}
                    </span>
                    <span className="text-xl text-zinc-500">=</span>
                    <span className="text-4xl font-black text-amber-400">{lastResult.total}</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2 flex-wrap pt-1 border-t border-zinc-800">
                    <span className="text-4xl font-black text-amber-400">{lastResult.total}</span>
                    <span className="text-sm text-zinc-500">Gesamt</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Log */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-200">Würfel-Log (alle Spieler)</h2>
            </div>
            <div ref={logRef} className="divide-y divide-zinc-800/50 max-h-96 overflow-y-auto">
              {rolls.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-8">Noch keine Würfe</p>
              ) : (
                rolls.map((roll) => (
                  <div key={roll.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0 mt-0.5">
                      {(roll.user as any)?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">{(roll.user as any)?.username ?? '?'}</span>
                        {roll.label && <span className="text-xs text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded">{roll.label}</span>}
                        <span className="text-xs text-zinc-500">{formatConfigLabel(roll.dice_config)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {roll.dice_config.map((c, i) => {
                          const dt = damageOf(c.damageType)
                          const vals = ((roll.results as number[][])[i] ?? []).join(', ')
                          return (
                            <span
                              key={i}
                              className={`text-[11px] px-1.5 py-0.5 rounded border ${
                                dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {dt ? `${dt.icon} ` : ''}{c.type}: [{vals}]
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-black text-amber-400">{roll.total}</span>
                      <p className="text-xs text-zinc-600">
                        {new Date(roll.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Collapsible section helper ─────────────────────────────────────────────
function CollapsibleSection({
  title, open, onToggle, icon, children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-[#8b2a0a]/30 pt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full text-left mb-2 group"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#c84b11]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#c84b11]" />}
        {icon}
        <span className="text-xs font-bold text-[#f5deb3] uppercase tracking-wide">{title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}
