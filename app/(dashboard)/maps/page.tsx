'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Plus, Trash2, X, ZoomIn, ZoomOut, Search, Move, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

const MAP_URL = '/faerun-map.jpg'
const MAP_W = 4096
const MAP_H = 3072

const KNOWN_LOCATIONS = [
  // Sword Coast & The North
  { name: 'Waterdeep',           x: 18.6, y: 28.3 },
  { name: 'Neverwinter',         x: 14.2, y: 17.2 },
  { name: 'Luskan',              x: 16.1, y: 15.5 },
  { name: 'Port Llast',          x: 13.9, y: 19.5 },
  { name: 'Leilon',              x: 13.5, y: 22.5 },
  { name: 'Daggerford',          x: 17.1, y: 33.9 },
  { name: 'Baldur\'s Gate',      x: 16.8, y: 50.0 },
  { name: 'Candlekeep',          x: 16.5, y: 53.5 },
  // The North & Silver Marches
  { name: 'Mirabar',             x: 19.3, y: 11.7 },
  { name: 'Mithral Hall',        x: 28.1, y: 19.2 },
  { name: 'Silverymoon',         x: 33.2, y: 15.6 },
  { name: 'Everlund',            x: 31.0, y: 17.3 },
  { name: 'Sundabar',            x: 36.1, y: 16.1 },
  { name: 'Citadel Adbar',       x: 38.6, y: 12.0 },
  { name: 'Longsaddle',          x: 23.8, y: 23.8 },
  { name: 'Triboar',             x: 25.6, y: 26.7 },
  { name: 'Yartar',              x: 26.0, y: 27.7 },
  { name: 'Secomber',            x: 25.9, y: 33.9 },
  { name: 'Deadsnows',           x: 28.5, y: 16.0 },
  // Icewind Dale
  { name: 'Bryn Shander',        x: 24.0, y: 6.0  },
  { name: 'Icewind Dale',        x: 22.0, y: 5.0  },
  // Western Heartlands
  { name: 'Elturel',             x: 26.9, y: 46.9 },
  { name: 'Berdusk',             x: 28.1, y: 45.9 },
  { name: 'Scornubel',           x: 25.9, y: 44.8 },
  { name: 'Iriaebor',            x: 33.7, y: 44.1 },
  { name: 'Darkhold',            x: 36.5, y: 40.5 },
  // Amn, Tethyr, Calimshan
  { name: 'Athkatla',            x: 21.0, y: 57.0 },
  { name: 'Nashkel',             x: 19.8, y: 54.7 },
  { name: 'Zazesspur',           x: 18.3, y: 61.8 },
  { name: 'Memnon',              x: 20.0, y: 63.5 },
  { name: 'Calimport',           x: 21.2, y: 70.0 },
  // Moonsea & Zhentarim
  { name: 'Zhentil Keep',        x: 47.9, y: 25.4 },
  { name: 'Phlan',               x: 48.6, y: 25.9 },
  { name: 'Hillsfar',            x: 49.8, y: 28.0 },
  { name: 'Mulmaster',           x: 55.7, y: 26.0 },
  { name: 'Melvaunt',            x: 54.9, y: 25.1 },
  // Cormyr & Dales
  { name: 'Suzail',              x: 49.8, y: 38.1 },
  { name: 'Arabel',              x: 48.6, y: 32.9 },
  { name: 'Tilverton',           x: 49.6, y: 32.6 },
  { name: 'Marsember',           x: 51.5, y: 40.0 },
  { name: 'Shadowdale',          x: 51.0, y: 32.1 },
  { name: 'Myth Drannor',        x: 52.5, y: 30.5 },
  // Sembia
  { name: 'Ordulin',             x: 53.2, y: 35.2 },
  { name: 'Selgaunt',            x: 54.7, y: 38.9 },
  { name: 'Saerloon',            x: 53.7, y: 41.0 },
  { name: 'Daerlun',             x: 52.5, y: 35.5 },
  // Turmish & Dragon Coast
  { name: 'Alaghôn',             x: 51.5, y: 45.1 },
  { name: 'Westgate',            x: 49.0, y: 44.0 },
  // Chessenta
  { name: 'Luthcheq',            x: 60.1, y: 41.7 },
  { name: 'Airspur',             x: 63.5, y: 43.0 },
  { name: 'Cimbar',              x: 60.5, y: 44.0 },
  // Thay
  { name: 'Eltabbar',            x: 68.8, y: 26.7 },
  { name: 'Bezantur',            x: 66.4, y: 33.2 },
  { name: 'Tyraturos',           x: 64.0, y: 29.1 },
  { name: 'Pyarados',            x: 67.6, y: 27.5 },
  // Aglarond & Rashemen
  { name: 'Velprintalar',        x: 71.8, y: 34.0 },
  { name: 'Immilmar',            x: 70.1, y: 19.4 },
  { name: 'Thesk',               x: 74.5, y: 24.7 },
  // Unther & Mulhorand
  { name: 'Unthalass',           x: 63.5, y: 50.0 },
  { name: 'Messemprar',          x: 66.2, y: 50.1 },
  { name: 'Skuld',               x: 67.6, y: 60.9 },
  // The Shaar & South
  { name: 'The Shaar',           x: 57.1, y: 68.0 },
  { name: 'Lapaliiya',           x: 44.2, y: 72.3 },
  { name: 'Halruaa',             x: 46.9, y: 77.8 },
  { name: 'Dambrath',            x: 52.2, y: 79.4 },
  { name: 'Luiren',              x: 46.2, y: 81.7 },
  // Anauroch
  { name: 'Anauroch',            x: 44.9, y: 14.6 },
  // Narfell & Hordelands
  { name: 'Narfell',             x: 68.0, y: 15.0 },
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
  creator?: { username: string }
}

