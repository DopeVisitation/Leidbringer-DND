'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Minus, Trash2, X, BookmarkCheck, Bookmark, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface DiceConfig { type: string; count: number; damageType?: string }

interface DiceFavorite {
  id: string; name: string; attack_bonus: number; damage_bonus: number
  dice_config: DiceConfig[]; damage_dice?: string | null; damage_type?: string | null
}

interface DamageType {
  id: string; label: string; icon: string
  color: string; bg: string; border: string
}

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const

const DAMAGE_TYPES: DamageType[] = [
  { id: 'fire',        label: 'Feuer',      icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/15',  border: 'border-orange-500/60' },
  { id: 'cold',        label: 'Kälte',      icon: '❄️', color: 'text-cyan-300',   bg: 'bg-cyan-500/15',    border: 'border-cyan-400/60'   },
  { id: 'lightning',   label: 'Blitz',      icon: '⚡', color: 'text-yellow-300', bg: 'bg-yellow-500/15',  border: 'border-yellow-400/60' },
  { id: 'thunder',     label: 'Donner',     icon: '🔊', color: 'text-sky-300',    bg: 'bg-sky-500/15',     border: 'border-sky-400/60'    },
  { id: 'acid',        label: 'Säure',      icon: '🧪', color: 'text-lime-400',   bg: 'bg-lime-500/15',    border: 'border-lime-500/60'   },
  { id: 'poison',      label: 'Gift',       icon: '☠️', color: 'text-green-400',  bg: 'bg-green-500/15',   border: 'border-green-500/60'  },
  { id: 'necrotic',    label: 'Nekrotisch', icon: '💀', color: 'text-zinc-300',   bg: 'bg-zinc-500/15',    border: 'border-zinc-400/60'   },
  { id: 'radiant',     label: 'Strahlend',  icon: '☀️', color: 'text-amber-200',  bg: 'bg-amber-400/15',   border: 'border-amber-300/60'  },
  { id: 'psychic',     label: 'Psychisch',  icon: '🧠', color: 'text-pink-400',   bg: 'bg-pink-500/15',    border: 'border-pink-500/60'   },
  { id: 'force',       label: 'Energie',    icon: '✨', color: 'text-violet-300', bg: 'bg-violet-500/15',  border: 'border-violet-400/60' },
  { id: 'slashing',    label: 'Hieb',       icon: '⚔️', color: 'text-red-400',    bg: 'bg-red-500/15',     border: 'border-red-500/60'    },
  { id: 'piercing',    label: 'Stich',      icon: '🗡️', color: 'text-slate-300',  bg: 'bg-slate-500/15',   border: 'border-slate-400/60'  },
  { id: 'bludgeoning', label: 'Wucht',      icon: '🔨', color: 'text-stone-300',  bg: 'bg-stone-500/15',   border: 'border-stone-400/60'  },
]

const DAMAGE_BY_ID: Record<string, DamageType> = Object.fromEntries(DAMAGE_TYPES.map(d => [d.id, d]))

const DICE_COLORS: Record<string, string> = {
  d4: 'text-green-400', d6: 'text-blue-400', d8: 'text-purple-400',
  d10: 'text-yellow-400', d12: 'text-orange-400', d20: 'text-amber-400', d100: 'text-red-400',
}

function rollDie(sides: number) { return Math.floor(Math.random() * sides) + 1 }
function fmtBonus(n: number) { return n >= 0 ? `+${n}` : `${n}` }

function parseDamageDice(s: string): DiceConfig[] {
  const re = /(\d+)d(\d+)/gi; const out: DiceConfig[] = []; let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) out.push({ type: `d${m[2]}`, count: parseInt(m[1]) })
  return out
}

interface Props {
  title?: string
  defaultOpen?: boolean
  onRoll?: (cfg: DiceConfig[], mod: number, lbl: string) => Promise<void>
}

