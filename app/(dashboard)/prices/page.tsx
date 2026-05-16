'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tag, Plus, Search, X, Trash2, Pencil } from 'lucide-react'
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

// Items from "Sane Magical Item Prices" by Saidoro (community supplement for DnD 5e)
const SEED_ITEMS: { name: string; rarity: Rarity; price_gp: number; note?: string }[] = [
  // ── Cantrip / Lvl-0 ───────────────────────────────────────────────────────
  { name: 'Spell Scroll Level 0',              rarity: 'common',    price_gp: 10 },
  // ── Common ────────────────────────────────────────────────────────────────
  { name: 'Potion of Healing',                 rarity: 'common',    price_gp: 50 },
  { name: 'Spell Scroll Level 1',              rarity: 'common',    price_gp: 60 },
  { name: 'Potion of Climbing',                rarity: 'common',    price_gp: 180 },
  // ── Uncommon ─────────────────────────────────────────────────────────────
  { name: 'Dust of Dryness (1 pellet)',        rarity: 'uncommon',  price_gp: 120 },
  { name: "Keoghtom's Ointment (per dose)",    rarity: 'uncommon',  price_gp: 120 },
  { name: 'Spell Scroll Level 2',              rarity: 'uncommon',  price_gp: 120 },
  { name: 'Potion of Fire Breath',             rarity: 'uncommon',  price_gp: 150 },
  { name: 'Potion of Water Breathing',         rarity: 'uncommon',  price_gp: 180 },
  { name: 'Potion of Animal Friendship',       rarity: 'uncommon',  price_gp: 200 },
  { name: 'Spell Scroll Level 3',              rarity: 'uncommon',  price_gp: 200 },
  { name: 'Potion of Growth',                  rarity: 'uncommon',  price_gp: 270 },
  { name: 'Dust of Disappearance',             rarity: 'uncommon',  price_gp: 300 },
  { name: 'Potion of Resistance',              rarity: 'uncommon',  price_gp: 300 },
  { name: 'Dust of Sneezing and Choking',      rarity: 'uncommon',  price_gp: 480 },
  { name: 'Oil of Slipperiness',               rarity: 'uncommon',  price_gp: 480 },
  { name: 'Helm of Comprehend Languages',      rarity: 'uncommon',  price_gp: 500 },
  { name: 'Mithral Armor',                     rarity: 'uncommon',  price_gp: 800 },
  { name: 'Trident of Fish Command',           rarity: 'uncommon',  price_gp: 800 },
  { name: '+1 Weapon',                         rarity: 'uncommon',  price_gp: 1000 },
  { name: 'Cap of Water Breathing',            rarity: 'uncommon',  price_gp: 1000 },
  { name: 'Eversmoking Bottle',                rarity: 'uncommon',  price_gp: 1000 },
  { name: 'Wand of the War Mage +1',           rarity: 'uncommon',  price_gp: 1200 },
  { name: 'Bracers of Archery',                rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Circlet of Blasting',               rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Goggles of Night',                  rarity: 'uncommon',  price_gp: 1500 },
  { name: "Mariner's Armor",                   rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Necklace of Adaptation',            rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Ring of Water Walking',             rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Wand of Secrets',                   rarity: 'uncommon',  price_gp: 1500 },
  { name: 'Pipes of the Sewers',               rarity: 'uncommon',  price_gp: 2000 },
  { name: 'Rope of Climbing',                  rarity: 'uncommon',  price_gp: 2000 },
  { name: 'Saddle of the Cavalier',            rarity: 'uncommon',  price_gp: 2000 },
  { name: 'Sending Stones',                    rarity: 'uncommon',  price_gp: 2000 },
  { name: 'Staff of the Python',               rarity: 'uncommon',  price_gp: 2000 },
  { name: 'Boots of Elvenkind',                rarity: 'uncommon',  price_gp: 2500 },
  { name: 'Eyes of Minute Seeing',             rarity: 'uncommon',  price_gp: 2500 },
  { name: 'Ring of Jumping',                   rarity: 'uncommon',  price_gp: 2500 },
  { name: 'Eyes of Charming',                  rarity: 'uncommon',  price_gp: 3000 },
  { name: 'Gloves of Missile Snaring',         rarity: 'uncommon',  price_gp: 3000 },
  { name: 'Ring of Swimming',                  rarity: 'uncommon',  price_gp: 3000 },
  { name: 'Cloak of Protection',               rarity: 'uncommon',  price_gp: 3500 },
  { name: 'Luckstone',                         rarity: 'uncommon',  price_gp: 4200 },
  { name: 'Boots of Striding and Springing',   rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Cloak of Elvenkind',                rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Gem of Brightness',                 rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Gloves of Thievery',                rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Hat of Disguise',                   rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Immovable Rod',                     rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Periapt of Health',                 rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Periapt of Wound Closure',          rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Slippers of Spider Climbing',       rarity: 'uncommon',  price_gp: 5000 },
  { name: 'Alchemy Jug',                       rarity: 'uncommon',  price_gp: 6000 },
  { name: 'Cloak of the Manta Ray',            rarity: 'uncommon',  price_gp: 6000 },
  { name: 'Pipes of Haunting',                 rarity: 'uncommon',  price_gp: 6000 },
  { name: 'Deck of Illusions',                 rarity: 'uncommon',  price_gp: 6120 },
  { name: 'Brooch of Shielding',               rarity: 'uncommon',  price_gp: 7500 },
  { name: 'Gauntlets of Ogre Power',           rarity: 'uncommon',  price_gp: 8000 },
  { name: 'Wand of Magic Missiles',            rarity: 'uncommon',  price_gp: 8000 },
  { name: 'Wand of Web',                       rarity: 'uncommon',  price_gp: 8000 },
  { name: 'Winged Boots',                      rarity: 'uncommon',  price_gp: 8000 },
  { name: 'Boots of the Winterlands',          rarity: 'uncommon',  price_gp: 10000 },
  { name: 'Helm of Telepathy',                 rarity: 'uncommon',  price_gp: 12000 },
  { name: 'Ring of Mind Shielding',            rarity: 'uncommon',  price_gp: 16000 },
  { name: 'Sentinel Shield',                   rarity: 'uncommon',  price_gp: 20000 },
  { name: 'Instrument of Bards – Mac-Fuirmidh Cittern', rarity: 'uncommon', price_gp: 27000 },
  { name: 'Instrument of Bards – Doss Lute',  rarity: 'uncommon',  price_gp: 28500 },
  { name: 'Weapon of Warning',                 rarity: 'uncommon',  price_gp: 60000 },
  { name: 'Decanter of Endless Water',         rarity: 'uncommon',  price_gp: 135000 },
  // ── Rare ─────────────────────────────────────────────────────────────────
  { name: "Quaal's Feather Token – Anchor",    rarity: 'rare',      price_gp: 50 },
  { name: 'Ammunition +2 (each)',              rarity: 'rare',      price_gp: 100 },
  { name: 'Elixir of Health',                  rarity: 'rare',      price_gp: 120 },
  { name: "Quaal's Feather Token – Fan",       rarity: 'rare',      price_gp: 250 },
  { name: "Quaal's Feather Token – Whip",      rarity: 'rare',      price_gp: 250 },
  { name: 'Necklace of Fireballs (1 bead)',    rarity: 'rare',      price_gp: 300 },
  { name: 'Potion of Gaseous Form',            rarity: 'rare',      price_gp: 300 },
  { name: 'Spell Scroll Level 4',              rarity: 'rare',      price_gp: 320 },
  { name: 'Vicious Weapon',                    rarity: 'rare',      price_gp: 350 },
  { name: "Ivory Goat (Travail)",              rarity: 'rare',      price_gp: 400 },
  { name: 'Potion of Heroism',                 rarity: 'rare',      price_gp: 180 },
  { name: 'Potion of Mind Reading',            rarity: 'rare',      price_gp: 180 },
  { name: 'Horn of Blasting',                  rarity: 'rare',      price_gp: 450 },
  { name: 'Necklace of Fireballs (2 beads)',   rarity: 'rare',      price_gp: 480 },
  { name: 'Golden Lion (each)',                rarity: 'rare',      price_gp: 600 },
  { name: 'Bead of Force',                     rarity: 'rare',      price_gp: 960 },
  { name: 'Necklace of Fireballs (3 beads)',   rarity: 'rare',      price_gp: 960 },
  { name: 'Ivory Goat (Traveling)',            rarity: 'rare',      price_gp: 1000 },
  { name: 'Sword of Life-Stealing',            rarity: 'rare',      price_gp: 1000 },
  { name: 'Ioun Stone (Sustenance)',           rarity: 'rare',      price_gp: 1000 },
  { name: 'Chime of Opening',                  rarity: 'rare',      price_gp: 1500 },
  { name: 'Prayer Bead – Smiting',             rarity: 'rare',      price_gp: 1500 },
  { name: '+1 Armor',                          rarity: 'rare',      price_gp: 1500 },
  { name: 'Necklace of Fireballs (4 beads)',   rarity: 'rare',      price_gp: 1600 },
  { name: 'Sword of Sharpness',               rarity: 'rare',      price_gp: 1700 },
  { name: 'Prayer Bead – Bless',              rarity: 'rare',      price_gp: 2000 },
  { name: "Heward's Handy Haversack",          rarity: 'rare',      price_gp: 2000 },
  { name: 'Ring of Feather Falling',           rarity: 'rare',      price_gp: 2000 },
  { name: "Quaal's Feather Token – Bird",      rarity: 'rare',      price_gp: 3000 },
  { name: 'Onyx Dog',                          rarity: 'rare',      price_gp: 3000 },
  { name: 'Dimensional Shackles',              rarity: 'rare',      price_gp: 3000 },
  { name: 'Boots of Levitation',               rarity: 'rare',      price_gp: 4000 },
  { name: 'Boots of Speed',                    rarity: 'rare',      price_gp: 4000 },
  { name: 'Elven Chain',                       rarity: 'rare',      price_gp: 4000 },
  { name: 'Iron Bands of Bilarro',             rarity: 'rare',      price_gp: 4000 },
  { name: 'Rope of Entanglement',              rarity: 'rare',      price_gp: 4000 },
  { name: 'Flame Tongue',                      rarity: 'rare',      price_gp: 5000 },
  { name: 'Ring of Evasion',                   rarity: 'rare',      price_gp: 5000 },
  { name: 'Ring of the Ram',                   rarity: 'rare',      price_gp: 5000 },
  { name: 'Tentacle Rod',                      rarity: 'rare',      price_gp: 5000 },
  { name: 'Horseshoes of Speed',               rarity: 'rare',      price_gp: 5000 },
  { name: 'Silver Horn of Valhalla',           rarity: 'rare',      price_gp: 5600 },
  { name: 'Necklace of Fireballs (6 beads)',   rarity: 'rare',      price_gp: 7680 },
  { name: 'Armor of Resistance',               rarity: 'rare',      price_gp: 6000 },
  { name: 'Belt of Dwarvenkind',               rarity: 'rare',      price_gp: 6000 },
  { name: 'Ioun Stone (Reserve)',              rarity: 'rare',      price_gp: 6000 },
  { name: 'Ring of Resistance',                rarity: 'rare',      price_gp: 6000 },
  { name: 'Ring of X-Ray Vision',              rarity: 'rare',      price_gp: 6000 },
  { name: '+2 Shield',                         rarity: 'rare',      price_gp: 6000 },
  { name: 'Shield of Missile Attraction',      rarity: 'rare',      price_gp: 6000, note: 'Verflucht' },
  { name: 'Arrow-Catching Shield',             rarity: 'rare',      price_gp: 6000 },
  { name: 'Giant Slayer',                      rarity: 'rare',      price_gp: 7000 },
  { name: 'Mace of Smiting',                   rarity: 'rare',      price_gp: 7000 },
  { name: 'Amulet of Health',                  rarity: 'rare',      price_gp: 8000 },
  { name: 'Bowl of Commanding Water Elementals', rarity: 'rare',    price_gp: 8000 },
  { name: 'Bronze Griffon',                    rarity: 'rare',      price_gp: 8000 },
  { name: 'Cape of the Mountebank',            rarity: 'rare',      price_gp: 8000 },
  { name: 'Censer of Controlling Air Elementals', rarity: 'rare',  price_gp: 8000 },
  { name: 'Dragon Slayer',                     rarity: 'rare',      price_gp: 8000 },
  { name: 'Mace of Disruption',                rarity: 'rare',      price_gp: 8000 },
  { name: 'Nine Lives Stealer (fully charged)', rarity: 'very_rare', price_gp: 8000 },
  { name: 'Serpentine Owl',                    rarity: 'rare',      price_gp: 8000 },
  { name: 'Stone of Controlling Earth Elementals', rarity: 'rare', price_gp: 8000 },
  { name: 'Brass Horn of Valhalla',            rarity: 'rare',      price_gp: 8400 },
  { name: 'Wand of Binding',                   rarity: 'rare',      price_gp: 10000 },
  { name: 'Wand of Fear',                      rarity: 'rare',      price_gp: 10000 },
  { name: 'Ioun Stone (Awareness)',            rarity: 'rare',      price_gp: 12000 },
  { name: 'Staff of Charming',                 rarity: 'rare',      price_gp: 12000 },
  { name: 'Staff of Healing',                  rarity: 'rare',      price_gp: 13000 },
  { name: 'Cube of Force',                     rarity: 'rare',      price_gp: 16000 },
  { name: 'Rod of the Pact Keeper +2',         rarity: 'rare',      price_gp: 16000 },
  { name: 'Staff of Swarming Insects',         rarity: 'rare',      price_gp: 16000 },
  { name: 'Wand of Paralysis',                 rarity: 'rare',      price_gp: 16000 },
  { name: 'Wand of Lightning Bolts',           rarity: 'rare',      price_gp: 32000 },
  { name: 'Potion of Invulnerability',         rarity: 'rare',      price_gp: 3840 },
  { name: 'Ivory Goat (Terror)',               rarity: 'rare',      price_gp: 20000 },
  { name: 'Ring of Free Action',               rarity: 'rare',      price_gp: 20000 },
  { name: 'Ring of Spell Storing',             rarity: 'rare',      price_gp: 24000 },
  { name: 'Wand of Fireballs',                 rarity: 'rare',      price_gp: 32000 },
  { name: 'Mantle of Spell Resistance',        rarity: 'rare',      price_gp: 30000 },
  { name: 'Robe of Eyes',                      rarity: 'rare',      price_gp: 30000 },
  { name: 'Instrument of Bards – Canaith Mandolin', rarity: 'rare', price_gp: 30000 },
  { name: 'Staff of the Woodlands',            rarity: 'rare',      price_gp: 44000 },
  { name: 'Cloak of Displacement',             rarity: 'rare',      price_gp: 60000 },
  { name: 'Helm of Teleportation',             rarity: 'rare',      price_gp: 64000 },
  { name: "Daern's Instant Fortress",          rarity: 'rare',      price_gp: 75000 },
  // ── Very Rare ────────────────────────────────────────────────────────────
  { name: "Nolzur's Marvelous Pigments",       rarity: 'very_rare', price_gp: 200 },
  { name: 'Potion of Invisibility',            rarity: 'very_rare', price_gp: 180 },
  { name: 'Potion of Speed',                   rarity: 'very_rare', price_gp: 400 },
  { name: 'Potion of Superior Healing',        rarity: 'very_rare', price_gp: 450, note: '8d4+8 TP' },
  { name: 'Arrow of Slaying (each)',           rarity: 'very_rare', price_gp: 600 },
  { name: 'Potion of Vitality',                rarity: 'very_rare', price_gp: 960 },
  { name: 'Potion of Supreme Healing',         rarity: 'very_rare', price_gp: 1350, note: '10d4+20 TP' },
  { name: 'Spell Scroll Level 6',              rarity: 'very_rare', price_gp: 1280 },
  { name: 'Dancing Sword',                     rarity: 'very_rare', price_gp: 2000 },
  { name: 'Frost Brand',                       rarity: 'very_rare', price_gp: 2200 },
  { name: 'Ioun Stone (Absorption)',           rarity: 'very_rare', price_gp: 2400 },
  { name: 'Ioun Stone (Fortitude)',            rarity: 'very_rare', price_gp: 3000 },
  { name: 'Ioun Stone (Intellect)',            rarity: 'very_rare', price_gp: 3000 },
  { name: 'Ioun Stone (Strength)',             rarity: 'very_rare', price_gp: 3000 },
  { name: 'Oil of Sharpness',                  rarity: 'very_rare', price_gp: 3200 },
  { name: 'Robe of Scintillating Colors',      rarity: 'very_rare', price_gp: 6000 },
  { name: 'Scimitar of Speed',                 rarity: 'very_rare', price_gp: 6000 },
  { name: 'Cloak of Arachnida',                rarity: 'very_rare', price_gp: 5000 },
  { name: 'Dwarven Plate',                     rarity: 'very_rare', price_gp: 9000 },
  { name: 'Staff of Thunder and Lightning',    rarity: 'very_rare', price_gp: 10000 },
  { name: 'Staff of Fire',                     rarity: 'very_rare', price_gp: 16000 },
  { name: '+3 Weapon',                         rarity: 'very_rare', price_gp: 16000 },
  { name: '+3 Shield',                         rarity: 'very_rare', price_gp: 24000 },
  { name: 'Mirror of Life Trapping',           rarity: 'very_rare', price_gp: 18000 },
  { name: 'Dwarven Thrower',                   rarity: 'very_rare', price_gp: 18000 },
  { name: 'Wand of the War Mage +3',           rarity: 'very_rare', price_gp: 19200 },
  { name: 'Rod of the Pact Keeper +3',         rarity: 'very_rare', price_gp: 28000 },
  { name: 'Staff of Frost',                    rarity: 'very_rare', price_gp: 26000 },
  { name: 'Wand of Polymorph',                 rarity: 'very_rare', price_gp: 32000 },
  { name: 'Spell Scroll Level 8',              rarity: 'very_rare', price_gp: 5120 },
  { name: 'Rod of Absorption',                 rarity: 'very_rare', price_gp: 50000 },
  { name: 'Crystal Ball',                      rarity: 'very_rare', price_gp: 50000 },
  { name: 'Spellguard Shield',                 rarity: 'very_rare', price_gp: 50000 },
  { name: 'Rod of Security',                   rarity: 'very_rare', price_gp: 90000 },
  { name: 'Staff of Power',                    rarity: 'very_rare', price_gp: 95500 },
  { name: 'Instrument of Bards – Anstruth Harp', rarity: 'very_rare', price_gp: 109000 },
  { name: 'Obsidian Steed',                    rarity: 'very_rare', price_gp: 128000 },
  { name: 'Amulet of the Planes',              rarity: 'very_rare', price_gp: 160000 },
  // ── Legendary ────────────────────────────────────────────────────────────
  { name: 'Ioun Stone (Mastery)',              rarity: 'legendary', price_gp: 15000 },
  { name: 'Ioun Stone (Regeneration)',         rarity: 'legendary', price_gp: 4000 },
  { name: 'Ioun Stone (Greater Absorption)',   rarity: 'legendary', price_gp: 31000 },
  { name: 'Hammer of Thunderbolts',            rarity: 'legendary', price_gp: 16000 },
  { name: 'Iron Horn of Valhalla',             rarity: 'legendary', price_gp: 14000 },
  { name: 'Sphere of Annihilation',            rarity: 'legendary', price_gp: 15000 },
  { name: 'Talisman of the Sphere',            rarity: 'legendary', price_gp: 20000 },
  { name: 'Efreeti Chain',                     rarity: 'legendary', price_gp: 20000 },
  { name: '+3 Armor',                          rarity: 'legendary', price_gp: 24000 },
  { name: 'Ring of Earth Elemental Command',   rarity: 'legendary', price_gp: 31000 },
  { name: 'Ring of Air Elemental Command',     rarity: 'legendary', price_gp: 35000 },
  { name: 'Ring of Water Elemental Command',   rarity: 'legendary', price_gp: 25000 },
  { name: 'Ring of Spell Turning',             rarity: 'legendary', price_gp: 30000 },
  { name: 'Robe of the Archmagi',              rarity: 'legendary', price_gp: 34000 },
  { name: 'Rod of Lordly Might',               rarity: 'legendary', price_gp: 28000 },
  { name: 'Sword of Answering',               rarity: 'legendary', price_gp: 36000 },
  { name: 'Scarab of Protection',              rarity: 'legendary', price_gp: 36000 },
  { name: 'Apparatus of Kwalish',              rarity: 'legendary', price_gp: 10000 },
  { name: 'Plate Armor of Etherealness',       rarity: 'legendary', price_gp: 48000 },
  { name: 'Talisman of Pure Good',             rarity: 'legendary', price_gp: 71680 },
  { name: 'Talisman of Ultimate Evil',         rarity: 'legendary', price_gp: 61440 },
  { name: 'Cloak of Invisibility',             rarity: 'legendary', price_gp: 80000 },
  { name: 'Holy Avenger',                      rarity: 'legendary', price_gp: 165000 },
  { name: 'Prayer Bead – Favor',               rarity: 'legendary', price_gp: 32000 },
  { name: 'Prayer Bead – Summons',             rarity: 'legendary', price_gp: 128000 },
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
    const { data } = await supabase
      .from('item_prices')
      .select('*, user:profiles(username,role)')
      .eq('approved', true)
      .order('name')
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
    if (editId) {
      // GM editing existing item
      await supabase.from('item_prices').update({
        name: form.name.trim(),
        rarity: form.rarity,
        price_gp: parseFloat(form.price_gp),
        note: form.note.trim() || null,
      }).eq('id', editId)
      setEditId(null)
    } else if (isGM) {
      // GM adds directly as approved
      await supabase.from('item_prices').insert({
        name: form.name.trim(),
        rarity: form.rarity,
        price_gp: parseFloat(form.price_gp),
        note: form.note.trim() || null,
        approved: true,
        created_by: user.id,
      })
    } else {
      // Player submits via approval_requests
      await supabase.from('approval_requests').insert({
        requester_id: user.id,
        request_type: 'item_price',
        title: `Itempreis: ${form.name.trim()}`,
        content: form.note.trim() || null,
        item_data: {
          name: form.name.trim(),
          rarity: form.rarity,
          price_gp: parseFloat(form.price_gp),
          note: form.note.trim() || null,
        },
      })
    }
    setForm({ name: '', rarity: 'uncommon', price_gp: '', note: '' })
    setShowAdd(false)
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
