'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Map, Plus, Trash2, X, ChevronDown, ChevronRight, Settings, Eye, EyeOff, Sword, Shield, Heart, Zap } from 'lucide-react'
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
}

const CONDITIONS = ['Vergiftet','Betäubt','Erschöpft','Verängstigt','Entzaubert','Fixiert','Gelähmt','Niedergeschlagen','Unsichtbar','Versteint']

// ─── Pre-seeded Monsters ──────────────────────────────────────────────────────
interface MonsterTemplate {
  name: string
  icon: string
  cr: string
  max_hp: number
  armor_class: number
  speed: number
  stats: Record<string, number>
  notes: string
}

const MONSTER_TEMPLATES: MonsterTemplate[] = [
  { name: 'Goblin',         icon: '👺', cr: '1/4',  max_hp: 7,   armor_class: 15, speed: 30, stats: {str:8,dex:14,con:10,int:10,wis:8,cha:8},   notes: 'Nimble Escape (Disengage/Hide als Bonusaktion)' },
  { name: 'Kobold',         icon: '🦎', cr: '1/8',  max_hp: 5,   armor_class: 12, speed: 30, stats: {str:7,dex:15,con:9,int:8,wis:7,cha:8},    notes: 'Pack Tactics, Sonnempfindlichkeit' },
  { name: 'Skelett',        icon: '💀', cr: '1/4',  max_hp: 13,  armor_class: 13, speed: 30, stats: {str:10,dex:14,con:15,int:6,wis:8,cha:5},  notes: 'Imm: Gift, krit. Treffer; Res: Piercing' },
  { name: 'Zombie',         icon: '🧟', cr: '1/4',  max_hp: 22,  armor_class: 8,  speed: 20, stats: {str:13,dex:6,con:16,int:3,wis:6,cha:5},   notes: 'Undead Fortitude' },
  { name: 'Orc',            icon: '👹', cr: '1/2',  max_hp: 15,  armor_class: 13, speed: 30, stats: {str:16,dex:12,con:16,int:7,wis:11,cha:10}, notes: 'Aggressive (Bonus-Aktion bewegen)' },
  { name: 'Hobgoblin',      icon: '⚔️', cr: '1/2',  max_hp: 11,  armor_class: 18, speed: 30, stats: {str:13,dex:12,con:12,int:10,wis:10,cha:9}, notes: 'Martial Advantage' },
  { name: 'Gnoll',          icon: '🐺', cr: '1/2',  max_hp: 22,  armor_class: 15, speed: 30, stats: {str:14,dex:12,con:11,int:6,wis:10,cha:7},  notes: 'Rampage' },
  { name: 'Bugbear',        icon: '🐻', cr: '1',    max_hp: 27,  armor_class: 16, speed: 30, stats: {str:15,dex:14,con:13,int:8,wis:11,cha:9},  notes: 'Brute, Überraschungsangriff' },
  { name: 'Ogre',           icon: '🦣', cr: '2',    max_hp: 59,  armor_class: 11, speed: 40, stats: {str:19,dex:8,con:16,int:5,wis:7,cha:7},   notes: 'Large; Keule 2d8+4' },
  { name: 'Ghoul',          icon: '😱', cr: '1',    max_hp: 22,  armor_class: 12, speed: 30, stats: {str:13,dex:15,con:10,int:7,wis:10,cha:6},  notes: 'Claw: DC10 CON oder Lähmung 1 Min.' },
  { name: 'Vampir Spawn',   icon: '🧛', cr: '5',    max_hp: 82,  armor_class: 15, speed: 30, stats: {str:16,dex:16,con:16,int:11,wis:10,cha:12}, notes: 'Regeneration 10, Umarmung, Biss, Sonnenempfindlichkeit' },
  { name: 'Troll',          icon: '🦴', cr: '5',    max_hp: 84,  armor_class: 15, speed: 30, stats: {str:18,dex:13,con:20,int:7,wis:9,cha:7},   notes: 'Regeneration 10 (Feuer/Säure verhindern)' },
  { name: 'Wyvern',         icon: '🐉', cr: '6',    max_hp: 110, armor_class: 13, speed: 20, stats: {str:19,dex:10,con:16,int:5,wis:12,cha:6},  notes: 'Fliegen 80, Giftstachel DC15 CON 7d6 Gift' },
  { name: 'Manticore',      icon: '🦁', cr: '3',    max_hp: 68,  armor_class: 14, speed: 30, stats: {str:17,dex:16,con:17,int:7,wis:12,cha:8},  notes: 'Fliegen 50, Schwanzstacheln (4×Fernkampf)' },
  { name: 'Minotaurus',     icon: '🐂', cr: '3',    max_hp: 114, armor_class: 14, speed: 40, stats: {str:18,dex:11,con:16,int:6,wis:16,cha:9},  notes: 'Charge, Gore, Labyrinth-Erinnerung' },
  { name: 'Hydra',          icon: '🐍', cr: '8',    max_hp: 172, armor_class: 15, speed: 30, stats: {str:20,dex:12,con:20,int:2,wis:10,cha:7},  notes: 'Fünf Köpfe, Reaktiviertes Köpfe nachwachsen' },
  { name: 'Lich',           icon: '💫', cr: '21',   max_hp: 135, armor_class: 17, speed: 30, stats: {str:11,dex:16,con:16,int:20,wis:14,cha:16}, notes: 'Lich-Lich-Legändär, Imm: Gift/Kälte/Nekro; Seelenglas' },
  { name: 'Bandit',         icon: '🗡️', cr: '1/8',  max_hp: 11,  armor_class: 12, speed: 30, stats: {str:11,dex:12,con:12,int:10,wis:10,cha:10}, notes: '' },
  { name: 'Bandit Captain', icon: '🎩', cr: '2',    max_hp: 65,  armor_class: 15, speed: 30, stats: {str:15,dex:16,con:14,int:14,wis:11,cha:14}, notes: 'Mehrfachangriff, Parieren (Reaktion)' },
  { name: 'Drow',           icon: '🌑', cr: '1/4',  max_hp: 13,  armor_class: 15, speed: 30, stats: {str:10,dex:14,con:10,int:11,wis:11,cha:12}, notes: 'Feyzauber, Dunkelheit-Immunität, Sonnenphobie' },
  { name: 'Schwarzdrache  (juv.)', icon: '🖤', cr: '7', max_hp: 127, armor_class: 18, speed: 40, stats: {str:19,dex:14,con:17,int:12,wis:11,cha:15}, notes: 'Fliegen 80, Säureatem DC14 DEX 11d8 Säure' },
  { name: 'Roter Drache  (juv.)',  icon: '🔴', cr: '10', max_hp: 178, armor_class: 18, speed: 40, stats: {str:23,dex:10,con:21,int:14,wis:11,cha:19}, notes: 'Fliegen 80, Feueratem DC17 DEX 16d6 Feuer' },
  { name: 'Beholder',       icon: '👁️', cr: '13',   max_hp: 180, armor_class: 18, speed: 0,  stats: {str:10,dex:14,con:18,int:17,wis:15,cha:17}, notes: 'Fliegen 20, Antimagie-Kegel, 10 Augenstrahlen' },
  { name: 'Mind Flayer',    icon: '🧠', cr: '7',    max_hp: 71,  armor_class: 15, speed: 30, stats: {str:11,dex:12,con:12,int:19,wis:17,cha:17}, notes: 'Psionischer Blitz, Gedankenverschlingen, Tentakel' },
  { name: 'Gelatinous Cube',icon: '🟩', cr: '2',    max_hp: 84,  armor_class: 6,  speed: 15, stats: {str:14,dex:3,con:20,int:1,wis:6,cha:1},    notes: 'Transparent, Umhüllung DC12 DEX' },
]

