'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Plus, Trash2, X, ZoomIn, ZoomOut, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Map configurations ────────────────────────────────────────────────────────
const MAP_CONFIGS = [
  {
    id: 0,
    name: 'Faerûn 1372 DR',
    url: '/faerun-map.jpg',
    w: 4096, h: 3072,
    initScale: 0.28,
    locations: [
      // Sword Coast
      { name: 'Waterdeep',        x: 18.6, y: 28.3 },
      { name: 'Neverwinter',      x: 14.2, y: 17.2 },
      { name: 'Luskan',           x: 16.1, y: 15.5 },
      { name: 'Port Llast',       x: 13.9, y: 19.5 },
      { name: 'Leilon',           x: 13.5, y: 22.5 },
      { name: 'Daggerford',       x: 17.1, y: 33.9 },
      { name: "Baldur's Gate",    x: 16.8, y: 50.0 },
      { name: 'Candlekeep',       x: 16.5, y: 53.5 },
      // The North / Silver Marches
      { name: 'Mirabar',          x: 19.3, y: 11.7 },
      { name: 'Mithral Hall',     x: 28.1, y: 19.2 },
      { name: 'Silverymoon',      x: 33.2, y: 15.6 },
      { name: 'Everlund',         x: 31.0, y: 17.3 },
      { name: 'Sundabar',         x: 36.1, y: 16.1 },
      { name: 'Citadel Adbar',    x: 38.6, y: 12.0 },
      { name: 'Longsaddle',       x: 23.8, y: 23.8 },
      { name: 'Triboar',          x: 25.6, y: 26.7 },
      { name: 'Yartar',           x: 26.0, y: 27.7 },
      { name: 'Secomber',         x: 25.9, y: 33.9 },
      { name: 'Deadsnows',        x: 28.5, y: 16.0 },
      // Icewind Dale
      { name: 'Bryn Shander',     x: 24.0, y: 6.0  },
      { name: 'Icewind Dale',     x: 22.0, y: 5.0  },
      // Western Heartlands
      { name: 'Elturel',          x: 26.9, y: 46.9 },
      { name: 'Berdusk',          x: 28.1, y: 45.9 },
      { name: 'Scornubel',        x: 25.9, y: 44.8 },
      { name: 'Iriaebor',         x: 33.7, y: 44.1 },
      { name: 'Darkhold',         x: 36.5, y: 40.5 },
      // Amn / Tethyr / Calimshan
      { name: 'Athkatla',         x: 21.0, y: 57.0 },
      { name: 'Nashkel',          x: 19.8, y: 54.7 },
      { name: 'Zazesspur',        x: 18.3, y: 61.8 },
      { name: 'Memnon',           x: 20.0, y: 63.5 },
      { name: 'Calimport',        x: 21.2, y: 70.0 },
      // Moonsea / Zhentarim
      { name: 'Zhentil Keep',     x: 47.9, y: 25.4 },
      { name: 'Phlan',            x: 48.6, y: 25.9 },
      { name: 'Hillsfar',         x: 49.8, y: 28.0 },
      { name: 'Mulmaster',        x: 55.7, y: 26.0 },
      { name: 'Melvaunt',         x: 54.9, y: 25.1 },
      // Cormyr / Dales
      { name: 'Suzail',           x: 49.8, y: 38.1 },
      { name: 'Arabel',           x: 48.6, y: 32.9 },
      { name: 'Tilverton',        x: 49.6, y: 32.6 },
      { name: 'Marsember',        x: 51.5, y: 40.0 },
      { name: 'Shadowdale',       x: 51.0, y: 32.1 },
      { name: 'Myth Drannor',     x: 52.5, y: 30.5 },
      // Sembia
      { name: 'Ordulin',          x: 53.2, y: 35.2 },
      { name: 'Selgaunt',         x: 54.7, y: 38.9 },
      { name: 'Saerloon',         x: 53.7, y: 41.0 },
      { name: 'Daerlun',          x: 52.5, y: 35.5 },
      // Turmish / Dragon Coast
      { name: 'Alaghôn',          x: 51.5, y: 45.1 },
      { name: 'Westgate',         x: 49.0, y: 44.0 },
      // Chessenta
      { name: 'Luthcheq',         x: 60.1, y: 41.7 },
      { name: 'Airspur',          x: 63.5, y: 43.0 },
      { name: 'Cimbar',           x: 60.5, y: 44.0 },
      // Thay
      { name: 'Eltabbar',         x: 68.8, y: 26.7 },
      { name: 'Bezantur',         x: 66.4, y: 33.2 },
      { name: 'Tyraturos',        x: 64.0, y: 29.1 },
      { name: 'Pyarados',         x: 67.6, y: 27.5 },
      // Aglarond / Rashemen
      { name: 'Velprintalar',     x: 71.8, y: 34.0 },
      { name: 'Immilmar',         x: 70.1, y: 19.4 },
      { name: 'Thesk',            x: 74.5, y: 24.7 },
      // Unther / Mulhorand
      { name: 'Unthalass',        x: 63.5, y: 50.0 },
      { name: 'Messemprar',       x: 66.2, y: 50.1 },
      { name: 'Skuld',            x: 67.6, y: 60.9 },
      // The Shaar / South
      { name: 'The Shaar',        x: 57.1, y: 68.0 },
      { name: 'Lapaliiya',        x: 44.2, y: 72.3 },
      { name: 'Halruaa',          x: 46.9, y: 77.8 },
      { name: 'Dambrath',         x: 52.2, y: 79.4 },
      { name: 'Luiren',           x: 46.2, y: 81.7 },
      // Anauroch / North
      { name: 'Anauroch',         x: 44.9, y: 14.6 },
      { name: 'Narfell',          x: 68.0, y: 15.0 },
    ],
  },
  {
    id: 1,
    name: 'Faerûn Extended',
    url: '/faerun-extended.jpg',
    w: 20000, h: 10886,
    initScale: 0.06,
    locations: [
      // Faerûn – Sword Coast
      { name: 'Waterdeep',        x: 13.4, y: 25.5 },
      { name: 'Neverwinter',      x: 12.3, y: 18.7 },
      { name: 'Luskan',           x: 12.8, y: 17.6 },
      { name: "Baldur's Gate",    x: 13.0, y: 39.0 },
      { name: 'Candlekeep',       x: 12.8, y: 41.5 },
      { name: 'Mirabar',          x: 13.4, y: 14.6 },
      // Faerûn – The North
      { name: 'Silverymoon',      x: 17.3, y: 17.7 },
      { name: 'Sundabar',         x: 18.2, y: 17.0 },
      { name: 'Icewind Dale',     x: 15.5, y: 11.0 },
      { name: 'Bryn Shander',     x: 15.5, y: 11.5 },
      { name: 'Mithral Hall',     x: 15.9, y: 19.2 },
      // Faerûn – Heartlands
      { name: 'Elturel',          x: 15.6, y: 37.1 },
      { name: 'Scornubel',        x: 15.3, y: 36.0 },
      { name: 'Iriaebor',         x: 17.2, y: 35.6 },
      { name: 'Athkatla',         x: 14.1, y: 44.5 },
      { name: 'Calimport',        x: 14.1, y: 51.4 },
      { name: 'Memnon',           x: 13.8, y: 47.3 },
      // Faerûn – Moonsea & East
      { name: 'Zhentil Keep',     x: 20.2, y: 24.3 },
      { name: 'Hillsfar',         x: 20.5, y: 25.6 },
      { name: 'Mulmaster',        x: 22.3, y: 24.1 },
      { name: 'Suzail',           x: 20.5, y: 30.6 },
      { name: 'Shadowdale',       x: 21.1, y: 28.0 },
      { name: 'Selgaunt',         x: 22.3, y: 32.2 },
      { name: 'Alaghôn',          x: 21.1, y: 35.3 },
      { name: 'Westgate',         x: 20.3, y: 34.4 },
      // Thay & East
      { name: 'Eltabbar',         x: 26.7, y: 24.5 },
      { name: 'Bezantur',         x: 25.8, y: 27.8 },
      { name: 'Velprintalar',     x: 28.2, y: 28.0 },
      { name: 'Immilmar',         x: 27.1, y: 17.4 },
      { name: 'Thesk',            x: 29.5, y: 20.5 },
      { name: 'Skuld',            x: 26.4, y: 45.8 },
      { name: 'Unthalass',        x: 25.3, y: 40.5 },
      { name: 'Halruaa',          x: 21.0, y: 56.2 },
      { name: 'Dambrath',         x: 22.3, y: 57.2 },
      { name: 'Lapaliiya',        x: 20.2, y: 52.8 },
      { name: 'Narfell',          x: 29.0, y: 14.2 },
      { name: 'Anauroch',         x: 21.8, y: 16.2 },
      // Kara-Tur & Hordelands
      { name: 'Kara-Tur',         x: 68.0, y: 28.0 },
      { name: 'Shou Lung',        x: 73.0, y: 22.0 },
      { name: 'Ama Basin',        x: 73.0, y: 7.0  },
      { name: 'T\'u Lung',        x: 75.0, y: 48.0 },
      { name: 'Wa',               x: 80.0, y: 25.0 },
      { name: 'Kozakura',         x: 83.0, y: 30.0 },
      { name: 'Hordelands',       x: 50.0, y: 18.0 },
      { name: 'Semphar',          x: 52.0, y: 22.0 },
      { name: 'Rashemen',         x: 32.0, y: 16.5 },
      // Zakhara & Maztica
      { name: 'Zakhara',          x: 30.0, y: 74.0 },
      { name: 'Huzuz',            x: 30.0, y: 76.0 },
      { name: 'Maztica',          x: 2.0,  y: 62.0 },
      // Evermeet
      { name: 'Evermeet',         x: 2.0,  y: 38.0 },
    ],
  },
  {
    id: 2,
    name: 'Sword Coast',
    url: '/sword-coast.jpg',
    w: 10200, h: 6600,
    initScale: 0.14,
    locations: [
      // Northern Coast
      { name: 'Luskan',           x: 54.0, y: 9.0  },
      { name: 'Neverwinter',      x: 52.0, y: 13.0 },
      { name: 'Port Llast',       x: 51.0, y: 17.0 },
      { name: 'Helm\'s Hold',     x: 52.5, y: 18.0 },
      { name: 'Thundertree',      x: 51.5, y: 19.5 },
      { name: 'Leilon',           x: 52.0, y: 21.0 },
      // Central Coast
      { name: 'Phandalin',        x: 57.0, y: 25.0 },
      { name: 'Waterdeep',        x: 57.0, y: 30.0 },
      { name: 'Amphail',          x: 59.0, y: 35.0 },
      { name: 'Red Larch',        x: 64.0, y: 36.0 },
      { name: 'Daggerford',       x: 56.0, y: 40.0 },
      { name: 'Secomber',         x: 63.0, y: 43.0 },
      { name: 'Dragonspear',      x: 58.0, y: 46.0 },
      // Southern Coast
      { name: 'Boareskyr Bridge', x: 56.5, y: 50.0 },
      { name: 'Soubar',           x: 57.0, y: 53.0 },
      { name: 'Elturel',          x: 65.0, y: 54.0 },
      { name: 'Scornubel',        x: 64.0, y: 48.0 },
      { name: 'Berdusk',          x: 66.0, y: 52.0 },
      { name: 'Iriaebor',         x: 69.0, y: 51.0 },
      { name: "Baldur's Gate",    x: 58.0, y: 63.0 },
      { name: 'Beregost',         x: 58.0, y: 60.0 },
      { name: 'Nashkel',          x: 60.0, y: 66.0 },
      { name: 'Candlekeep',       x: 55.0, y: 67.0 },
      { name: 'Athkatla',         x: 61.0, y: 70.0 },
      // Northern Interior
      { name: 'Mirabar',          x: 59.0, y: 6.0  },
      { name: 'Icewind Dale',     x: 63.0, y: 4.0  },
      { name: 'Longsaddle',       x: 64.0, y: 22.0 },
      { name: 'Triboar',          x: 65.0, y: 28.0 },
      { name: 'Yartar',           x: 66.0, y: 29.0 },
      // Eastern Interior
      { name: 'Silverymoon',      x: 72.0, y: 13.0 },
      { name: 'Everlund',         x: 70.0, y: 18.0 },
      { name: 'Sundabar',         x: 76.0, y: 16.0 },
      { name: 'High Forest',      x: 70.0, y: 30.0 },
      { name: 'Anauroch',         x: 84.0, y: 15.0 },
      // Islands
      { name: 'Moonshae Isles',   x: 12.0, y: 52.0 },
      { name: 'Ruathym',          x: 33.0, y: 11.0 },
      { name: 'Mintarn',          x: 39.0, y: 23.0 },
      { name: 'The Purple Rocks', x: 26.0, y: 33.0 },
      { name: 'Gundarlun',        x: 35.0, y: 6.0  },
      { name: 'Tuern',            x: 42.0, y: 4.0  },
      { name: 'Norheim',          x: 10.0, y: 15.0 },
      { name: 'Norland',          x: 8.0,  y: 22.0 },
    ],
  },
]

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

