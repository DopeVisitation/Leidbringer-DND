'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapPin, Plus, Trash2, X, ZoomIn, ZoomOut, Search, Compass, Eye, EyeOff, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Fallback hardcoded Sword Coast (shown before DB loads) ────────────────────
const SWORD_COAST_ID = '00000000-0000-0000-0000-000000000002'

const MARKER_COLORS = [
  { val: '#f59e0b', label: 'Amber'  },
  { val: '#ef4444', label: 'Rot'    },
  { val: '#3b82f6', label: 'Blau'   },
  { val: '#22c55e', label: 'Grün'   },
  { val: '#a855f7', label: 'Lila'   },
  { val: '#ec4899', label: 'Pink'   },
  { val: '#ffffff', label: 'Weiß'   },
  { val: '#f97316', label: 'Orange' },
]

const MARKER_ICONS = ['📍','⚔️','🏰','🐉','💀','⭐','🌊','🌲','⛰️','🔥','❓','✅','🏕️','⚓','🌿','💎','🗝️','🪄','🧿','🎯']

interface WorldMap {
  id: string
  name: string
  url: string
  width: number
  height: number
  init_scale: number
  is_visible: boolean
  sort_order: number
  created_by: string | null
  created_at: string
}

interface MapMarker {
  id: string
  title: string
  description?: string
  x: number
  y: number
  color: string
  icon: string
  created_by: string
  map_id?: number
  creator?: { username: string }
}

interface CustomLocation {
  id: string
  map_id: number
  name: string
  x: number
  y: number
  created_by: string
  creator?: { username: string }
}

type SearchHit = {
  name: string
  x: number
  y: number
  source: 'builtin' | 'custom'
  id?: string
  createdBy?: string
}

