'use client'

import { useState, useEffect, useRef } from 'react'
import { Dices, Plus, Minus, Trash2, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { DiceRoll, DiceConfig } from '@/types'

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

const RARITY_COLORS: Record<string, string> = {
  d4:   'text-green-400',
  d6:   'text-blue-400',
  d8:   'text-purple-400',
  d10:  'text-yellow-400',
  d12:  'text-orange-400',
  d20:  'text-amber-400',
  d100: 'text-red-400',
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function parseSides(type: string): number {
  return parseInt(type.slice(1))
}

export default function DicePage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [config, setConfig] = useState<DiceConfig[]>([])
  const [label, setLabel] = useState('')
  const [modifier, setModifier] = useState<number>(0)
  const [sumDice, setSumDice] = useState(true)
  const [rolls, setRolls] = useState<DiceRoll[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastResult, setLastResult] = useState<{ results: number[][]; total: number; modifier: number; sumDice: boolean } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRolls()
    const channel = supabase
      .channel('dice_rolls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls' }, () => loadRolls())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadRolls = async () => {
    const { data } = await supabase
      .from('dice_rolls')
      .select('*, user:profiles(id,username,role)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setRolls(data as DiceRoll[])
  }

  const adjustCount = (type: string, delta: number) => {
    setConfig((prev) => {
      const existing = prev.find((c) => c.type === type)
      if (!existing) {
        if (delta > 0) return [...prev, { type, count: 1 }]
        return prev
      }
      const newCount = existing.count + delta
      if (newCount <= 0) return prev.filter((c) => c.type !== type)
      return prev.map((c) => c.type === type ? { ...c, count: newCount } : c)
    })
  }

  const getCount = (type: string) => config.find((c) => c.type === type)?.count ?? 0

  const totalDice = config.reduce((s, c) => s + c.count, 0)

  const handleRoll = async () => {
    if (totalDice === 0 || !user) return
    setRolling(true)

    const results = config.map((c) =>
      Array.from({ length: c.count }, () => rollDie(parseSides(c.type)))
    )
    const diceSum = results.flat().reduce((s, n) => s + n, 0)
    const total = diceSum + modifier
    setLastResult({ results, total, modifier, sumDice })

    await supabase.from('dice_rolls').insert({
      user_id: user.id,
      dice_config: config,
      results,
      total,
      label: label.trim() || null,
    })

    setRolling(false)
    setTimeout(() => logRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }

  const formatConfig = (cfg: DiceConfig[]) =>
    cfg.map((c) => `${c.count}x ${c.type}`).join(' + ')

  const formatResults = (cfg: DiceConfig[], res: number[][]) =>
    cfg.map((c, i) => `${c.type}: [${res[i]?.join(', ')}]`).join('  ')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Dices className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold text-zinc-100">Würfelwürfe</h1>
      </div>

      {/* Würfel auswählen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <p className="text-sm font-medium text-zinc-300">Würfel auswählen</p>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {DICE_TYPES.map((type) => {
            const count = getCount(type)
            return (
              <div key={type} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustCount(type, 1)}
                  className={`w-14 h-14 rounded-xl border-2 font-bold text-sm transition-all ${
                    count > 0
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {type}
                </button>
                {count > 0 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustCount(type, -1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`text-xs font-bold min-w-[1.25rem] text-center ${RARITY_COLORS[type]}`}>{count}</span>
                    <button onClick={() => adjustCount(type, 1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {totalDice > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-zinc-400">Ausgewählt:</span>
            {config.map((c) => (
              <span key={c.type} className={`text-sm font-semibold ${RARITY_COLORS[c.type]}`}>
                {c.count}x {c.type}
              </span>
            ))}
            <button
              onClick={() => setConfig([])}
              className="ml-auto text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Alles löschen
            </button>
          </div>
        )}

        {/* Optionen: Modifier + Addieren-Toggle */}
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
        <div className="bg-zinc-900 border border-amber-600/40 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-amber-400/70 uppercase tracking-wide">Letzter Wurf</p>
          {lastResult.sumDice ? (
            <>
              <p className="text-xs text-zinc-500">{formatResults(config, lastResult.results)}</p>
              {lastResult.modifier !== 0 ? (
                /* Show as formula: diceSum + modifier = total */
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black text-zinc-300">{lastResult.total - lastResult.modifier}</span>
                  <span className={`text-2xl font-bold ${lastResult.modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {lastResult.modifier > 0 ? `+ ${lastResult.modifier}` : `− ${Math.abs(lastResult.modifier)}`}
                  </span>
                  <span className="text-xl text-zinc-500">=</span>
                  <span className="text-4xl font-black text-amber-400">{lastResult.total}</span>
                  <span className="text-sm text-zinc-500">({formatConfig(config)})</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-black text-amber-400">{lastResult.total}</span>
                  <span className="text-sm text-zinc-500">Gesamt ({formatConfig(config)})</span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mb-1">Einzelergebnisse:</p>
              <div className="flex flex-wrap gap-2">
                {config.map((c, ci) =>
                  (lastResult.results[ci] ?? []).map((val, vi) => (
                    <span
                      key={`${ci}-${vi}`}
                      className={`text-2xl font-black px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 ${RARITY_COLORS[c.type]}`}
                    >
                      {val}
                      <span className="text-xs text-zinc-500 ml-1 font-normal">{c.type}</span>
                    </span>
                  ))
                )}
                {lastResult.modifier !== 0 && (
                  <span className={`text-2xl font-black px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 ${lastResult.modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {lastResult.modifier > 0 ? `+${lastResult.modifier}` : lastResult.modifier}
                    <span className="text-xs text-zinc-500 ml-1 font-normal">Mod</span>
                  </span>
                )}
              </div>
            </>
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
              <div key={roll.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                  {(roll.user as any)?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">{(roll.user as any)?.username ?? '?'}</span>
                    {roll.label && <span className="text-xs text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded">{roll.label}</span>}
                    <span className="text-xs text-zinc-500">{formatConfig(roll.dice_config)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {roll.dice_config.map((c, i) => `${c.type}: [${(roll.results[i] ?? []).join(', ')}]`).join('  ')}
                  </p>
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
    </div>
  )
}