function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }
function statMod(v: number) { return Math.floor((v - 10) / 2) }

// ─── Token component ──────────────────────────────────────────────────────────
function TokenPiece({ token, selected, cellSize, onClick }: {
  token: BattleToken; selected: boolean; cellSize: number; onClick: () => void
}) {
  const hpPct = token.max_hp && token.current_hp !== null
    ? Math.max(0, Math.min(1, token.current_hp / token.max_hp))
    : null
  const hpColor = hpPct === null ? '' : hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444'

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
      {token.conditions.length > 0 && (
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-purple-600 rounded-full" title={token.conditions.join(', ')} />
      )}
    </div>
  )
}

// ─── Token Stats Panel ─────────────────────────────────────────────────────────
function TokenPanel({ token, onUpdate, onDelete, onClose, isGM }: {
  token: BattleToken
  onUpdate: (t: Partial<BattleToken>) => void
  onDelete: () => void
  onClose: () => void
  isGM: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...token })
  const [hpDelta, setHpDelta] = useState('')

  const applyHp = (delta: number) => {
    const cur = token.current_hp ?? token.max_hp ?? 0
    onUpdate({ current_hp: Math.max(0, Math.min(token.max_hp ?? 9999, cur + delta)) })
  }

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
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
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
            <div className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, ((token.current_hp ?? 0) / (token.max_hp ?? 1)) * 100))}%`, backgroundColor: (() => {
                const p = (token.current_hp ?? 0) / (token.max_hp ?? 1)
                return p > 0.6 ? '#22c55e' : p > 0.3 ? '#eab308' : '#ef4444'
              })() }} />
          </div>
          {isGM && (
            <div className="flex gap-1.5">
              {[-10,-5,-1,'+1','+5','+10'].map((d) => (
                <button key={d} onClick={() => applyHp(typeof d === 'number' ? d : parseInt(d as string))}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${
                    typeof d === 'number' && d < 0
                      ? 'bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/60'
                      : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/60'
                  }`}
                >{d}</button>
              ))}
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
      {token.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {token.conditions.map(c => (
            <span key={c} className="text-xs px-1.5 py-0.5 rounded-full bg-purple-900/50 border border-purple-700/40 text-purple-300 flex items-center gap-1">
              {c}
              {isGM && (
                <button onClick={() => onUpdate({ conditions: token.conditions.filter(x => x !== c) })} className="text-purple-500 hover:text-red-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* GM controls */}
      {isGM && (
        <div className="space-y-2 pt-1 border-t border-zinc-800">
          {/* Add condition */}
          <select
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
            defaultValue=""
            onChange={e => {
              if (e.target.value) onUpdate({ conditions: [...new Set([...token.conditions, e.target.value])] })
              e.target.value = ''
            }}
          >
            <option value="" disabled>+ Zustand hinzufügen</option>
            {CONDITIONS.filter(c => !token.conditions.includes(c)).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Notes */}
          {token.notes && (
            <p className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2 italic">{token.notes}</p>
          )}

          {/* Hide/Delete */}
          <div className="flex gap-2">
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
  const [draggingToken, setDraggingToken] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [activeTab, setActiveTab] = useState<'map' | 'tracker'>('map')
  const [showMapForm, setShowMapForm] = useState(false)
  const [showAddToken, setShowAddToken] = useState(false)
  const [showMonsterLib, setShowMonsterLib] = useState(false)
  const [newMapForm, setNewMapForm] = useState({ name: '', image_url: '', grid_cols: '24', grid_rows: '16', cell_size: '50' })
  const [addTokenForm, setAddTokenForm] = useState({ token_type: 'monster' as 'player' | 'monster' | 'npc', name: '', icon: '👹', max_hp: '10', armor_class: '10', speed: '30', notes: '' })
  const mapRef = useRef<HTMLDivElement>(null)

  const loadMaps = useCallback(async () => {
    const { data } = await supabase.from('battle_maps').select('*').order('created_at', { ascending: false })
    setMaps(data ?? [])
    if (!activeMap && data?.[0]) setActiveMap(data[0])
  }, [supabase, activeMap])

  const loadTokens = useCallback(async (mapId: string) => {
    const { data } = await supabase.from('battle_tokens').select('*').eq('map_id', mapId)
    setTokens(data ?? [])
  }, [supabase])

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

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
    }).select().single()
    if (data) { setActiveMap(data); setShowMapForm(false); loadMaps() }
  }

  const deleteMap = async (id: string) => {
    await supabase.from('battle_maps').delete().eq('id', id)
    if (activeMap?.id === id) setActiveMap(null)
    loadMaps()
  }

  // ── Token CRUD ──
  const addToken = async (override?: Partial<typeof addTokenForm & { stats: Record<string, number>; notes: string; challenge_rating: string }>) => {
    if (!activeMap || !user) return
    const base = { ...addTokenForm, ...override }
    await supabase.from('battle_tokens').insert({
      map_id: activeMap.id,
      token_type: base.token_type,
      name: base.name,
      icon: base.icon ?? '👹',
      col: 0, row: 0,
      max_hp: parseInt(base.max_hp) || null,
      current_hp: parseInt(base.max_hp) || null,
      armor_class: parseInt(base.armor_class) || null,
      speed: parseInt(base.speed) || null,
      initiative: 0,
      challenge_rating: (base as any).challenge_rating ?? null,
      conditions: [],
      notes: base.notes || null,
      stats: (base as any).stats ?? null,
      is_hidden: false,
    })
    loadTokens(activeMap.id)
    setShowAddToken(false); setShowMonsterLib(false)
  }

  const addMonsterFromTemplate = (m: MonsterTemplate) => {
    addToken({
      token_type: 'monster',
      name: m.name,
      icon: m.icon,
      max_hp: String(m.max_hp),
      armor_class: String(m.armor_class),
      speed: String(m.speed),
      notes: m.notes,
      stats: m.stats,
      challenge_rating: m.cr,
    } as any)
  }

  const updateToken = async (id: string, patch: Partial<BattleToken>) => {
    await supabase.from('battle_tokens').update(patch).eq('id', id)
    setTokens(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const deleteToken = async (id: string) => {
    await supabase.from('battle_tokens').delete().eq('id', id)
    setTokens(prev => prev.filter(t => t.id !== id))
    if (selectedToken === id) setSelectedToken(null)
  }

  // ── Grid click to move selected token ──
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMap || !isGM || !selectedToken) return
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    const col = Math.floor((e.clientX - rect.left) / activeMap.cell_size)
    const row = Math.floor((e.clientY - rect.top) / activeMap.cell_size)
    if (col >= 0 && col < activeMap.grid_cols && row >= 0 && row < activeMap.grid_rows) {
      updateToken(selectedToken, { col, row })
    }
  }

  const sel = selectedToken ? tokens.find(t => t.id === selectedToken) ?? null : null
  const visibleTokens = isGM ? tokens : tokens.filter(t => !t.is_hidden)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center gap-3">
        <Map className="w-5 h-5 text-amber-400" />
        <span className="text-base font-bold text-zinc-100 flex-1">Spielfeld</span>
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
        {isGM && (
          <div className="flex gap-1.5">
            <button onClick={() => setShowMapForm(!showMapForm)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Karte
            </button>
            {activeMap && (
              <>
                <button onClick={() => setShowAddToken(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/30 border border-amber-600/50 text-xs text-amber-300 hover:bg-amber-600/50 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Token
                </button>
                <button onClick={() => setShowMonsterLib(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-700/50 text-xs text-red-300 hover:bg-red-900/50 transition-colors">
                  👹 Monster
                </button>
              </>
            )}
          </div>
        )}
        {/* Tab switcher for GM */}
        {isGM && activeMap && (
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(['map','tracker'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === t ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}>
                {t === 'map' ? '🗺️ Karte' : '📋 Tracker'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Map Form */}
      {showMapForm && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Neue Karte erstellen</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Name" value={newMapForm.name} onChange={e => setNewMapForm(f => ({...f, name: e.target.value}))} />
            <input className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Bild-URL (optional)" value={newMapForm.image_url} onChange={e => setNewMapForm(f => ({...f, image_url: e.target.value}))} />
            <div className="flex gap-1.5">
              <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                placeholder="Sp" title="Spalten" value={newMapForm.grid_cols} onChange={e => setNewMapForm(f => ({...f, grid_cols: e.target.value}))} />
              <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                placeholder="Ze" title="Zeilen" value={newMapForm.grid_rows} onChange={e => setNewMapForm(f => ({...f, grid_rows: e.target.value}))} />
              <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                placeholder="px" title="Zellgröße" value={newMapForm.cell_size} onChange={e => setNewMapForm(f => ({...f, cell_size: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createMap} className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white">Erstellen</button>
            <button onClick={() => setShowMapForm(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">Abbrechen</button>
            {activeMap && <button onClick={() => deleteMap(activeMap.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-xs text-red-400">Karte löschen</button>}
          </div>
        </div>
      )}

      {/* Add Token Form */}
      {showAddToken && isGM && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Token hinzufügen</p>
          <div className="flex flex-wrap gap-2">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              value={addTokenForm.token_type} onChange={e => setAddTokenForm(f => ({...f, token_type: e.target.value as 'player'|'monster'|'npc'}))}>
              <option value="player">👤 Spieler</option>
              <option value="monster">👹 Monster</option>
              <option value="npc">🗣️ NPC</option>
            </select>
            <input className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              placeholder="Name" value={addTokenForm.name} onChange={e => setAddTokenForm(f => ({...f, name: e.target.value}))} />
            <input className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-base text-center focus:outline-none"
              placeholder="👹" value={addTokenForm.icon} onChange={e => setAddTokenForm(f => ({...f, icon: e.target.value}))} />
            <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              placeholder="HP" value={addTokenForm.max_hp} onChange={e => setAddTokenForm(f => ({...f, max_hp: e.target.value}))} />
            <input type="number" className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              placeholder="RK" value={addTokenForm.armor_class} onChange={e => setAddTokenForm(f => ({...f, armor_class: e.target.value}))} />
            <input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              placeholder="Notizen..." value={addTokenForm.notes} onChange={e => setAddTokenForm(f => ({...f, notes: e.target.value}))} />
            <button onClick={() => addToken()} disabled={!addTokenForm.name.trim()} className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white">Hinzufügen</button>
            <button onClick={() => setShowAddToken(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
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
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {MONSTER_TEMPLATES.map(m => (
              <button key={m.name} onClick={() => addMonsterFromTemplate(m)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/20 border border-red-800/40 text-xs text-red-200 hover:bg-red-900/40 transition-colors">
                <span>{m.icon}</span>
                <span>{m.name}</span>
                <span className="text-red-400/60">CR{m.cr}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {!activeMap ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
            <Map className="w-12 h-12 opacity-30" />
            <p>Keine Karte ausgewählt</p>
            {isGM && (
              <button onClick={() => setShowMapForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-bold text-white transition-colors">
                <Plus className="w-4 h-4" /> Erste Karte erstellen
              </button>
            )}
          </div>
        ) : activeTab === 'tracker' && isGM ? (
          /* ── GM Tracker ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Alle Figuren — {tokens.length} Token</p>
            {tokens.length === 0 && <p className="text-sm text-zinc-600">Noch keine Token auf der Karte.</p>}
            {tokens.sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)).map(t => (
              <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                selectedToken === t.id ? 'border-amber-500/60 bg-amber-900/20' :
                t.token_type === 'player' ? 'border-blue-800/40 bg-blue-900/10' :
                t.token_type === 'monster' ? 'border-red-800/40 bg-red-900/10' : 'border-zinc-700 bg-zinc-800/40'
              } ${t.is_hidden ? 'opacity-50' : ''}`}
                onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}>
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{t.name}</p>
                    {t.is_hidden && <EyeOff className="w-3 h-3 text-zinc-500" />}
                    {t.conditions.map(c => (
                      <span key={c} className="text-[10px] px-1 rounded bg-purple-900/40 text-purple-300">{c}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 text-[11px] text-zinc-500">
                    {t.max_hp !== null && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-400" /> {t.current_hp}/{t.max_hp}</span>}
                    {t.armor_class !== null && <span className="flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> {t.armor_class}</span>}
                    <span>Pos: {t.col}/{t.row}</span>
                    {t.challenge_rating && <span>CR {t.challenge_rating}</span>}
                  </div>
                </div>
                {/* Quick HP in tracker */}
                {t.max_hp !== null && (
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.max(0, (t.current_hp ?? 0) - 1) }) }}
                      className="w-6 h-6 rounded bg-red-900/40 border border-red-700/40 text-red-300 text-xs font-bold hover:bg-red-900/70">−</button>
                    <button onClick={e => { e.stopPropagation(); updateToken(t.id, { current_hp: Math.min(t.max_hp!, (t.current_hp ?? 0) + 1) }) }}
                      className="w-6 h-6 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/70">+</button>
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); deleteToken(t.id) }} className="p-1 text-zinc-600 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* ── Map View ── */
          <div className="flex-1 overflow-auto relative flex">
            {/* Scrollable map container */}
            <div className="flex-1 overflow-auto">
              <div
                ref={mapRef}
                className="relative select-none"
                style={{
                  width: activeMap.grid_cols * activeMap.cell_size,
                  height: activeMap.grid_rows * activeMap.cell_size,
                  backgroundImage: activeMap.image_url
                    ? `url(${activeMap.image_url})`
                    : 'linear-gradient(135deg, #1a0a02 25%, #0f0600 50%, #1a0a02 75%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: isGM && selectedToken ? 'crosshair' : 'default',
                }}
                onClick={handleGridClick}
              >
                {/* Grid lines */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* Vertical lines */}
                  {Array.from({ length: activeMap.grid_cols + 1 }, (_, i) => (
                    <line key={`v${i}`} x1={i * activeMap.cell_size} y1={0} x2={i * activeMap.cell_size} y2={activeMap.grid_rows * activeMap.cell_size}
                      stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  ))}
                  {/* Horizontal lines */}
                  {Array.from({ length: activeMap.grid_rows + 1 }, (_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * activeMap.cell_size} x2={activeMap.grid_cols * activeMap.cell_size} y2={i * activeMap.cell_size}
                      stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  ))}
                </svg>

                {/* Tokens */}
                {visibleTokens.map(t => (
                  <TokenPiece
                    key={t.id}
                    token={t}
                    selected={selectedToken === t.id}
                    cellSize={activeMap.cell_size}
                    onClick={() => setSelectedToken(t.id === selectedToken ? null : t.id)}
                  />
                ))}

                {/* Instruction overlay */}
                {isGM && selectedToken && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Klicke auf ein Feld um den Token zu bewegen
                  </div>
                )}
              </div>
            </div>

            {/* Token stats panel (overlay right side) */}
            {sel && (
              <div className="flex-shrink-0 w-72 overflow-y-auto p-3 border-l border-zinc-800 bg-zinc-950">
                <TokenPanel
                  token={sel}
                  onUpdate={patch => updateToken(sel.id, patch)}
                  onDelete={() => deleteToken(sel.id)}
                  onClose={() => setSelectedToken(null)}
                  isGM={isGM}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
