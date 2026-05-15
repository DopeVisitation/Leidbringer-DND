'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapPin, Plus, Trash2, X, ZoomIn, ZoomOut, Search, Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Sword Coast Map ──────────────────────────────────────────────────────────
const MAP = {
  id: 2,                          // bleibt aus historischen Gründen 2 (siehe schema_v4)
  name: 'Sword Coast',
  url: '/sword-coast.jpg',
  w: 10200, h: 6600,
  initScale: 0.14,
}

// Eingebaute Orte — Koordinaten = Mitte der Beschriftung / Pin-Punkt aus der Karte
const BUILTIN_LOCATIONS: { name: string; x: number; y: number }[] = [
  // ── Sword Coast North & Icewind Dale ───────────────────────────────────
  { name: 'Luskan',              x: 53.5, y: 9.0  },
  { name: 'Neverwinter',         x: 52.0, y: 13.5 },
  { name: 'Port Llast',          x: 51.5, y: 17.0 },
  { name: "Helm's Hold",         x: 53.0, y: 18.0 },
  { name: 'Thundertree',         x: 51.5, y: 19.5 },
  { name: 'Leilon',              x: 52.0, y: 21.5 },
  { name: 'Phandalin',           x: 56.5, y: 24.5 },
  { name: 'Wave Echo Cave',      x: 58.0, y: 26.5 },
  { name: 'Conyberry',           x: 60.5, y: 24.0 },
  { name: 'Old Owl Well',        x: 61.0, y: 23.5 },
  { name: 'Mount Hotenow',       x: 55.0, y: 16.0 },
  { name: 'Gauntlgrym',          x: 56.5, y: 15.5 },
  { name: "Morgur's Mound",      x: 56.5, y: 17.0 },
  { name: 'Blackford Crossing',  x: 53.5, y: 15.0 },
  { name: 'Raven Rock',          x: 53.5, y: 12.0 },
  { name: 'Neverwinter Wood',    x: 54.0, y: 18.5 },
  { name: 'Mere of Dead Men',    x: 53.0, y: 25.0 },
  { name: 'Thornhold',           x: 53.5, y: 26.0 },

  // ── Waterdeep / Heartlands North ───────────────────────────────────────
  { name: 'Waterdeep',           x: 55.5, y: 30.5 },
  { name: 'Amphail',             x: 56.5, y: 33.5 },
  { name: 'Red Larch',           x: 58.0, y: 35.5 },
  { name: 'Goldenfields',        x: 58.5, y: 32.5 },
  { name: 'Westbridge',          x: 56.5, y: 29.5 },
  { name: 'Bargewright Inn',     x: 57.5, y: 28.0 },
  { name: 'Triboar',             x: 48.0, y: 25.0 },
  { name: 'Yartar',              x: 51.0, y: 27.0 },
  { name: 'Longsaddle',          x: 47.0, y: 19.0 },
  { name: 'Sword Mountains',     x: 53.0, y: 28.0 },
  { name: 'Stone Stand',         x: 59.5, y: 17.5 },
  { name: 'The Long Road',       x: 50.0, y: 22.0 },

  // ── Middle Sword Coast ─────────────────────────────────────────────────
  { name: 'Daggerford',          x: 48.0, y: 40.0 },
  { name: 'Secomber',            x: 52.0, y: 36.0 },
  { name: 'Dragonspear Castle',  x: 51.5, y: 47.5 },
  { name: 'Misty Forest',        x: 53.0, y: 42.0 },
  { name: 'Trollbark Forest',    x: 52.0, y: 47.0 },
  { name: "Warlock's Crypt",     x: 50.0, y: 50.5 },
  { name: 'Trielta Hills',       x: 61.0, y: 58.0 },
  { name: 'Olfhumbo',            x: 48.0, y: 47.0 },

  // ── Baldur's Gate Region ───────────────────────────────────────────────
  { name: 'Boareskyr Bridge',    x: 57.0, y: 55.5 },
  { name: 'Trollclaw Ford',      x: 53.0, y: 56.5 },
  { name: 'The Trollclaws',      x: 53.5, y: 54.5 },
  { name: 'Soubar',              x: 53.5, y: 60.0 },
  { name: "Baldur's Gate",       x: 51.5, y: 64.0 },
  { name: 'Beregost',            x: 52.0, y: 67.0 },
  { name: 'Nashkel',             x: 53.0, y: 71.0 },
  { name: 'Candlekeep',          x: 50.0, y: 71.0 },
  { name: 'Cloakwood',           x: 50.0, y: 67.5 },
  { name: 'Wood of Sharp Teeth', x: 56.5, y: 67.5 },
  { name: 'Fort Morninglord',    x: 57.5, y: 63.0 },
  { name: 'River Chionthar',     x: 54.5, y: 62.0 },
  { name: 'The Fields of the Dead', x: 56.0, y: 58.5 },

  // ── Elturgard / Western Heartlands ─────────────────────────────────────
  { name: 'Elturel',             x: 58.0, y: 62.0 },
  { name: 'Elturgard',           x: 58.0, y: 65.0 },
  { name: 'Scornubel',           x: 60.5, y: 58.0 },
  { name: 'Berdusk',             x: 63.0, y: 67.0 },
  { name: 'Iriaebor',            x: 67.0, y: 70.0 },
  { name: 'Hardbuckler',         x: 64.5, y: 59.5 },
  { name: 'Easting',             x: 70.0, y: 70.0 },
  { name: 'Proskur',             x: 72.0, y: 67.0 },
  { name: 'Elversult',           x: 75.0, y: 71.0 },
  { name: 'Marsember',           x: 74.0, y: 67.0 },
  { name: 'Priapurl',            x: 72.0, y: 70.0 },
  { name: 'Najara',              x: 60.0, y: 51.0 },
  { name: 'Forest of Wyrms',     x: 60.0, y: 54.0 },

  // ── Icewind Dale (Ten Towns) ───────────────────────────────────────────
  { name: 'Icewind Dale',        x: 63.0, y: 4.0  },
  { name: 'Bryn Shander',        x: 64.0, y: 5.0  },
  { name: 'Targos',              x: 63.5, y: 4.0  },
  { name: 'Termalaine',          x: 63.0, y: 3.5  },
  { name: 'Lonelywood',          x: 62.0, y: 3.0  },
  { name: 'Caer-Konig',          x: 65.5, y: 4.0  },
  { name: 'Caer-Dineval',        x: 65.0, y: 4.5  },
  { name: 'Easthaven',           x: 65.5, y: 5.5  },
  { name: "Dougan's Hole",       x: 65.0, y: 6.5  },
  { name: 'Reghed Glacier',      x: 65.0, y: 1.5  },
  { name: 'Sea of Moving Ice',   x: 62.0, y: 2.5  },
  { name: 'Spine of the World',  x: 50.0, y: 9.5  },
  { name: 'Great Worm Cavern',   x: 50.0, y: 9.0  },
  { name: 'The Lurkwood',        x: 50.0, y: 12.0 },
  { name: 'Kingdom of Many Arrows', x: 54.0, y: 7.5  },
  { name: 'River Mirar',         x: 47.0, y: 11.0 },
  { name: 'River Surbrin',       x: 56.0, y: 11.0 },
  { name: 'Cold Wood',           x: 60.0, y: 11.0 },
  { name: "Beorunna's Well",     x: 60.0, y: 11.5 },

  // ── Silver Marches ─────────────────────────────────────────────────────
  { name: 'Silverymoon',         x: 54.0, y: 17.0 },
  { name: 'Everlund',            x: 53.5, y: 18.5 },
  { name: 'Sundabar',            x: 62.0, y: 16.5 },
  { name: 'Mithral Hall',        x: 53.0, y: 15.5 },
  { name: 'Citadel Adbar',       x: 63.0, y: 11.0 },
  { name: 'Citadel Felbarr',     x: 60.0, y: 14.0 },
  { name: 'Menzoberranzan',      x: 55.5, y: 15.5 },
  { name: 'Settlestone',         x: 53.0, y: 14.5 },
  { name: 'One Stone',           x: 55.5, y: 14.0 },
  { name: 'Quaervarr',           x: 54.5, y: 16.0 },
  { name: 'River Rauvin',        x: 57.0, y: 16.5 },
  { name: 'Hellgate Keep',       x: 49.0, y: 19.0 },
  { name: 'The Evermoors',       x: 51.0, y: 19.5 },
  { name: 'Castle Hartwick',     x: 63.0, y: 6.5  },
  { name: 'Hartsvale',           x: 67.0, y: 6.5  },
  { name: 'The Spires',          x: 64.0, y: 8.5  },
  { name: 'Ascore',              x: 66.0, y: 13.5 },
  { name: 'Arn Forest',          x: 63.0, y: 15.0 },
  { name: 'Nether Mountains',    x: 64.0, y: 16.0 },

  // ── High Forest & Anauroch ─────────────────────────────────────────────
  { name: 'The High Forest',     x: 58.0, y: 25.0 },
  { name: 'Star Mounts',         x: 53.0, y: 28.0 },
  { name: 'Karse',               x: 57.0, y: 26.0 },
  { name: 'Unicorn Run',         x: 55.0, y: 30.0 },
  { name: 'Southwood',           x: 60.0, y: 22.0 },
  { name: 'Grandfather Tree',    x: 54.0, y: 22.0 },
  { name: 'Delimbiyr River',     x: 51.0, y: 36.5 },
  { name: 'Anauroch',            x: 76.0, y: 39.5 },
  { name: 'The High Ice',        x: 78.0, y: 12.0 },
  { name: 'The Frozen Sea',      x: 67.0, y: 23.0 },
  { name: 'The Far Forest',      x: 64.0, y: 20.0 },
  { name: 'The Plain of Standing Stones', x: 75.0, y: 30.0 },

  // ── Loudwater / Heartlands East ────────────────────────────────────────
  { name: 'Loudwater',           x: 64.0, y: 32.0 },
  { name: 'Llorkh',              x: 67.0, y: 36.0 },
  { name: 'Asbravn',             x: 60.0, y: 53.0 },

  // ── High Moor & Eastern Sword Coast ────────────────────────────────────
  { name: 'The High Moor',       x: 57.0, y: 45.0 },
  { name: 'Orogoth',             x: 57.5, y: 43.5 },
  { name: 'Serpent Hills',       x: 60.0, y: 47.0 },
  { name: 'Marsh of Chelimber',  x: 65.0, y: 41.0 },
  { name: 'Greycloak Hills',     x: 68.0, y: 41.0 },
  { name: 'Evereska',            x: 69.0, y: 47.0 },
  { name: 'Sunset Mountains',    x: 67.5, y: 66.0 },
  { name: 'The Storm Horns',     x: 80.0, y: 70.0 },
  { name: 'Darkhold',            x: 70.0, y: 60.0 },
  { name: 'Lake of Dragons',     x: 76.0, y: 68.0 },
  { name: 'The Far Hills',       x: 66.0, y: 60.0 },
  { name: 'The Reaching Woods',  x: 64.0, y: 64.0 },
  { name: 'Cornubel',            x: 63.0, y: 62.0 },
  { name: 'Battle of Bones',     x: 80.0, y: 65.0 },

  // ── Amn / Tethyr (south) ───────────────────────────────────────────────
  { name: 'Athkatla',            x: 60.0, y: 80.0 },
  { name: 'Crimmor',             x: 58.5, y: 78.0 },
  { name: 'Esmeltaran',          x: 61.0, y: 82.0 },
  { name: 'Murann',              x: 54.0, y: 84.0 },
  { name: 'Trademeet',           x: 62.0, y: 81.0 },
  { name: 'Imnesvale',           x: 60.0, y: 80.5 },
  { name: 'The Cloud Peaks',     x: 56.0, y: 80.0 },
  { name: 'The Small Teeth',     x: 56.0, y: 84.0 },
  { name: 'Forest of Tethir',    x: 62.0, y: 88.0 },
  { name: 'Troll Mountains',     x: 69.0, y: 76.0 },
  { name: 'The Snakewood',       x: 64.0, y: 80.0 },
  { name: 'Shilmista Forest',    x: 70.0, y: 84.0 },
  { name: 'Snowflake Mountains', x: 73.0, y: 87.0 },
  { name: 'Tejarn Hills',        x: 64.0, y: 88.0 },
  { name: "The Giant's Plain",   x: 73.0, y: 78.0 },
  { name: 'Green Fields',        x: 64.0, y: 75.0 },
  { name: 'Riatavin',            x: 67.0, y: 88.0 },
  { name: "Giant's Run Mountains", x: 78.0, y: 78.0 },

  // ── Inseln (Moonshae, Nelanthor) ───────────────────────────────────────
  { name: 'Moonshae Isles',      x: 35.0, y: 45.0 },
  { name: 'Caer Callidyrr',      x: 36.0, y: 35.0 },
  { name: 'Caer Corwell',        x: 35.0, y: 49.5 },
  { name: 'Iron Keep',           x: 34.0, y: 38.0 },
  { name: 'Alaron',              x: 40.0, y: 41.0 },
  { name: 'Llewellyn',           x: 39.5, y: 43.0 },
  { name: 'Snowdown',            x: 42.0, y: 51.5 },
  { name: 'Gwynneth',            x: 34.5, y: 48.0 },
  { name: 'Moray',               x: 31.0, y: 47.5 },
  { name: "Oman's Isle",         x: 33.0, y: 42.5 },
  { name: 'Norland',             x: 28.0, y: 38.0 },
  { name: 'Sea of Moonshae',     x: 36.0, y: 39.0 },
  { name: 'Northlander Isles',   x: 37.0, y: 27.0 },
  { name: 'Korinn Archipelago',  x: 41.0, y: 30.0 },
  { name: 'The Whale Bones',     x: 39.0, y: 24.0 },
  { name: 'Ruathym',             x: 32.0, y: 27.0 },
  { name: 'Mintarn',             x: 41.0, y: 55.0 },
  { name: 'The Purple Rocks',    x: 39.0, y: 16.0 },
  { name: 'Gundarlun',           x: 34.0, y: 22.0 },
  { name: 'Tuern',               x: 27.0, y: 10.0 },
  { name: 'Skadaurak',           x: 53.0, y: 47.0 },
  { name: 'Orlumbor',            x: 48.0, y: 47.0 },
  { name: 'The Nelanther',       x: 47.0, y: 70.0 },

  // ── Meere & Hauptregionen ──────────────────────────────────────────────
  { name: 'Sword Coast',         x: 49.0, y: 55.0 },
  { name: 'Sea of Swords',       x: 44.0, y: 60.0 },
  { name: 'Trackless Sea',       x: 28.0, y: 50.0 },
  { name: 'The Endless Ice Sea', x: 53.0, y: 2.0  },

  // ── Östlicher Rand (Daleland / Sembia / Cormyr) ────────────────────────
  { name: 'Sembia',              x: 92.0, y: 70.0 },
  { name: 'Cormyr',              x: 85.0, y: 65.0 },
  { name: 'The Dragonmere',      x: 88.0, y: 68.0 },
  { name: 'Westgate',            x: 86.0, y: 77.0 },
  { name: 'Hillsfar',            x: 93.0, y: 50.0 },
  { name: 'Zhentil Keep',        x: 89.0, y: 49.0 },
  { name: 'Cormanthor',          x: 92.0, y: 55.0 },
  { name: 'Myth Drannor',        x: 91.0, y: 56.0 },
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

  const [scale, setScale] = useState(MAP.initScale)
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

  // ── Daten laden ───────────────────────────────────────────────────────────
  const loadMarkers = useCallback(async () => {
    const { data } = await supabase
      .from('map_markers')
      .select('*, creator:profiles!map_markers_created_by_fkey(username)')
      .order('created_at', { ascending: false })
    if (data) setMarkers((data as MapMarker[]).filter((m) => (m.map_id ?? 0) === MAP.id))
  }, [supabase])

  const loadCustomLocations = useCallback(async () => {
    const { data } = await supabase
      .from('custom_locations')
      .select('*, creator:profiles(username)')
      .eq('map_id', MAP.id)
      .order('created_at', { ascending: false })
    if (data) setCustomLocations(data as CustomLocation[])
  }, [supabase])

  useEffect(() => {
    loadMarkers()
    loadCustomLocations()
    const chMarkers = supabase.channel('map_markers_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, loadMarkers)
      .subscribe()
    const chCustom = supabase.channel('custom_locations_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_locations' }, loadCustomLocations)
      .subscribe()
    return () => {
      supabase.removeChannel(chMarkers)
      supabase.removeChannel(chCustom)
    }
  }, [loadMarkers, loadCustomLocations, supabase])

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
    if (addMode === 'none' || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left - offset.x) / scale
    const py = (e.clientY - rect.top - offset.y) / scale
    setPendingPos({ x: (px / MAP.w) * 100, y: (py / MAP.h) * 100 })
  }

  // ── Saving ────────────────────────────────────────────────────────────────
  const saveMarker = async () => {
    if (!pendingPos || !user || !newMarker.title.trim()) return
    setSaving(true)
    await supabase.from('map_markers').insert({
      title: newMarker.title.trim(),
      description: newMarker.description || null,
      x: pendingPos.x, y: pendingPos.y,
      color: newMarker.color, icon: newMarker.icon,
      created_by: user.id,
      map_id: MAP.id,
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
      map_id: MAP.id,
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

  // ── Search (kombiniert built-in + custom_locations + markers) ─────────────
  const allSearchable: SearchHit[] = useMemo(() => [
    ...BUILTIN_LOCATIONS.map((l) => ({ name: l.name, x: l.x, y: l.y, source: 'builtin' as const })),
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
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setOffset({
      x: rect.width  / 2 - (hit.x / 100) * MAP.w * scale,
      y: rect.height / 2 - (hit.y / 100) * MAP.h * scale,
    })
    setSearch('')
    setSearchResults([])
    setSearchPin({ x: hit.x, y: hit.y, name: hit.name })
  }

  const toScreen = (xPct: number, yPct: number) => ({
    x: (xPct / 100) * MAP.w * scale + offset.x,
    y: (yPct / 100) * MAP.h * scale + offset.y,
  })

  if (!user) return null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">

      {/* Header — kein Tab mehr, nur Titel */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <Compass className="w-4 h-4 text-amber-400" />
        <h1 className="text-sm font-bold text-amber-300">{MAP.name}</h1>
        <span className="text-xs text-zinc-500 ml-1">— Forgotten Realms</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap">
        <span className="text-xs text-zinc-500">
          {markers.length} Markierungen · {customLocations.length} eigene Orte
        </span>

        {/* Suche */}
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

          {/* Modus-Buttons */}
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
        {/* Map Image */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: MAP.w,
            height: MAP.h,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP.url}
            alt={MAP.name}
            width={MAP.w}
            height={MAP.h}
            draggable={false}
            className="block select-none"
            style={{ width: MAP.w, height: MAP.h }}
          />
        </div>

        {/* Existing Markers */}
        {markers.map((m) => {
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

        {/* Custom Locations (eigene Orte) */}
        {customLocations.map((loc) => {
          const pos = toScreen(loc.x, loc.y)
          return (
            <button
              key={loc.id}
              onClick={(e) => { e.stopPropagation(); if (addMode === 'none') setSelectedCustom(loc) }}
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              className="absolute z-10 group flex flex-col items-center hover:z-20"
            >
              <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white/80 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/40 text-[10px] text-emerald-100 whitespace-nowrap pointer-events-none">
                {loc.name}
              </span>
            </button>
          )
        })}

        {/* Search Pin — Punkt sitzt EXAKT auf der Ortsposition */}
        {searchPin && (() => {
          const pos = toScreen(searchPin.x, searchPin.y)
          return (
            <div
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              className="absolute z-30 pointer-events-none"
            >
              {/* Pulsierender Außenring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute w-10 h-10 rounded-full bg-amber-400/30 animate-ping" />
              </div>
              {/* Innerer Punkt */}
              <div className="relative w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.95)]" />
              {/* Name darüber */}
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