interface PerMapState {
  scale: number
  offset: { x: number; y: number }
  search: string
  searchResults: { name: string; x: number; y: number }[]
  searchPin: { x: number; y: number; name: string } | null
}

const DEFAULT_MAP_STATES: PerMapState[] = MAP_CONFIGS.map((m) => ({
  scale: m.initScale,
  offset: { x: 20, y: 20 },
  search: '',
  searchResults: [],
  searchPin: null,
}))

export default function MapsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  const [activeMapId, setActiveMapId] = useState(0)
  const [mapStates, setMapStates] = useState<PerMapState[]>(DEFAULT_MAP_STATES)

  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [addingMode, setAddingMode] = useState(false)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [newMarker, setNewMarker] = useState({ title: '', description: '', color: '#f59e0b', icon: '📍' })
  const [savingMarker, setSavingMarker] = useState(false)

  const activeMap = MAP_CONFIGS[activeMapId]
  const ms = mapStates[activeMapId]

  const updateMS = useCallback((upd: Partial<PerMapState>) => {
    setMapStates((prev) => prev.map((s, i) => i === activeMapId ? { ...s, ...upd } : s))
  }, [activeMapId])

  // Load markers for current map
  const loadMarkers = useCallback(async () => {
    const { data, error } = await supabase
      .from('map_markers')
      .select('*, creator:profiles!map_markers_created_by_fkey(username)')
      .order('created_at', { ascending: false })

    if (data) {
      if (!error) {
        // filter by map_id (graceful: markers without map_id belong to map 0)
        const filtered = (data as MapMarker[]).filter((m) =>
          (m.map_id ?? 0) === activeMapId
        )
        setMarkers(filtered)
      }
    }
  }, [activeMapId, supabase])

  useEffect(() => {
    loadMarkers()
    const channel = supabase.channel(`map_markers_${activeMapId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, loadMarkers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeMapId, loadMarkers])

  // Non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.05 : -0.05
      setMapStates((prev) => prev.map((s, i) =>
        i === activeMapId
          ? { ...s, scale: Math.min(Math.max(s.scale + delta, 0.03), 4) }
          : s
      ))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [activeMapId])

  // Pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (addingMode) return
    isDraggingRef.current = true
    dragStartRef.current = { mx: e.clientX, my: e.clientY, ox: ms.offset.x, oy: ms.offset.y }
  }
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    setMapStates((prev) => prev.map((s, i) =>
      i === activeMapId
        ? { ...s, offset: { x: dragStartRef.current.ox + e.clientX - dragStartRef.current.mx, y: dragStartRef.current.oy + e.clientY - dragStartRef.current.my } }
        : s
    ))
  }, [activeMapId])
  const onMouseUp = () => { isDraggingRef.current = false }

  const onMapClick = (e: React.MouseEvent) => {
    if (!addingMode || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left - ms.offset.x) / ms.scale
    const py = (e.clientY - rect.top - ms.offset.y) / ms.scale
    setPendingPos({ x: (px / activeMap.w) * 100, y: (py / activeMap.h) * 100 })
  }

  const saveMarker = async () => {
    if (!pendingPos || !user || !newMarker.title.trim()) return
    setSavingMarker(true)
    const base = {
      title: newMarker.title.trim(),
      description: newMarker.description || null,
      x: pendingPos.x, y: pendingPos.y,
      color: newMarker.color, icon: newMarker.icon,
      created_by: user.id,
    }
    const { error } = await supabase.from('map_markers').insert({ ...base, map_id: activeMapId })
    if (error) {
      // Fallback if map_id column doesn't exist yet
      await supabase.from('map_markers').insert(base)
    }
    setPendingPos(null)
    setAddingMode(false)
    setNewMarker({ title: '', description: '', color: '#f59e0b', icon: '📍' })
    setSavingMarker(false)
  }

  const deleteMarker = async (id: string) => {
    if (!confirm('Markierung löschen?')) return
    await supabase.from('map_markers').delete().eq('id', id)
    setSelectedMarker(null)
  }

  const handleSearch = (val: string) => {
    const results = val.trim()
      ? activeMap.locations.filter((l) => l.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      : []
    updateMS({ search: val, searchResults: results })
  }

  const panTo = (loc: { x: number; y: number; name: string }) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    updateMS({
      offset: {
        x: rect.width  / 2 - (loc.x / 100) * activeMap.w * ms.scale,
        y: rect.height / 2 - (loc.y / 100) * activeMap.h * ms.scale,
      },
      search: '',
      searchResults: [],
      searchPin: { x: loc.x, y: loc.y, name: loc.name },
    })
  }

  const toScreen = (xPct: number, yPct: number) => ({
    x: (xPct / 100) * activeMap.w * ms.scale + ms.offset.x,
    y: (yPct / 100) * activeMap.h * ms.scale + ms.offset.y,
  })

  const switchMap = (id: number) => {
    setActiveMapId(id)
    setAddingMode(false)
    setPendingPos(null)
    setSelectedMarker(null)
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">

      {/* Map Tabs */}
      <div className="flex bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        {MAP_CONFIGS.map((cfg) => (
          <button
            key={cfg.id}
            onClick={() => switchMap(cfg.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeMapId === cfg.id
                ? 'border-amber-500 text-amber-300 bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {cfg.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap">
        <span className="text-xs text-zinc-500">{markers.length} Markierungen</span>

        {/* Per-map search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={ms.search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Ort auf ${activeMap.name} suchen…`}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          {ms.searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl">
              {ms.searchResults.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => panTo(loc)}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  📍 {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search pin clear */}
        {ms.searchPin && (
          <button
            onClick={() => updateMS({ searchPin: null })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/40 text-xs text-amber-300 hover:bg-amber-600/30 transition-colors"
          >
            <X className="w-3 h-3" />
            {ms.searchPin.name}
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setMapStates((prev) => prev.map((s, i) => i === activeMapId ? { ...s, scale: Math.min(s.scale + 0.05, 4) } : s))}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapStates((prev) => prev.map((s, i) => i === activeMapId ? { ...s, scale: Math.max(s.scale - 0.05, 0.03) } : s))}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-600 px-1">{Math.round(ms.scale * 100)}%</span>
          <button
            onClick={() => { setAddingMode(!addingMode); setPendingPos(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-1 ${addingMode ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {addingMode ? <><X className="w-3.5 h-3.5" /> Abbrechen</> : <><Plus className="w-3.5 h-3.5" /> Markierung</>}
          </button>
        </div>
      </div>

      {addingMode && !pendingPos && (
        <div className="bg-amber-600/10 border-b border-amber-600/20 px-4 py-2 text-xs text-amber-300 flex-shrink-0">
          Klicke auf die Karte um eine Markierung zu setzen.
        </div>
      )}

      {/* Map Container */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-zinc-950 ${addingMode ? 'cursor-crosshair' : 'cursor-grab'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onMapClick}
      >
        {/* Map Image */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(${ms.offset.x}px, ${ms.offset.y}px) scale(${ms.scale})`,
            transformOrigin: '0 0',
            width: activeMap.w,
            height: activeMap.h,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeMap.url}
            alt={activeMap.name}
            width={activeMap.w}
            height={activeMap.h}
            draggable={false}
            className="block select-none"
            style={{ width: activeMap.w, height: activeMap.h }}
          />
        </div>

        {/* Existing Markers */}
        {markers.map((m) => {
          const pos = toScreen(m.x, m.y)
          return (
            <button
              key={m.id}
              onClick={(e) => { e.stopPropagation(); if (!addingMode) setSelectedMarker(m) }}
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
              {/* Exact position pin */}
              <div
                className="w-2.5 h-2.5 rounded-full border-2 border-white/60 mt-0.5 shadow-md"
                style={{ backgroundColor: m.color }}
              />
            </button>
          )
        })}

        {/* Search Pin */}
        {ms.searchPin && (() => {
          const pos = toScreen(ms.searchPin.x, ms.searchPin.y)
          return (
            <div
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
              className="absolute z-15 flex flex-col items-center pointer-events-none"
            >
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg whitespace-nowrap animate-pulse mb-0.5">
                {ms.searchPin.name}
              </span>
              <span className="text-2xl drop-shadow-lg">📍</span>
              <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_rgba(245,158,11,0.9)] mt-0.5" />
            </div>
          )
        })()}

        {/* Pending marker preview */}
        {pendingPos && (() => {
          const pos = toScreen(pendingPos.x, pendingPos.y)
          return (
            <div
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
              className="absolute z-20 flex flex-col items-center pointer-events-none"
            >
              <span className="text-2xl animate-bounce">{newMarker.icon}</span>
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white bg-amber-500 mt-0.5" />
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
              onClick={() => panTo({ x: selectedMarker.x, y: selectedMarker.y, name: selectedMarker.title })}
              className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
            >
              Zentrieren
            </button>
            {(isGM || selectedMarker.created_by === user?.id) && (
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

      {/* New Marker Form */}
      {pendingPos && (
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
              disabled={savingMarker || !newMarker.title.trim()}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
            >
              {savingMarker ? 'Speichern...' : 'Markierung setzen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
