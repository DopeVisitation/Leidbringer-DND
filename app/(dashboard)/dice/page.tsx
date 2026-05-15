'use client'

import { useState, useEffect, useRef } from 'react'
import { Dices, Plus, Minus, Trash2, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { DiceRoll, DiceConfig } from '@/types'

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

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
  color: string       // text-* tailwind utility
  bg: string          // bg-* tailwind utility (semi-transparent)
  border: string      // border-* tailwind utility
  hex: string         // raw hex (used for inline styles)
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

export default function DicePage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [config, setConfig] = useState<DiceConfig[]>([])
  const [label, setLabel] = useState('')
  const [modifier, setModifier] = useState<number>(0)
  const [sumDice, setSumDice] = useState(true)
  const [currentDamage, setCurrentDamage] = useState<string | null>(null)   // null = Neutral
  const [rolls, setRolls] = useState<DiceRoll[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastResult, setLastResult] = useState<{ config: DiceConfig[]; results: number[][]; total: number; modifier: number; sumDice: boolean } | null>(null)
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

  // Adjust count for (type, currentDamage). One config entry per (type, damageType) pair.
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

  const getCount = (type: string) => {
    // Total count for this die type across ALL damage types — used to highlight + show selected
    return config.filter((c) => c.type === type).reduce((s, c) => s + c.count, 0)
  }
  const getCountForCurrent = (type: string) => {
    const dmg = currentDamage ?? undefined
    return config.find((c) => c.type === type && (c.damageType ?? undefined) === dmg)?.count ?? 0
  }

  const totalDice = config.reduce((s, c) => s + c.count, 0)

  const handleRoll = async () => {
    if (totalDice === 0 || !user) return
    setRolling(true)

    const results = config.map((c) =>
      Array.from({ length: c.count }, () => rollDie(parseSides(c.type)))
    )
    const diceSum = results.flat().reduce((s, n) => s + n, 0)
    const total = diceSum + modifier
    setLastResult({ config: [...config], results, total, modifier, sumDice })

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

  const formatConfigLabel = (cfg: DiceConfig[]) =>
    cfg.map((c) => {
      const d = damageOf(c.damageType)
      return d ? `${c.count}x ${c.type} ${d.icon}` : `${c.count}x ${c.type}`
    }).join(' + ')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Dices className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold text-zinc-100">Würfelwürfe</h1>
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
          {DAMAGE_TYPES.map((d) => (
            <button
              key={d.id}
              onClick={() => setCurrentDamage(d.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                currentDamage === d.id
                  ? `${d.bg} ${d.border} ${d.color} shadow-md ring-1 ring-current/30`
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
              title={d.label}
            >
              <span className="text-base leading-none">{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Würfel auswählen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Würfel auswählen</p>
          {currentDamage && (() => {
            const d = damageOf(currentDamage)!
            return (
              <span className={`text-xs font-semibold flex items-center gap-1 ${d.color}`}>
                <span>{d.icon}</span> {d.label} aktiv
              </span>
            )
          })()}
        </div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {DICE_TYPES.map((type) => {
            const totalCount = getCount(type)
            const currentCount = getCountForCurrent(type)
            const d = damageOf(currentDamage)
            return (
              <div key={type} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustCount(type, 1)}
                  className={`relative w-14 h-14 rounded-xl border-2 font-bold text-sm transition-all ${
                    totalCount > 0
                      ? d
                        ? `${d.bg} ${d.border} ${d.color}`
                        : 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {type}
                  {/* Aktiver Schadensart-Indikator unten rechts */}
                  {d && currentCount > 0 && (
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] leading-none flex items-center justify-center shadow"
                      title={d.label}
                    >
                      {d.icon}
                    </span>
                  )}
                </button>
                {currentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustCount(type, -1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`text-xs font-bold min-w-[1.25rem] text-center ${d ? d.color : DICE_COLORS[type]}`}>
                      {currentCount}
                    </span>
                    <button onClick={() => adjustCount(type, 1)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {/* Wenn dieser Würfeltyp auch in anderen Schadensarten existiert, kleines Hint */}
                {totalCount > currentCount && (
                  <span className="text-[10px] text-zinc-600">+{totalCount - currentCount} andere</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Liste aller Konfigurationen */}
        {config.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
            <span className="text-sm text-zinc-400 w-full mb-1">Ausgewählt:</span>
            {config.map((c, i) => {
              const d = damageOf(c.damageType)
              return (
                <span
                  key={`${c.type}-${c.damageType ?? 'n'}-${i}`}
                  className={`group flex items-center gap-1.5 text-sm font-semibold pl-2 pr-1 py-0.5 rounded-md border ${
                    d ? `${d.bg} ${d.border} ${d.color}` : `bg-zinc-800 border-zinc-700 ${DICE_COLORS[c.type]}`
                  }`}
                >
                  {d && <span className="text-sm leading-none">{d.icon}</span>}
                  {c.count}x {c.type}
                  {d && <span className="text-[10px] opacity-70 -ml-0.5">{d.label}</span>}
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
        <div className="bg-zinc-900 border border-amber-600/40 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-amber-400/70 uppercase tracking-wide">Letzter Wurf</p>

          {/* Aufschlüsselung pro Eintrag (immer sichtbar, da bei Schadensarten essentiell) */}
          <div className="space-y-1.5">
            {lastResult.config.map((c, i) => {
              const d = damageOf(c.damageType)
              const values = lastResult.results[i] ?? []
              const sum = values.reduce((s, n) => s + n, 0)
              return (
                <div
                  key={`${c.type}-${c.damageType ?? 'n'}-${i}`}
                  className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border ${
                    d ? `${d.bg} ${d.border}` : 'bg-zinc-800/40 border-zinc-700'
                  }`}
                >
                  <span className="text-xl leading-none">{d ? d.icon : '🎲'}</span>
                  <span className={`text-sm font-bold ${d ? d.color : DICE_COLORS[c.type]}`}>
                    {c.count}x {c.type}
                    {d && <span className="text-zinc-400 font-normal ml-1.5">{d.label}</span>}
                  </span>
                  <div className="flex flex-wrap gap-1 ml-1">
                    {values.map((v, vi) => (
                      <span
                        key={vi}
                        className={`min-w-[2rem] text-center px-1.5 py-0.5 rounded text-sm font-bold bg-zinc-900/80 border ${
                          d ? d.border : 'border-zinc-700'
                        } ${d ? d.color : DICE_COLORS[c.type]}`}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  <span className={`ml-auto text-sm font-black ${d ? d.color : DICE_COLORS[c.type]}`}>
                    Σ {sum}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Gesamt */}
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
                      const d = damageOf(c.damageType)
                      const vals = (roll.results[i] ?? []).join(', ')
                      return (
                        <span
                          key={i}
                          className={`text-[11px] px-1.5 py-0.5 rounded border ${
                            d ? `${d.bg} ${d.border} ${d.color}` : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {d ? `${d.icon} ` : ''}{c.type}: [{vals}]
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
    </div>
  )
}
