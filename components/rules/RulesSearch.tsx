'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DND_RULES } from '@/data/dnd-rules'
import type { RuleCategory } from '@/types'

const CATEGORIES: { value: RuleCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'Alle', emoji: '📚' },
  { value: 'conditions', label: 'Zustände', emoji: '⚡' },
  { value: 'combat', label: 'Kampf', emoji: '⚔️' },
  { value: 'actions', label: 'Aktionen', emoji: '🎯' },
  { value: 'spellcasting', label: 'Magie', emoji: '✨' },
  { value: 'resting', label: 'Rast', emoji: '🌙' },
  { value: 'equipment', label: 'Ausrüstung', emoji: '🛡️' },
]

const QUICK_CONDITIONS = [
  'Grappled', 'Restrained', 'Poisoned', 'Frightened',
  'Invisible', 'Prone', 'Stunned', 'Paralyzed',
]

export function RulesSearch() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<RuleCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return DND_RULES.filter((rule) => {
      const matchCategory = activeCategory === 'all' || rule.category === activeCategory
      if (!matchCategory) return false
      if (!q) return true
      return (
        rule.title.toLowerCase().includes(q) ||
        rule.content.toLowerCase().includes(q) ||
        rule.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [query, activeCategory])

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id))

  const quickSearch = (term: string) => {
    setQuery(term)
    setActiveCategory('all')
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Regeln suchen... (z.B. Grappled, Konzentration, Dash)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Quick conditions */}
      {!query && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Schnellzugriff Zustände:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => quickSearch(c)}
                className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              activeCategory === cat.value
                ? 'bg-amber-600/20 border-amber-600/40 text-amber-400'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            )}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-zinc-500 py-8">
            Keine Regeln gefunden für „{query}"
          </p>
        )}

        {filtered.map((rule) => (
          <div
            key={rule.id}
            className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggle(rule.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">{rule.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
                  {CATEGORIES.find((c) => c.value === rule.category)?.emoji}{' '}
                  {CATEGORIES.find((c) => c.value === rule.category)?.label}
                </span>
              </div>
              {openId === rule.id
                ? <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              }
            </button>

            {openId === rule.id && (
              <div className="px-4 pb-4 pt-1 border-t border-zinc-700/50">
                <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {rule.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