export default function MapsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const didDragRef = useRef(false)

  // ── World maps state ──────────────────────────────────────────────────────
  const [worldMaps, setWorldMaps] = useState<WorldMap[]>([])
  const [activeMapId, setActiveMapId] = useState<string>(SWORD_COAST_ID)
  const [showMapManager, setShowMapManager] = useState(false)
  const [newMapForm, setNewMapForm] = useState({ name: '', url: '', width: '10200', height: '6600', init_scale: '0.14' })
  const [savingMap, setSavingMap] = useState(false)

  const activeWorldMap = worldMaps.find(m => m.id === activeMapId) ?? null

  // ── Map view state ────────────────────────────────────────────────────────
  const [scale, setScale] = useState(0.14)
  const [offset, setOffset] = useState({ x: 20, y: 20 })
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchHit[]>([])
  const [searchPin, setSearchPin] = useState<{ x: number; y: number; name: string } | null>(null)

  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([])
  const [addMode, setAddMode] = useState<'none' | 'marker' | 'location'>('none')
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [selectedCustom, setSelectedCustom] = useState<CustomLocation | null>(null)
  const [newMarker, setNewMarker] = useState({ title: '', description: '', color: '#f59e0b', icon: '📍' })
  const [newLocationName, setNewLocationName] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Load world maps ───────────────────────────────────────────────────────
  const loadWorldMaps = useCallback(async () => {
    const { data } = await supabase.from('world_maps').select('*').order('sort_order', { ascending: true })
    if (data && data.length > 0) {
      setWorldMaps(data as WorldMap[])
      // Set to Sword Coast by default if available
      if (!activeMapId || !data.find((m: WorldMap) => m.id === activeMapId)) {
        setActiveMapId(data[0].id)
      }
    }
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadWorldMaps()
    const ch = supabase.channel('world_maps_v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_maps' }, loadWorldMaps)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadWorldMaps, supabase])

  // Reset scale/offset when switching maps
  useEffect(() => {
    if (activeWorldMap) {
      setScale(activeWorldMap.init_scale)
      setOffset({ x: 20, y: 20 })
      setSearchPin(null)
      setSelectedMarker(null)
      setSelectedCustom(null)
      setPendingPos(null)
      setAddMode('none')
    }
  }, [activeMapId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load markers / custom locations ─────────────────────────────────────
  const loadMarkers = useCallback(async () => {
    const { data } = await supabase
      .from('map_markers')
      .select('*, creator:profiles!map_markers_created_by_fkey(username)')
      .order('created_at', { ascending: false })
    if (data) {
      // Legacy: Sword Coast uses map_id=2; new maps don't have markers yet
      setMarkers((data as MapMarker[]).filter((m) => (m.map_id ?? 0) === 2))
    }
  }, [supabase])

  const loadCustomLocations = useCallback(async () => {
    const { data } = await supabase
      .from('custom_locations')
      .select('*, creator:profiles(username)')
      .eq('map_id', 2)
      .order('created_at', { ascending: false })
    if (data) setCustomLocations(data as CustomLocation[])
  }, [supabase])

  useEffect(() => {
    loadMarkers()
    loadCustomLocations()
    const chMarkers = supabase.channel('map_markers_v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, loadMarkers)
      .subscribe()
    const chCustom = supabase.channel('custom_locations_v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_locations' }, loadCustomLocations)
      .subscribe()
    return () => {
      supabase.removeChannel(chMarkers)
      supabase.removeChannel(chCustom)
    }
  }, [loadMarkers, loadCustomLocations, supabase])

  // ── GM: add map ───────────────────────────────────────────────────────────
  const addWorldMap = async () => {
    if (!newMapForm.name.trim() || !newMapForm.url.trim() || !user) return
    setSavingMap(true)
    const { data } = await supabase.from('world_maps').insert({
      name: newMapForm.name.trim(),
      url: newMapForm.url.trim(),
      width: parseInt(newMapForm.width) || 10200,
      height: parseInt(newMapForm.height) || 6600,
      init_scale: parseFloat(newMapForm.init_scale) || 0.14,
      is_visible: true,
      sort_order: worldMaps.length,
      created_by: user.id,
    }).select().single()
    if (data) {
      setActiveMapId((data as WorldMap).id)
    }
    setNewMapForm({ name: '', url: '', width: '10200', height: '6600', init_scale: '0.14' })
    setSavingMap(false)
    loadWorldMaps()
  }

  const toggleMapVisibility = async (mapId: string, isVisible: boolean) => {
    await supabase.from('world_maps').update({ is_visible: !isVisible }).eq('id', mapId)
    setWorldMaps(prev => prev.map(m => m.id === mapId ? { ...m, is_visible: !isVisible } : m))
  }

  const deleteWorldMap = async (mapId: string) => {
    if (!confirm('Karte löschen? Alle Markierungen bleiben erhalten.')) return
    await supabase.from('world_maps').delete().eq('id', mapId)
    if (activeMapId === mapId && worldMaps.length > 1) {
      setActiveMapId(worldMaps.find(m => m.id !== mapId)?.id ?? SWORD_COAST_ID)
    }
    loadWorldMaps()
  }

  // ── Wheel = Zoom ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.05 : -0.05
      setScale((s) => Math.min(Math.max(s + delta, 0.03), 4))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Pan ───────────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (addMode !== 'none') return
    isDraggingRef.current = true
    didDragRef.current = false
    dragStartRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.mx
    const dy = e.clientY - dragStartRef.current.my
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
    setOffset({ x: dragStartRef.current.ox + dx, y: dragStartRef.current.oy + dy })
  }, [])
  const onMouseUp = () => { isDraggingRef.current = false }

  const onMapClick = (e: React.MouseEvent) => {
    if (addMode === 'none' || !containerRef.current || !activeWorldMap) return
    const rect = containerRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left - offset.x) / scale
    const py = (e.clientY - rect.top - offset.y) / scale
    setPendingPos({ x: (px / activeWorldMap.width) * 100, y: (py / activeWorldMap.height) * 100 })
  }

  // ── Saving markers / locations ─────────────────────────────────────────────
  const saveMarker = async () => {
    if (!pendingPos || !user || !newMarker.title.trim()) return
    setSaving(true)
    await supabase.from('map_markers').insert({
      title: newMarker.title.trim(),
      description: newMarker.description || null,
      x: pendingPos.x, y: pendingPos.y,
      color: newMarker.color, icon: newMarker.icon,
      created_by: user.id,
      map_id: 2, // legacy integer map_id for Sword Coast
    })
    setPendingPos(null)
    setAddMode('none')
    setNewMarker({ title: '', description: '', color: '#f59e0b', icon: '📍' })
    setSaving(false)
  }

  const saveCustomLocation = async () => {
    if (!pendingPos || !user || !newLocationName.trim()) return
    setSaving(true)
    await supabase.from('custom_locations').insert({
      map_id: 2,
      name: newLocationName.trim(),
      x: pendingPos.x, y: pendingPos.y,
      created_by: user.id,
    })
    setPendingPos(null)
    setAddMode('none')
    setNewLocationName('')
    setSaving(false)
  }

  const deleteMarker = async (id: string) => {
    if (!confirm('Markierung löschen?')) return
    await supabase.from('map_markers').delete().eq('id', id)
    setSelectedMarker(null)
  }

  const deleteCustomLocation = async (id: string) => {
    if (!confirm('Ort löschen?')) return
    await supabase.from('custom_locations').delete().eq('id', id)
    setSelectedCustom(null)
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const allSearchable: SearchHit[] = useMemo(() => [
    ...customLocations.map((l) => ({ name: l.name, x: l.x, y: l.y, source: 'custom' as const, id: l.id, createdBy: l.created_by })),
  ], [customLocations])

  const handleSearch = (val: string) => {
    setSearch(val)
    const q = val.trim().toLowerCase()
    if (!q) { setSearchResults([]); return }
    const scored = allSearchable
      .map((l) => {
        const n = l.name.toLowerCase()
        let score = -1
        if (n === q) score = 0
        else if (n.startsWith(q)) score = 1
        else if (n.split(/\s+/).some((w) => w.startsWith(q))) score = 2
        else if (n.includes(q)) score = 3
        return { loc: l, score }
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => a.score - b.score || a.loc.name.length - b.loc.name.length)
      .slice(0, 12)
      .map((s) => s.loc)
    setSearchResults(scored)
  }

  const panTo = (hit: SearchHit) => {
    if (!containerRef.current || !activeWorldMap) return
    const rect = containerRef.current.getBoundingClientRect()
    setOffset({
      x: rect.width  / 2 - (hit.x / 100) * activeWorldMap.width * scale,
      y: rect.height / 2 - (hit.y / 100) * activeWorldMap.height * scale,
    })
    setSearch('')
    setSearchResults([])
    setSearchPin({ x: hit.x, y: hit.y, name: hit.name })
    if (hit.source === 'custom' && hit.id) {
      const found = customLocations.find((l) => l.id === hit.id)
      if (found) setSelectedCustom(found)
    }
  }

  const toScreen = (xPct: number, yPct: number) => {
    if (!activeWorldMap) return { x: 0, y: 0 }
    return {
      x: (xPct / 100) * activeWorldMap.width * scale + offset.x,
      y: (yPct / 100) * activeWorldMap.height * scale + offset.y,
    }
  }

  // Only show markers for the Sword Coast map
  const showMarkers = activeMapId === SWORD_COAST_ID

  if (!user) return null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <Compass className="w-4 h-4 text-amber-400" />
        <h1 className="text-sm font-bold text-amber-300">{activeWorldMap?.name ?? 'Karte'}</h1>
        <span className="text-xs text-zinc-500 ml-1">— Forgotten Realms</span>

        {/* Map switcher tabs */}
        <div className="flex items-center gap-1 ml-4 flex-1 overflow-x-auto">
          {worldMaps.map(m => (
            <button key={m.id}
              onClick={() => setActiveMapId(m.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeMapId === m.id
                  ? 'bg-amber-700/40 border border-amber-600/50 text-amber-300'
                  : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200'
              } ${!m.is_visible && isGM ? 'opacity-50' : ''}`}>
              {!m.is_visible && <EyeOff className="w-3 h-3" />}
              {m.name}
            </button>
          ))}
        </div>

        {/* GM: map manager button */}
        {isGM && (
          <button
            onClick={() => setShowMapManager(!showMapManager)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors ml-auto flex-shrink-0 ${
              showMapManager ? 'bg-sky-700/30 border border-sky-600/40 text-sky-300' : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}>
            <Globe className="w-3.5 h-3.5" />
            Karten verwalten
          </button>
        )}
      </div>

      {/* GM: Map Manager Panel */}
      {isGM && showMapManager && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex-shrink-0">
          <div className="flex gap-4 flex-wrap">
            {/* Existing maps list */}
            <div className="flex-1 min-w-48">
              <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-2">Karten</p>
              <div className="space-y-1.5">
                {worldMaps.map(m => (
                  <div key={m.id} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.is_visible ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                    <span className="flex-1 text-xs text-zinc-200 truncate">{m.name}</span>
                    <span className="text-[10px] text-zinc-600 truncate max-w-32">{m.url.slice(0, 30)}{m.url.length > 30 ? '…' : ''}</span>
                    <button
                      onClick={() => toggleMapVisibility(m.id, m.is_visible)}
                      title={m.is_visible ? 'Für Spieler ausblenden' : 'Für Spieler anzeigen'}
                      className={`p-1 rounded transition-colors ${m.is_visible ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600 hover:text-zinc-400'}`}>
                      {m.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    {m.id !== SWORD_COAST_ID && (
                      <button
                        onClick={() => deleteWorldMap(m.id)}
                        className="p-1 text-zinc-700 hover:text-red-500 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add new map form */}
            <div className="flex-1 min-w-64 border-l border-zinc-800 pl-4">
              <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-2">Neue Karte hinzufügen</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    placeholder="Name *" value={newMapForm.name}
                    onChange={e => setNewMapForm(f => ({ ...f, name: e.target.value }))} />
                  <input
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    placeholder="Init. Zoom (z.B. 0.14)" value={newMapForm.init_scale}
                    onChange={e => setNewMapForm(f => ({ ...f, init_scale: e.target.value }))} />
                </div>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  placeholder="Bild-URL * (z.B. /meine-karte.jpg oder https://…)" value={newMapForm.url}
                  onChange={e => setNewMapForm(f => ({ ...f, url: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    placeholder="Breite px (10200)" value={newMapForm.width}
                    onChange={e => setNewMapForm(f => ({ ...f, width: e.target.value }))} />
                  <input
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    placeholder="Höhe px (6600)" value={newMapForm.height}
                    onChange={e => setNewMapForm(f => ({ ...f, height: e.target.value }))} />
                </div>
                <button
                  onClick={addWorldMap}
                  disabled={savingMap || !newMapForm.name.trim() || !newMapForm.url.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-xs font-bold text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {savingMap ? 'Speichern…' : 'Karte hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap">
        <span className="text-xs text-zinc-500">
          {showMarkers ? `${markers.length} Markierungen · ${customLocations.length} eigene Orte` : activeWorldMap?.name ?? ''}
        </span>

        {/* Suche – only for Sword Coast (has custom locations) */}
        {showMarkers && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ort auf der Karte suchen…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl max-h-80 overflow-y-auto">
                {searchResults.map((loc, i) => (
                  <button
                    key={`${loc.source}-${loc.id ?? loc.name}-${i}`}
                    onClick={() => panTo(loc)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>📍 {loc.name}</span>
                    {loc.source === 'custom' && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">eigener Ort</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Such-Pin abbrechen */}
        {searchPin && (
          <button
            onClick={() => setSearchPin(null)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/40 text-xs text-amber-300 hover:bg-amber-600/30 transition-colors"
          >
            <X className="w-3 h-3" />
            {searchPin.name}
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.05, 4))}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            title="Reinzoomen"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.05, 0.03))}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            title="Rauszoomen"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-600 px-1">{Math.round(scale * 100)}%</span>

          {/* Add location/marker buttons — only for Sword Coast */}
          {showMarkers && (
            <>
              <button
                onClick={() => {
                  if (addMode === 'location') { setAddMode('none'); setPendingPos(null) }
                  else { setAddMode('location'); setPendingPos(null); setSelectedMarker(null); setSelectedCustom(null) }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-1 ${
                  addMode === 'location' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {addMode === 'location' ? <><X className="w-3.5 h-3.5" /> Abbrechen</> : <><MapPin className="w-3.5 h-3.5" /> Ort hinzufügen</>}
              </button>
              <button
                onClick={() => {
                  if (addMode === 'marker') { setAddMode('none'); setPendingPos(null) }
                  else { setAddMode('marker'); setPendingPos(null); setSelectedMarker(null); setSelectedCustom(null) }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  addMode === 'marker' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {addMode === 'marker' ? <><X className="w-3.5 h-3.5" /> Abbrechen</> : <><Plus className="w-3.5 h-3.5" /> Markierung</>}
              </button>
            </>
          )}
        </div>
      </div>

      {addMode !== 'none' && !pendingPos && (
        <div className={`border-b px-4 py-2 text-xs flex-shrink-0 ${
          addMode === 'marker'
            ? 'bg-amber-600/10 border-amber-600/20 text-amber-300'
            : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-300'
        }`}>
          {addMode === 'marker'
            ? 'Klicke auf die Karte, um eine Markierung zu setzen.'
            : 'Klicke auf die Karte, um einen neuen Ort hinzuzufügen — er wird über die Suche findbar.'}
        </div>
      )}

      {/* Map Container */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-zinc-950 ${addMode !== 'none' ? 'cursor-crosshair' : 'cursor-grab'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onMapClick}
      >
        {activeWorldMap ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: activeWorldMap.width,
              height: activeWorldMap.height,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeWorldMap.url}
              alt={activeWorldMap.name}
              width={activeWorldMap.width}
              height={activeWorldMap.height}
              draggable={false}
              className="block select-none"
              style={{ width: activeWorldMap.width, height: activeWorldMap.height }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Keine Karte ausgewählt
          </div>
        )}

        {/* Markers — only for Sword Coast */}
        {showMarkers && markers.map((m) => {
          const pos = toScreen(m.x, m.y)
          return (
            <button
              key={m.id}
              onClick={(e) => { e.stopPropagation(); if (addMode === 'none') setSelectedMarker(m) }}
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
              className="absolute z-10 flex flex-col items-center hover:z-20 transition-transform hover:scale-110"
            >
              <span className="text-xl drop-shadow-lg leading-none">{m.icon}</span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow-lg"
                style={{ background: m.color + '33', color: m.color, border: `1px solid ${m.color}55` }}
              >
                {m.title}
              </span>
              <div
                className="w-2.5 h-2.5 rounded-full border-2 border-white/60 mt-0.5 shadow-md"
                style={{ backgroundColor: m.color }}
              />
            </button>
          )
        })}

        {/* Search Pin */}
        {searchPin && (() => {
          const pos = toScreen(searchPin.x, searchPin.y)
          return (
            <div
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              className="absolute z-30 pointer-events-none"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute w-10 h-10 rounded-full bg-amber-400/30 animate-ping" />
              </div>
              <div className="relative w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.95)]" />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-zinc-900 text-xs px-2 py-0.5 rounded-full font-bold shadow-lg whitespace-nowrap">
                  {searchPin.name}
                </span>
              </div>
            </div>
          )
        })()}

        {/* Pending preview */}
        {pendingPos && (() => {
          const pos = toScreen(pendingPos.x, pendingPos.y)
          return (
            <div
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              className="absolute z-20 pointer-events-none"
            >
              {addMode === 'marker' ? (
                <span className="text-3xl animate-bounce">{newMarker.icon}</span>
              ) : (
                <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
              )}
            </div>
          )
        })()}
      </div>

      {/* Selected Marker Popup */}
      {selectedMarker && (
        <div className="absolute bottom-20 md:bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-64 shadow-2xl z-30">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedMarker.icon}</span>
              <div>
                <p className="text-sm font-bold text-zinc-100">{selectedMarker.title}</p>
                <p className="text-xs text-zinc-500">von {selectedMarker.creator?.username ?? '?'}</p>
              </div>
            </div>
            <button onClick={() => setSelectedMarker(null)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedMarker.description && (
            <p className="text-xs text-zinc-400 mb-3">{selectedMarker.description}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => panTo({ name: selectedMarker.title, x: selectedMarker.x, y: selectedMarker.y, source: 'custom' })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
            >
              Zentrieren
            </button>
            {(isGM || selectedMarker.created_by === user.id) && (
              <button
                onClick={() => deleteMarker(selectedMarker.id)}
                className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-xs text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Custom Location Popup */}
      {selectedCustom && (
        <div className="absolute bottom-20 md:bottom-4 right-4 bg-zinc-900 border border-emerald-700/40 rounded-xl p-4 w-64 shadow-2xl z-30">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-zinc-100">{selectedCustom.name}</p>
                <p className="text-xs text-zinc-500">
                  Eigener Ort · von {selectedCustom.creator?.username ?? '?'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedCustom(null)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => panTo({ name: selectedCustom.name, x: selectedCustom.x, y: selectedCustom.y, source: 'custom' })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
            >
              Zentrieren
            </button>
            {(isGM || selectedCustom.created_by === user.id) && (
              <button
                onClick={() => deleteCustomLocation(selectedCustom.id)}
                className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-xs text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* New Marker Form */}
      {pendingPos && addMode === 'marker' && (
        <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-80 shadow-2xl z-30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-200">Neue Markierung</p>
            <button onClick={() => setPendingPos(null)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text" autoFocus
              placeholder="Titel *"
              value={newMarker.title}
              onChange={(e) => setNewMarker((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && saveMarker()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Beschreibung (optional)"
              value={newMarker.description}
              onChange={(e) => setNewMarker((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Icon</p>
              <div className="flex flex-wrap gap-1">
                {MARKER_ICONS.map((ico) => (
                  <button key={ico} type="button"
                    onClick={() => setNewMarker((p) => ({ ...p, icon: ico }))}
                    className={`w-7 h-7 rounded text-base flex items-center justify-center transition-colors ${newMarker.icon === ico ? 'bg-amber-600/40 ring-1 ring-amber-500' : 'hover:bg-zinc-700'}`}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Farbe</p>
              <div className="flex gap-2 flex-wrap">
                {MARKER_COLORS.map((c) => (
                  <button key={c.val} type="button"
                    onClick={() => setNewMarker((p) => ({ ...p, color: c.val }))}
                    style={{ background: c.val }}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newMarker.color === c.val ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110' : ''}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={saveMarker}
              disabled={saving || !newMarker.title.trim()}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
            >
              {saving ? 'Speichern...' : 'Markierung setzen'}
            </button>
          </div>
        </div>
      )}

      {/* New Custom Location Form */}
      {pendingPos && addMode === 'location' && (
        <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-emerald-700/50 rounded-xl p-4 w-80 shadow-2xl z-30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-200">🗺️ Eigener Ort</p>
            <button onClick={() => setPendingPos(null)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-2">Wird in der Suche genau wie eingebaute Orte angezeigt.</p>
          <input
            type="text" autoFocus
            placeholder='Ortsname (z.B. „Versteckte Höhle") *'
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveCustomLocation()}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-3"
          />
          <button
            onClick={saveCustomLocation}
            disabled={saving || !newLocationName.trim()}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
          >
            {saving ? 'Speichern...' : 'Ort hinzufügen'}
          </button>
        </div>
      )}
    </div>
  )
}
