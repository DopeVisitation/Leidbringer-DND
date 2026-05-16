'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tag, Plus, Search, Check, X, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

type Rarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact'

interface ItemPrice {
  id: string
  name: string
  rarity: Rarity
  price_gp: number
  note: string | null
  approved: boolean
  created_by: string
  created_at: string
  user: { username: string; role: string } | null
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string; border: string }> = {
  common:    { label: 'Gewöhnlich',   color: 'text-zinc-300',   bg: 'bg-zinc-700/40',    border: 'border-zinc-600/60' },
  uncommon:  { label: 'Ungewöhnlich', color: 'text-green-400',  bg: 'bg-green-900/20',   border: 'border-green-700/50' },
  rare:      { label: 'Selten',       color: 'text-blue-400',   bg: 'bg-blue-900/20',    border: 'border-blue-700/50' },
  very_rare: { label: 'Sehr Selten',  color: 'text-purple-400', bg: 'bg-purple-900/20',  border: 'border-purple-700/50' },
  legendary: { label: 'Legendär',     color: 'text-amber-400',  bg: 'bg-amber-900/20',   border: 'border-amber-700/50' },
  artifact:  { label: 'Artefakt',     color: 'text-red-400',    bg: 'bg-red-900/20',     border: 'border-red-700/50' },
}

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact']