export function MiniDicePanel({ title = '🎲 Würfeln', defaultOpen = false, onRoll }: Props) {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [open, setOpen]                 = useState(defaultOpen)
  const [config, setConfig]             = useState<DiceConfig[]>([])
  const [currentDamage, setCurrentDamage] = useState<string | null>(null)
  const [modifier, setModifier]         = useState(0)
  const [label, setLabel]               = useState('')
  const [gmVisible, setGmVisible]       = useState(true)
  const [rolling, setRolling]           = useState(false)
  const [lastTotal, setLastTotal]       = useState<number | null>(null)
  const [lastResult, setLastResult]     = useState<{ config: DiceConfig[]; results: number[][]; total: number; modifier: number } | null>(null)

  // Favorites
  const [favorites, setFavorites]       = useState<DiceFavorite[]>([])
  const [showFavForm, setShowFavForm]   = useState(false)
  const [favName, setFavName]           = useState('')
  const [favAtkBonus, setFavAtkBonus]   = useState('0')
  const [favDmgBonus, setFavDmgBonus]   = useState('0')
  const [favDiceConfig, setFavDiceConfig] = useState<DiceConfig[]>([])
  const [favDamageType, setFavDamageType] = useState<string | null>(null)

  const loadFavorites = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('dice_favorites').select('*').eq('user_id', user.id).order('created_at')
    if (data) setFavorites(data as DiceFavorite[])
  }, [user, supabase])

  useEffect(() => {
    if (!open || !user) return
    loadFavorites()
  }, [open, user, loadFavorites])

  // ── Dice config helpers ───────────────────────────────────────────────────
  const adjustCount = (type: string, delta: number) => {
    setConfig(prev => {
      const dmg = currentDamage ?? undefined
      const idx = prev.findIndex(c => c.type === type && (c.damageType ?? undefined) === dmg)
      if (idx === -1) {
        if (delta > 0) return [...prev, dmg ? { type, count: 1, damageType: dmg } : { type, count: 1 }]
        return prev
      }
      const newCount = prev[idx].count + delta
      if (newCount <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((c, i) => i === idx ? { ...c, count: newCount } : c)
    })
  }

  const getCountForCurrent = (type: string) => {
    const dmg = currentDamage ?? undefined
    return config.find(c => c.type === type && (c.damageType ?? undefined) === dmg)?.count ?? 0
  }

  const getTotalCount = (type: string) => config.filter(c => c.type === type).reduce((s, c) => s + c.count, 0)

  // ── Roll ─────────────────────────────────────────────────────────────────
  const performRollInternal = useCallback(async (cfg: DiceConfig[], mod: number, lbl: string) => {
    if (!user || cfg.length === 0) return
    setRolling(true)
    const results = cfg.map(c => Array.from({ length: c.count }, () => rollDie(parseInt(c.type.slice(1)))))
    const total = results.flat().reduce((s, n) => s + n, 0) + mod
    setLastTotal(total)
    setLastResult({ config: cfg, results, total, modifier: mod })

    if (onRoll) {
      await onRoll(cfg, mod, lbl)
    } else {
      await supabase.from('dice_rolls').insert({
        user_id: user.id,
        dice_config: cfg,
        results,
        total,
        label: lbl || null,
        visible_to_players: isGM ? gmVisible : true,
      })
    }
    setRolling(false)
  }, [user, supabase, isGM, gmVisible, onRoll])

  const handleRoll = () => {
    if (config.length === 0) return
    performRollInternal(config, modifier, label.trim())
  }

  const quickD20 = (bonus: number, lbl: string) =>
    performRollInternal([{ type: 'd20', count: 1 }], bonus, lbl)

  const totalDice = config.reduce((s, c) => s + c.count, 0)
  const currentDamageType = currentDamage ? DAMAGE_BY_ID[currentDamage] : null

  // ── Favorites helpers ─────────────────────────────────────────────────────
  const favAdjustCount = (type: string, delta: number) => {
    setFavDiceConfig(prev => {
      const dmg = favDamageType ?? undefined
      const idx = prev.findIndex(c => c.type === type && (c.damageType ?? undefined) === dmg)
      if (idx === -1) {
        if (delta > 0) return [...prev, dmg ? { type, count: 1, damageType: dmg } : { type, count: 1 }]
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

  const saveFavorite = async () => {
    if (!user || !favName.trim() || favDiceConfig.length === 0) return
    await supabase.from('dice_favorites').insert({
      user_id: user.id, name: favName.trim(),
      attack_bonus: parseInt(favAtkBonus) || 0,
      damage_bonus: parseInt(favDmgBonus) || 0,
      dice_config: favDiceConfig, damage_dice: '', damage_type: null,
    })
    setFavName(''); setFavAtkBonus('0'); setFavDmgBonus('0')
    setFavDiceConfig([]); setFavDamageType(null); setShowFavForm(false)
    loadFavorites()
  }

  const deleteFavorite = async (id: string) => {
    await supabase.from('dice_favorites').delete().eq('id', id)
    loadFavorites()
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
      {/* ── Header ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <div className="flex items-center gap-2">
          {lastTotal !== null && !open && (
            <span className="text-base font-black text-amber-400 tabular-nums">{lastTotal}</span>
          )}
          <span className="text-zinc-500 text-xs">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-4 pt-2 space-y-3 border-t border-zinc-800">

          {/* ── Favoriten ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> Favoriten
                {favorites.length > 0 && <span className="text-zinc-700">({favorites.length})</span>}
              </span>
              <button
                onClick={() => setShowFavForm(v => !v)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                + Neu
              </button>
            </div>

            {showFavForm && (
              <div className="bg-zinc-800/60 rounded-lg p-2.5 space-y-2 border border-zinc-700">
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  placeholder="Name (z.B. Feuerschwert)"
                  value={favName} onChange={e => setFavName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase mb-0.5">Atk Bonus</p>
                    <input type="number" value={favAtkBonus} onChange={e => setFavAtkBonus(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase mb-0.5">Schad Bonus</p>
                    <input type="number" value={favDmgBonus} onChange={e => setFavDmgBonus(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase mb-1">Schadensart für Würfel</p>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setFavDamageType(null)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors ${!favDamageType ? 'bg-zinc-700 border-zinc-500 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                      ⚪
                    </button>
                    {DAMAGE_TYPES.map(dt => (
                      <button key={dt.id} onClick={() => setFavDamageType(dt.id)}
                        title={dt.label}
                        className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors ${favDamageType === dt.id ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                        {dt.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase mb-1">Würfel auswählen</p>
                  <div className="flex flex-wrap gap-1">
                    {DICE_TYPES.map(type => {
                      const cnt = favGetCount(type)
                      const dt = favDamageType ? DAMAGE_BY_ID[favDamageType] : null
                      return (
                        <div key={type} className="flex flex-col items-center gap-0.5">
                          <button onClick={() => favAdjustCount(type, 1)}
                            className={`px-1.5 py-1 rounded border text-[10px] font-bold transition-colors ${cnt > 0 ? (dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-amber-600/20 border-amber-500 text-amber-300') : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                            {type}
                          </button>
                          {cnt > 0 && (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => favAdjustCount(type, -1)} className="text-zinc-600 hover:text-zinc-400"><Minus className="w-2 h-2" /></button>
                              <span className={`text-[10px] font-bold ${dt ? dt.color : DICE_COLORS[type]}`}>{cnt}</span>
                              <button onClick={() => favAdjustCount(type, 1)} className="text-zinc-600 hover:text-zinc-400"><Plus className="w-2 h-2" /></button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {favDiceConfig.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {favDiceConfig.map((c, i) => {
                        const dt = c.damageType ? DAMAGE_BY_ID[c.damageType] : null
                        return (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${dt ? `${dt.bg} ${dt.border} ${dt.color}` : `bg-zinc-800 border-zinc-700 ${DICE_COLORS[c.type]}`}`}>
                            {dt && `${dt.icon} `}{c.count}×{c.type}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => { setShowFavForm(false); setFavDiceConfig([]) }}
                    className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-400 hover:text-zinc-200">Abbrechen</button>
                  <button onClick={saveFavorite} disabled={!favName.trim() || favDiceConfig.length === 0}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white">
                    <BookmarkCheck className="w-3 h-3" /> Speichern
                  </button>
                </div>
              </div>
            )}

            {favorites.length === 0 && !showFavForm && (
              <p className="text-[10px] text-zinc-700 text-center py-1">Keine Favoriten gespeichert</p>
            )}

            {favorites.length > 0 && (
              <div className="space-y-1">
                {favorites.map(fav => {
                  const cfg: DiceConfig[] = (fav.dice_config ?? []).length > 0
                    ? fav.dice_config
                    : fav.damage_dice ? parseDamageDice(fav.damage_dice).map(c => ({ ...c, damageType: fav.damage_type ?? undefined })) : []
                  const diceLabel = cfg.map(c => {
                    const dt = c.damageType ? DAMAGE_BY_ID[c.damageType] : null
                    return dt ? `${c.count}×${c.type}${dt.icon}` : `${c.count}×${c.type}`
                  }).join('+')
                  return (
                    <div key={fav.id} className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:border-zinc-600 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 truncate">{fav.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">Atk {fmtBonus(fav.attack_bonus)} · {diceLabel}{fav.damage_bonus !== 0 ? fmtBonus(fav.damage_bonus) : ''}</p>
                      </div>
                      <button
                        onClick={() => quickD20(fav.attack_bonus, `${fav.name} Angriff ${fmtBonus(fav.attack_bonus)}`)}
                        className="px-1.5 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/60 text-[10px] font-bold text-amber-200 transition-colors">
                        Atk
                      </button>
                      <button
                        onClick={() => performRollInternal(cfg, fav.damage_bonus, `${fav.name} Schaden`)}
                        className="px-1.5 py-0.5 rounded bg-red-700/30 hover:bg-red-700/60 border border-red-500/60 text-[10px] font-bold text-red-200 transition-colors">
                        Dmg
                      </button>
                      <button onClick={() => deleteFavorite(fav.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-red-400 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Schadensart ───────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-semibold text-zinc-500">Schadensart</span>
              {currentDamage && (
                <button onClick={() => setCurrentDamage(null)} className="text-[10px] text-zinc-600 hover:text-zinc-400">zurücksetzen</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCurrentDamage(null)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${!currentDamage ? 'bg-zinc-700 border-zinc-500 text-zinc-100 shadow-md' : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                ⚪ Neutral
              </button>
              {DAMAGE_TYPES.map(dt => (
                <button key={dt.id} onClick={() => setCurrentDamage(dt.id)}
                  title={dt.label}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${currentDamage === dt.id ? `${dt.bg} ${dt.border} ${dt.color} shadow-md ring-1 ring-current/20` : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                  <span>{dt.icon}</span> {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Würfel auswählen ──────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-semibold text-zinc-500">
                Würfel auswählen
                {currentDamageType && (
                  <span className={`ml-1.5 font-semibold ${currentDamageType.color}`}>
                    · {currentDamageType.icon} {currentDamageType.label}
                  </span>
                )}
              </span>
              {config.length > 0 && (
                <button onClick={() => setConfig([])} className="text-[10px] text-zinc-600 hover:text-red-400 flex items-center gap-0.5 transition-colors">
                  <Trash2 className="w-2.5 h-2.5" /> Alles löschen
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DICE_TYPES.map(type => {
                const total = getTotalCount(type)
                const current = getCountForCurrent(type)
                const dt = currentDamageType
                return (
                  <div key={type} className="flex flex-col items-center gap-0.5">
                    <button onClick={() => adjustCount(type, 1)}
                      className={`w-full py-1.5 rounded-lg border font-bold text-[11px] transition-all ${total > 0 ? (dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-amber-600/20 border-amber-500 text-amber-300') : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                      {type}
                    </button>
                    {current > 0 && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => adjustCount(type, -1)} className="text-zinc-600 hover:text-zinc-300"><Minus className="w-2.5 h-2.5" /></button>
                        <span className={`text-[11px] font-bold w-4 text-center tabular-nums ${dt ? dt.color : DICE_COLORS[type]}`}>{current}</span>
                        <button onClick={() => adjustCount(type, 1)} className="text-zinc-600 hover:text-zinc-300"><Plus className="w-2.5 h-2.5" /></button>
                      </div>
                    )}
                    {total > current && <span className="text-[9px] text-zinc-700">+{total - current}</span>}
                  </div>
                )
              })}
            </div>

            {/* Selected dice chips */}
            {config.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/60">
                <span className="text-[10px] text-zinc-600 w-full">Ausgewählt:</span>
                {config.map((c, i) => {
                  const dt = c.damageType ? DAMAGE_BY_ID[c.damageType] : null
                  return (
                    <span key={i}
                      className={`group flex items-center gap-1 text-[11px] font-semibold pl-1.5 pr-1 py-0.5 rounded border ${dt ? `${dt.bg} ${dt.border} ${dt.color}` : `bg-zinc-800 border-zinc-700 ${DICE_COLORS[c.type]}`}`}>
                      {dt && <span>{dt.icon}</span>}
                      {c.count}×{c.type}
                      <button onClick={() => setConfig(prev => prev.filter((_, j) => j !== i))}
                        className="opacity-60 group-hover:opacity-100 hover:text-red-400 transition-all">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Modifier + GM visibility + Label + Roll ───────────────── */}
          <div className="space-y-2">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Modifier</span>
                <input type="number" value={modifier} onChange={e => setModifier(parseInt(e.target.value) || 0)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/60" />
              </div>
              {isGM && !onRoll && (
                <button onClick={() => setGmVisible(v => !v)}
                  className={`px-2 py-1 rounded border text-[10px] transition-colors ml-auto ${gmVisible ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                  title="Für Spieler sichtbar?">
                  {gmVisible ? '👁 Sichtbar' : '🙈 Versteckt'}
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <input type="text" placeholder="Label (z.B. Angriff, Initiative...)"
                value={label} onChange={e => setLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRoll()}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              <button onClick={handleRoll} disabled={totalDice === 0 || rolling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-xs font-bold text-white transition-colors">
                <RotateCw className={`w-3 h-3 ${rolling ? 'animate-spin' : ''}`} /> Würfeln!
              </button>
            </div>
          </div>

          {/* ── Last Result ───────────────────────────────────────────── */}
          {lastResult && (
            <div className="bg-zinc-900/80 border border-amber-600/30 rounded-lg p-2.5 space-y-1.5">
              <p className="text-[9px] uppercase text-amber-400/60 font-semibold tracking-wide">Letzter Wurf</p>
              <div className="flex flex-wrap gap-1">
                {lastResult.config.map((c, i) => {
                  const dt = c.damageType ? DAMAGE_BY_ID[c.damageType] : null
                  const vals = lastResult.results[i] ?? []
                  return (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${dt ? `${dt.bg} ${dt.border} ${dt.color}` : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {dt && `${dt.icon} `}{c.type}:[{vals.join(',')}]
                    </span>
                  )
                })}
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {lastResult.modifier !== 0 && (
                  <>
                    <span className="text-xl font-black text-zinc-300">{lastResult.total - lastResult.modifier}</span>
                    <span className={`text-lg font-bold ${lastResult.modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {lastResult.modifier > 0 ? `+${lastResult.modifier}` : lastResult.modifier}
                    </span>
                    <span className="text-zinc-500 text-sm">=</span>
                  </>
                )}
                <span className={`font-black tabular-nums ${lastResult.modifier !== 0 ? 'text-3xl text-amber-400' : 'text-4xl text-amber-300'}`}>
                  {lastResult.total}
                </span>
                {(() => {
                  const isSingleD20 = lastResult.config.length === 1 && lastResult.config[0].type === 'd20' && lastResult.config[0].count === 1
                  const flat = lastResult.results.flat()
                  if (isSingleD20 && flat.includes(20)) return <span className="text-xs font-black text-amber-400">⭐ KRIT!</span>
                  if (isSingleD20 && flat.includes(1))  return <span className="text-xs font-black text-red-400">💀 PATZER!</span>
                  return null
                })()}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