export default function MapsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  // Pan/zoom state
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.28)
  const [offset, setOffset] = useState({ x: 20, y: 20 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  // Markers
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [addingMode, setAddingMode] = useState(false)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [newMarker, setNewMarker] = useState({ title: '', description: '', color: '#f59e0b', icon: '📍' })
  const [savingMarker, setSavingMarker] = useState(false)

  // Search
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<typeof KNOWN_LOCATIONS>([])

  useEffect(() => {
    loadMarkers()
    const channel = supabase.channel('map_markers_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, loadMarkers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.06 : -0.06
      setScale((s) => Math.min(Math.max(s + delta, 0.1), 3))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const loadMarkers = async () => {
    const { data } = await supabase
      .from('map_markers')
      .select('*, creator:profiles!map_markers_created_by_fkey(username)')
      .order('created_at', { ascending: false })
    if (data) setMarkers(data as MapMarker[])
  }

  // Mouse pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (addingMode) return
    isDraggingRef.current = true
    dragStartRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    setOffset({
      x: dragStartRef.current.ox + e.clientX - dragStartRef.current.mx,
      y: dragStartRef.current.oy + e.clientY - dragStartRef.current.my,
    })
  }, [])
  const onMouseUp = () => { isDraggingRef.current = false }

  // Click to place marker
  const onMapClick = (e: React.MouseEvent) => {
    if (!addingMode || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left - offset.x) / scale
    const py = (e.clientY - rect.top - offset.y) / scale
    setPendingPos({ x: (px / MAP_W) * 100, y: (py / MAP_H) * 100 })
  }

  const saveMarker = async () => {
    if (!pendingPos || !user || !newMarker.title.trim()) return
    setSavingMarker(true)
    await supabase.from('map_markers').insert({
      title: newMarker.title.trim(),
      description: newMarker.description || null,
      x: pendingPos.x, y: pendingPos.y,
      color: newMarker.color, icon: newMarker.icon,
      created_by: user.id,
    })
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
    setSearch(val)
    if (!val.trim()) { setSearchResults([]); return }
    setSearchResults(KNOWN_LOCATIONS.filter((l) => l.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
  }

  const panTo = (loc: { x: number; y: number; name?: string }) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setOffset({
      x: rect.width  / 2 - (loc.x / 100) * MAP_W * scale,
      y: rect.height / 2 - (loc.y / 100) * MAP_H * scale,
    })
    setSearchResults([])
    setSearch('')
  }

  const toScreen = (xPct: number, yPct: number) => ({
    x: (xPct / 100) * MAP_W * scale + offset.x,
    y: (yPct / 100) * MAP_H * scale + offset.y,
  })

  if (!user) return null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 mr-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-zinc-200">Faerûn</span>
          <span className="text-xs text-zinc-500 ml-1">{markers.length} Markierungen</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text" value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ort suchen..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl">
              {searchResults.map((loc) => (
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

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setScale((s) => Math.min(s + 0.1, 3))} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors" title="Reinzoomen">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setScale((s) => Math.max(s - 0.1, 0.1))} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors" title="Rauszoomen">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-600 px-1">{Math.round(scale * 100)}%</span>
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
        className={`flex-1 relative overflow-hidden bg-zinc-950 ${addingMode ? 'cursor-crosshair' : isDraggingRef.current ? 'cursor-grabbing' : 'cursor-grab'}`}
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
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: MAP_W,
            height: MAP_H,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_URL}
            alt="Faerûn Karte"
            width={MAP_W}
            height={MAP_H}
            draggable={false}
            className="block select-none"
            style={{ width: MAP_W, height: MAP_H }}
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
            </button>
          )
        })}

        {/* Pending marker */}
        {pendingPos && (() => {
          const pos = toScreen(pendingPos.x, pendingPos.y)
          return (
            <div style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }} className="absolute z-20 text-2xl animate-bounce pointer-events-none">
              {newMarker.icon}
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
              onClick={() => panTo({ x: selectedMarker.x, y: selectedMarker.y })}
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

            {/* Icon auswählen */}
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Icon</p>
              <div className="flex flex-wrap gap-1">
                {MARKER_ICONS.map((ico) => (
                  <button
                    key={ico} type="button"
                    onClick={() => setNewMarker((p) => ({ ...p, icon: ico }))}
                    className={`w-7 h-7 rounded text-base flex items-center justify-center transition-colors ${newMarker.icon === ico ? 'bg-amber-600/40 ring-1 ring-amber-500' : 'hover:bg-zinc-700'}`}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>

            {/* Farbe auswählen */}
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Farbe</p>
              <div className="flex gap-2 flex-wrap">
                {MARKER_COLORS.map((c) => (
                  <button
                    key={c.val} type="button"
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
