'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface DiceConfig { type: string; count: number; damageType?: string }

interface DiceRollEntry {
  id: string
  user_id: string
  label: string | null
  total: number
  results: number[][]
  dice_config: DiceConfig[]
  visible_to_players: boolean
  created_at: string
}

const DICE_TYPES = ['d4','d6','d8','d10','d12','d20'] as const
const DMG_TYPES  = ['','Hieb','Stich','Wucht','Feuer','Kälte','Blitz','Säure','Gift','Nekrose','Strahlend','Kraft','Psychisch','Donner'] as const

function rollDie(sides: number) { return Math.floor(Math.random() * sides) + 1 }
function modSign(n: number)     { return n >= 0 ? `+${n}` : `${n}` }

interface Props {
  title?: string
  defaultOpen?: boolean
}

export function MiniDicePanel({ title = '🎲 Würfeln', defaultOpen = false }: Props) {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [open, setOpen]       = useState(defaultOpen)
  const [diceType, setDiceType]     = useState('d20')
  const [count, setCount]           = useState(1)
  const [modifier, setModifier]     = useState(0)
  const [damageType, setDamageType] = useState('')
  const [gmVisible, setGmVisible]   = useState(true)
  const [rolls, setRolls]           = useState<DiceRollEntry[]>([])
  const [lastTotal, setLastTotal]   = useState<number | null>(null)

  const loadRolls = useCallback(async () => {
    const q = supabase
      .from('dice_rolls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    const { data } = isGM ? await q : await q.eq('visible_to_players', true)
    if (data) setRolls(data as DiceRollEntry[])
  }, [supabase, isGM])

  useEffect(() => {
    if (!open) return
    loadRolls()
    const ch = supabase.channel('mini_dice_panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls' }, loadRolls)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [open, loadRolls, supabase])

  const roll = async () => {
    if (!user) return
    const sides  = parseInt(diceType.slice(1))
    const results = Array.from({ length: count }, () => rollDie(sides))
    const total   = results.reduce((s, n) => s + n, 0) + modifier
    const dmgStr  = damageType ? ` (${damageType})` : ''
    const modStr  = modifier !== 0 ? modSign(modifier) : ''
    const lbl     = `${count}${diceType}${modStr}${dmgStr}`
    setLastTotal(total)
    await supabase.from('dice_rolls').insert({
      user_id: user.id,
      dice_config: [{ type: diceType, count, damageType: damageType || undefined }],
      results: [results],
      total,
      label: lbl,
      visible_to_players: isGM ? gmVisible : true,
    })
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/40 transition-colors">
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <div className="flex items-center gap-2">
          {lastTotal !== null && !open && (
            <span className="text-base font-black text-amber-400 tabular-nums">{lastTotal}</span>
          )}
          <span className="text-zinc-500 text-xs">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-zinc-800">
          {/* Dice type buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {DICE_TYPES.map(d => (
              <button key={d} onClick={() => setDiceType(d)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${diceType === d ? 'bg-amber-700 border-amber-600 text-amber-100' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                {d}
              </button>
            ))}
          </div>

          {/* Count + Modifier + GM visibility */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500">×</span>
              <input type="number" min={1} max={20} value={count}
                onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/60" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500">Mod</span>
              <input type="number" value={modifier}
                onChange={e => setModifier(parseInt(e.target.value) || 0)}
                className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500/60" />
            </div>
            {isGM && (
              <button onClick={() => setGmVisible(v => !v)}
                className={`px-2 py-1 rounded text-[10px] border transition-colors ml-auto ${gmVisible ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                title="Für Spieler sichtbar?">
                {gmVisible ? '👁 Sichtbar' : '🙈 Versteckt'}
              </button>
            )}
          </div>

          {/* Damage type */}
          <select value={damageType} onChange={e => setDamageType(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/60">
            {DMG_TYPES.map(t => <option key={t} value={t}>{t === '' ? '— Schadensart (optional) —' : t}</option>)}
          </select>

          {/* Roll button */}
          <button onClick={roll}
            className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-sm font-bold text-white transition-colors">
            🎲 Würfeln
          </button>

          {/* Roll History */}
          {rolls.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-zinc-800">
              <p className="text-[10px] uppercase font-semibold text-zinc-600 mb-1">Verlauf</p>
              {rolls.map((r, i) => {
                const isSingleD20 = r.dice_config?.length === 1 && r.dice_config[0].type === 'd20' && r.dice_config[0].count === 1
                const allRolls    = r.results?.flat() ?? []
                const hasNat20    = isSingleD20 && allRolls.includes(20)
                const hasNat1     = isSingleD20 && allRolls.includes(1) && !hasNat20
                const diceLabel   = r.dice_config?.map(d => `${d.count}${d.type}`).join('+') ?? ''
                return (
                  <div key={r.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                      hasNat20 ? 'bg-amber-900/20 border-amber-700/40' :
                      hasNat1  ? 'bg-red-900/20 border-red-700/40' :
                      i === 0  ? 'bg-zinc-800/60 border-zinc-700/60' :
                                 'bg-zinc-900/40 border-zinc-800/40'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 truncate font-medium">{r.label ?? 'Wurf'}</p>
                      <p className="text-[9px] text-zinc-600 font-mono">{diceLabel} [{allRolls.join(', ')}]</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasNat20 && <span className="text-[9px] font-bold text-amber-400">KRIT</span>}
                      {hasNat1  && <span className="text-[9px] font-bold text-red-400">PATZER</span>}
                      <span className={`text-base font-black tabular-nums ${hasNat20 ? 'text-amber-300' : hasNat1 ? 'text-red-400' : 'text-zinc-100'}`}>{r.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