function fmtGp(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString('de', { maximumFractionDigits: 1 })}k gp`
  return `${n.toLocaleString('de')} gp`
}

const SEED_ITEMS: { name: string; rarity: Rarity; price_gp: number; note?: string }[] = [
  { name: 'Heiltrank (Heilt 2d4+2)', rarity: 'common', price_gp: 50 },
  { name: 'Heiltrank, Groß (Heilt 4d4+4)', rarity: 'uncommon', price_gp: 100 },
  { name: 'Heiltrank, Superior (Heilt 8d4+8)', rarity: 'rare', price_gp: 500 },
  { name: 'Heiltrank, Überragend (Heilt 10d4+20)', rarity: 'very_rare', price_gp: 5000 },
  { name: 'Ölkrug der Glattheit', rarity: 'uncommon', price_gp: 300 },
  { name: 'Sack der Aufbewahrung', rarity: 'uncommon', price_gp: 4000 },
  { name: 'Handschuhe der Dieberei', rarity: 'uncommon', price_gp: 5000 },
  { name: 'Umhang des Schutzes', rarity: 'uncommon', price_gp: 3500 },
  { name: 'Hut der Verkleidung', rarity: 'uncommon', price_gp: 2000 },
  { name: 'Ring des Federfallens', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Stiefel der Elfenhaftigkeit', rarity: 'uncommon', price_gp: 2500 },
  { name: 'Stiefel der Schnelligkeit', rarity: 'rare', price_gp: 4000 },
  { name: 'Stiefel des fliegenden Schrittes', rarity: 'uncommon', price_gp: 2000 },
  { name: 'Armband der Gesundheit', rarity: 'uncommon', price_gp: 3000 },
  { name: 'Amulett der Gesundheit', rarity: 'rare', price_gp: 8000 },
  { name: 'Amulett der Beweisführung', rarity: 'uncommon', price_gp: 5000 },
  { name: 'Gürtel der Riesenstärke (Stein, STR 21)', rarity: 'rare', price_gp: 16000 },
  { name: 'Gürtel der Riesenstärke (Frost, STR 23)', rarity: 'very_rare', price_gp: 33000 },
  { name: 'Gürtel der Riesenstärke (Feuer, STR 25)', rarity: 'very_rare', price_gp: 33000 },
  { name: 'Gürtel der Riesenstärke (Wolken, STR 27)', rarity: 'legendary', price_gp: 80000 },
  { name: 'Gürtel der Riesenstärke (Storm, STR 29)', rarity: 'legendary', price_gp: 80000 },
  { name: 'Mantel der Unsichtbarkeit', rarity: 'legendary', price_gp: 80000 },
  { name: 'Mantel der Verlagerung', rarity: 'rare', price_gp: 60000 },
  { name: 'Kristallkugel', rarity: 'very_rare', price_gp: 50000 },
  { name: 'Trank der Unsichtbarkeit', rarity: 'uncommon', price_gp: 180 },
  { name: 'Trank der Geschwindigkeit', rarity: 'very_rare', price_gp: 400 },
  { name: 'Trank der Fliegerei', rarity: 'very_rare', price_gp: 500 },
  { name: 'Trank der Heldentat', rarity: 'rare', price_gp: 400 },
  { name: 'Trank des Atmens unter Wasser', rarity: 'uncommon', price_gp: 180 },
  { name: 'Trank der Stärke (Riese)', rarity: 'rare', price_gp: 250 },
  { name: 'Trank der Verjüngung', rarity: 'very_rare', price_gp: 500 },
  { name: 'Trank der Clairvoyance', rarity: 'rare', price_gp: 960 },
  { name: 'Trank des Lesens von Gedanken', rarity: 'rare', price_gp: 960 },
  { name: 'Trank der Langlebigkeit', rarity: 'very_rare', price_gp: 9000 },
  { name: 'Trank der Unsterblichkeit', rarity: 'legendary', price_gp: 180000 },
  { name: 'Zauberstab der Magieerkennung', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Zauberstab der Sicherheit', rarity: 'uncommon', price_gp: 2000 },
  { name: 'Zauberstab der Lähmung', rarity: 'rare', price_gp: 24000 },
  { name: 'Zauberstab der Ängstigung', rarity: 'rare', price_gp: 24000 },
  { name: 'Stab der Kraft', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Stab des Donnerschlags', rarity: 'very_rare', price_gp: 50000 },
  { name: 'Stab der Herrschaft', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Schwert des Rächers', rarity: 'uncommon', price_gp: 5000 },
  { name: 'Schwert der Verwundung', rarity: 'rare', price_gp: 24000 },
  { name: 'Schwert der Lebenskraft', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Vipernklinge', rarity: 'rare', price_gp: 24000 },
  { name: 'Frostriese-Killer', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Vorpal-Schwert', rarity: 'legendary', price_gp: 24000 },
  { name: 'Mace of Disruption', rarity: 'rare', price_gp: 24000 },
  { name: 'Mace of Smiting', rarity: 'rare', price_gp: 16000 },
  { name: 'Mace of Terror', rarity: 'rare', price_gp: 16000 },
  { name: 'Eisenkern-Rüstung +1', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Eisenkern-Rüstung +2', rarity: 'rare', price_gp: 6000 },
  { name: 'Eisenkern-Rüstung +3', rarity: 'very_rare', price_gp: 24000 },
  { name: 'Rüstung der Verwundbarkeit', rarity: 'rare', price_gp: 7200, note: 'Verflucht' },
  { name: 'Rüstung der Nicht-Angreifbarkeit', rarity: 'legendary', price_gp: 80000 },
  { name: 'Adamantit-Rüstung', rarity: 'uncommon', price_gp: 500 },
  { name: 'Mithril-Rüstung', rarity: 'uncommon', price_gp: 1000 },
  { name: 'Schild +1', rarity: 'uncommon', price_gp: 1000 },
  { name: 'Schild +2', rarity: 'rare', price_gp: 4000 },
  { name: 'Schild +3', rarity: 'very_rare', price_gp: 16000 },
  { name: 'Schild der Anziehung', rarity: 'rare', price_gp: 6000, note: 'Verflucht' },
  { name: 'Schild der Magiepfeile', rarity: 'rare', price_gp: 16000 },
  { name: 'Handschuhe des Ogergripps', rarity: 'uncommon', price_gp: 800 },
  { name: 'Handschuhe des Schwimmens und Kletterns', rarity: 'uncommon', price_gp: 2000 },
  { name: 'Handschuhe des Meteoritenschlags', rarity: 'very_rare', price_gp: 33000 },
  { name: 'Ring des Eingreifens', rarity: 'uncommon', price_gp: 3500 },
  { name: 'Ring des Eingreifens +1', rarity: 'rare', price_gp: 5000 },
  { name: 'Ring des Eingreifens +2', rarity: 'very_rare', price_gp: 16000 },
  { name: 'Ring des Eingreifens +3', rarity: 'legendary', price_gp: 80000 },
  { name: 'Ring der Beherrschung von Tieren', rarity: 'uncommon', price_gp: 5000 },
  { name: 'Ring des Feuerschadens', rarity: 'rare', price_gp: 5000 },
  { name: 'Ring der Regeneration', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Ring der Telekinese', rarity: 'very_rare', price_gp: 90000 },
  { name: 'Ring der Drei Wünsche', rarity: 'legendary', price_gp: 97000 },
  { name: 'Auge des Adlers', rarity: 'uncommon', price_gp: 2500 },
  { name: 'Elfenboote', rarity: 'uncommon', price_gp: 2500 },
  { name: 'Gauntlets of Ogre Power', rarity: 'uncommon', price_gp: 800 },
  { name: 'Eimer der endlosen Wasser', rarity: 'uncommon', price_gp: 400 },
  { name: 'Netz des Fangens', rarity: 'rare', price_gp: 4000 },
  { name: 'Decke des Nützens', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Teppich des Fliegens (3×5 ft)', rarity: 'very_rare', price_gp: 20000 },
  { name: 'Teppich des Fliegens (4×6 ft)', rarity: 'very_rare', price_gp: 27000 },
  { name: 'Teppich des Fliegens (6×9 ft)', rarity: 'very_rare', price_gp: 40000 },
  { name: 'Mantel der vielen Falten', rarity: 'uncommon', price_gp: 500 },
  { name: 'Buch des exaltierten Tuns', rarity: 'legendary', price_gp: 50000 },
  { name: 'Buch der bösen Taten', rarity: 'legendary', price_gp: 50000 },
  { name: 'Buch der verlorenen Seele', rarity: 'legendary', price_gp: 50000 },
  { name: 'Pergament der Macht', rarity: 'common', price_gp: 75 },
  { name: 'Zauberschriftrolle (Stufenzauber 1)', rarity: 'common', price_gp: 75 },
  { name: 'Zauberschriftrolle (Stufenzauber 2)', rarity: 'uncommon', price_gp: 150 },
  { name: 'Zauberschriftrolle (Stufenzauber 3)', rarity: 'uncommon', price_gp: 300 },
  { name: 'Zauberschriftrolle (Stufenzauber 4)', rarity: 'uncommon', price_gp: 500 },
  { name: 'Zauberschriftrolle (Stufenzauber 5)', rarity: 'rare', price_gp: 1000 },
  { name: 'Zauberschriftrolle (Stufenzauber 6)', rarity: 'rare', price_gp: 2000 },
  { name: 'Zauberschriftrolle (Stufenzauber 7)', rarity: 'very_rare', price_gp: 4000 },
  { name: 'Zauberschriftrolle (Stufenzauber 8)', rarity: 'very_rare', price_gp: 8000 },
  { name: 'Zauberschriftrolle (Stufenzauber 9)', rarity: 'legendary', price_gp: 16000 },
  { name: 'Schriftrolle der Schutzes', rarity: 'rare', price_gp: 3000 },
  { name: 'Schriftrolle der Vielseitigkeit', rarity: 'very_rare', price_gp: 5000 },
  { name: 'Schriftrolle von Piqued Wishes', rarity: 'legendary', price_gp: 44000 },
  { name: 'Drachenschuppenpanzer', rarity: 'very_rare', price_gp: 4000 },
  { name: 'Elfenrüstung', rarity: 'rare', price_gp: 6000 },
  { name: 'Brooch of Shielding', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Medallion of Thoughts', rarity: 'uncommon', price_gp: 3000 },
  { name: 'Necklace of Adaptation', rarity: 'uncommon', price_gp: 1500 },
  { name: 'Necklace of Fireballs', rarity: 'rare', price_gp: 16000 },
  { name: 'Necklace of Prayer Beads', rarity: 'rare', price_gp: 24000 },
  { name: 'Periapt of Health', rarity: 'uncommon', price_gp: 2500 },
  { name: 'Periapt of Proof against Poison', rarity: 'rare', price_gp: 16000 },
  { name: 'Periapt of Wound Closure', rarity: 'uncommon', price_gp: 5000 },
  { name: 'Stone of Good Luck (Luckstone)', rarity: 'uncommon', price_gp: 4200 },
  { name: 'Ioun Stone (Absorption)', rarity: 'very_rare', price_gp: 24000 },
  { name: 'Ioun Stone (Agility)', rarity: 'very_rare', price_gp: 20000 },
  { name: 'Ioun Stone (Awareness)', rarity: 'rare', price_gp: 12000 },
  { name: 'Ioun Stone (Fortitude)', rarity: 'very_rare', price_gp: 20000 },
  { name: 'Ioun Stone (Insight)', rarity: 'very_rare', price_gp: 20000 },
  { name: 'Ioun Stone (Leadership)', rarity: 'very_rare', price_gp: 20000 },
  { name: 'Ioun Stone (Mastery)', rarity: 'legendary', price_gp: 50000 },
  { name: 'Ioun Stone (Protection)', rarity: 'rare', price_gp: 1200 },
  { name: 'Ioun Stone (Regeneration)', rarity: 'legendary', price_gp: 80000 },
  { name: 'Ioun Stone (Reserve)', rarity: 'rare', price_gp: 16000 },
  { name: 'Ioun Stone (Sustenance)', rarity: 'rare', price_gp: 5000 },
]

export default function PricesPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [items, setItems] = useState<ItemPrice[]>([])
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name')
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  // Form state
  const [form, setForm] = useState<{
    name: string; rarity: Rarity; price_gp: string; note: string
  }>({ name: '', rarity: 'uncommon', price_gp: '', note: '' })

  const isGM = user?.role === 'gm'

  const loadItems = async () => {
    const q = supabase
      .from('item_prices')
      .select('*, user:profiles(username,role)')
      .order('name')
    const { data } = isGM ? await q : await q.eq('approved', true)
    if (data) setItems(data as ItemPrice[])
  }

  useEffect(() => {
    loadItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSeedItems = async () => {
    if (!isGM) return
    const toInsert = SEED_ITEMS.map((s) => ({
      name: s.name,
      rarity: s.rarity,
      price_gp: s.price_gp,
      note: s.note ?? null,
      approved: true,
      created_by: user!.id,
    }))
    await supabase.from('item_prices').insert(toInsert)
    setSeeded(true)
    loadItems()
  }

  const handleSubmit = async () => {
    if (!user || !form.name.trim() || !form.price_gp) return
    const payload = {
      name: form.name.trim(),
      rarity: form.rarity,
      price_gp: parseFloat(form.price_gp),
      note: form.note.trim() || null,
      approved: isGM,
      created_by: user.id,
    }
    if (editId) {
      await supabase.from('item_prices').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('item_prices').insert(payload)
    }
    setForm({ name: '', rarity: 'uncommon', price_gp: '', note: '' })
    setShowAdd(false)
    loadItems()
  }

  const handleApprove = async (id: string) => {
    await supabase.from('item_prices').update({ approved: true }).eq('id', id)
    loadItems()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('item_prices').delete().eq('id', id)
    loadItems()
  }

  const startEdit = (item: ItemPrice) => {
    setForm({ name: item.name, rarity: item.rarity, price_gp: String(item.price_gp), note: item.note ?? '' })
    setEditId(item.id)
    setShowAdd(true)
  }

  const filtered = useMemo(() => {
    let list = [...items]
    if (rarityFilter !== 'all') list = list.filter((i) => i.rarity === rarityFilter)
    if (search) list = list.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.note?.toLowerCase().includes(search.toLowerCase()))
    if (sortBy === 'price_asc') list.sort((a, b) => a.price_gp - b.price_gp)
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price_gp - a.price_gp)
    else list.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    return list
  }, [items, rarityFilter, search, sortBy])

  const pending = items.filter((i) => !i.approved)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-zinc-100">Item Preise</h1>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{filtered.length} Items</span>
          </div>
          <div className="flex gap-2">
            {isGM && items.length === 0 && !seeded && (
              <button
                onClick={handleSeedItems}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Standardliste laden
              </button>
            )}
            <button
              onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({ name: '', rarity: 'uncommon', price_gp: '', note: '' }) }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* GM: pending approvals */}
      {isGM && pending.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-950/30 border-b border-amber-800/40">
          <p className="text-xs font-semibold text-amber-400 mb-1.5">⏳ {pending.length} ausstehende Genehmigung{pending.length > 1 ? 'en' : ''}</p>
          <div className="space-y-1">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-300 flex-1 min-w-0 truncate">{item.name}</span>
                <span className="text-zinc-500 text-xs">{fmtGp(item.price_gp)}</span>
                <span className="text-zinc-600 text-xs">von {item.user?.username}</span>
                <button onClick={() => handleApprove(item.id)} className="p-1 text-green-400 hover:text-green-300">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1 text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showAdd && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-200 mb-3">{editId ? 'Item bearbeiten' : 'Neues Item hinzufügen'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input
              className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Itemname"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              value={form.rarity}
              onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as Rarity }))}
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Preis (gp)"
                value={form.price_gp}
                onChange={(e) => setForm((f) => ({ ...f, price_gp: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Notiz (z.B. 10% Rabatt in Luskan)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.price_gp}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm font-bold text-white transition-colors"
            >
              {editId ? 'Speichern' : isGM ? 'Hinzufügen' : 'Zur Genehmigung'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null) }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {!isGM && <p className="text-xs text-zinc-500 mt-1.5">Dein Vorschlag wird dem GM zur Genehmigung vorgelegt.</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 px-4 py-2 bg-zinc-950 border-b border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Item suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="name">Name ↑</option>
            <option value="price_asc">Preis ↑</option>
            <option value="price_desc">Preis ↓</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setRarityFilter('all')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              rarityFilter === 'all' ? 'bg-zinc-600 border-zinc-500 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Alle
          </button>
          {RARITIES.map((r) => {
            const cfg = RARITY_CONFIG[r]
            return (
              <button
                key={r}
                onClick={() => setRarityFilter(rarityFilter === r ? 'all' : r)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  rarityFilter === r ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-2">
            <Tag className="w-8 h-8 opacity-30" />
            <p className="text-sm">Keine Items gefunden</p>
            {isGM && items.length === 0 && (
              <button onClick={handleSeedItems} className="text-xs text-amber-500 hover:text-amber-400 underline">
                Standardliste laden
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-zinc-400 font-semibold">Item</th>
                <th className="text-left px-2 py-2 text-xs text-zinc-400 font-semibold hidden md:table-cell">Seltenheit</th>
                <th className="text-right px-4 py-2 text-xs text-zinc-400 font-semibold">Preis</th>
                {isGM && <th className="px-2 py-2 text-xs text-zinc-400 font-semibold w-16 text-center">Aktionen</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((item) => {
                const cfg = RARITY_CONFIG[item.rarity]
                return (
                  <tr key={item.id} className={`hover:bg-zinc-800/30 transition-colors ${!item.approved ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`hidden md:inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.color.replace('text-', 'bg-')}`} />
                        <div>
                          <p className="text-zinc-100 font-medium leading-tight">{item.name}</p>
                          {item.note && <p className="text-xs text-zinc-500 mt-0.5">{item.note}</p>}
                          {!item.approved && <p className="text-[10px] text-amber-500">⏳ Ausstehend</p>}
                          <span className={`md:hidden text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-amber-400 font-bold tabular-nums">{fmtGp(item.price_gp)}</span>
                    </td>
                    {isGM && (
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(item)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Bearbeiten">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors" title="Löschen">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
