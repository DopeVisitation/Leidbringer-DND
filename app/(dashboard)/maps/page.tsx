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
      // ── Sword Coast & North ──────────────────────────────────────────────
      { name: 'Waterdeep',           x: 18.6, y: 28.3 },
      { name: 'Neverwinter',         x: 14.2, y: 17.2 },
      { name: 'Luskan',              x: 16.1, y: 15.5 },
      { name: 'Port Llast',          x: 13.9, y: 19.5 },
      { name: 'Leilon',              x: 13.5, y: 22.5 },
      { name: 'Daggerford',          x: 17.1, y: 33.9 },
      { name: 'Helm\'s Hold',        x: 16.0, y: 22.0 },
      { name: 'Castle Naerytar',     x: 15.0, y: 25.0 },
      { name: 'Gauntlgrym',          x: 16.0, y: 18.0 },
      { name: 'Mount Hotenow',       x: 15.0, y: 19.5 },
      { name: 'Phandalin',           x: 17.5, y: 25.5 },
      { name: 'Thundertree',         x: 14.5, y: 20.5 },
      { name: 'Conyberry',           x: 18.0, y: 24.0 },
      { name: 'Red Larch',           x: 20.0, y: 28.0 },
      { name: 'Goldenfields',        x: 20.5, y: 30.0 },
      { name: 'Amphail',             x: 19.0, y: 27.5 },
      { name: 'Thornhold',           x: 16.0, y: 27.0 },
      { name: 'Deeping Cave',        x: 17.0, y: 25.0 },
      { name: 'Wave Echo Cave',      x: 16.5, y: 27.5 },
      { name: 'House of Stone',      x: 22.0, y: 30.0 },
      { name: 'Secomber',            x: 25.9, y: 33.9 },
      { name: 'Triboar',             x: 25.6, y: 26.7 },
      { name: 'Yartar',              x: 26.0, y: 27.7 },
      { name: 'Stone Bridge',        x: 27.5, y: 26.0 },
      { name: 'Longsaddle',          x: 23.8, y: 23.8 },
      { name: 'Sharandar',           x: 22.0, y: 19.5 },
      { name: "Baldur's Gate",       x: 16.8, y: 50.0 },
      { name: 'Beregost',            x: 17.0, y: 53.0 },
      { name: 'Nashkel',             x: 19.8, y: 54.7 },
      { name: 'Candlekeep',          x: 16.5, y: 53.5 },
      { name: 'Boareskyr Bridge',    x: 22.0, y: 47.0 },
      { name: 'Soubar',              x: 22.5, y: 49.0 },
      { name: 'Dragonspear Castle',  x: 23.5, y: 45.5 },
      { name: 'Mosstone',            x: 17.0, y: 56.0 },
      { name: 'Trollbark Forest',    x: 19.0, y: 44.0 },

      // ── Icewind Dale / Ten Towns ─────────────────────────────────────────
      { name: 'Icewind Dale',        x: 22.0, y: 5.0  },
      { name: 'Bryn Shander',        x: 24.0, y: 6.0  },
      { name: 'Targos',              x: 23.5, y: 5.5  },
      { name: 'Termalaine',          x: 23.0, y: 5.0  },
      { name: 'Lonelywood',          x: 22.5, y: 4.5  },
      { name: 'Caer-Konig',          x: 25.0, y: 5.5  },
      { name: 'Caer-Dineval',        x: 25.0, y: 6.0  },
      { name: 'Easthaven',           x: 25.5, y: 7.0  },
      { name: 'Dougan\'s Hole',      x: 24.5, y: 7.0  },
      { name: 'Aurilsberg',          x: 3.5,  y: 6.0  },
      { name: 'Fireshear',           x: 7.0,  y: 9.0  },
      { name: 'Hundelstone',         x: 13.5, y: 9.0  },

      // ── The Silver Marches / North ───────────────────────────────────────
      { name: 'Mirabar',             x: 19.3, y: 11.7 },
      { name: 'Mithral Hall',        x: 28.1, y: 19.2 },
      { name: 'Silverymoon',         x: 33.2, y: 15.6 },
      { name: 'Everlund',            x: 31.0, y: 17.3 },
      { name: 'Sundabar',            x: 36.1, y: 16.1 },
      { name: 'Citadel Adbar',       x: 38.6, y: 12.0 },
      { name: 'Citadel Felbarr',     x: 30.0, y: 12.0 },
      { name: 'Menzoberranzan',      x: 26.0, y: 18.0 },
      { name: 'Settlestone',         x: 28.0, y: 17.0 },
      { name: 'Quaervarr',           x: 31.0, y: 15.0 },
      { name: 'Hellgate Keep',       x: 30.0, y: 18.0 },
      { name: 'Deadsnows',           x: 28.5, y: 16.0 },
      { name: 'Vintner\'s Keep',     x: 23.5, y: 10.0 },
      { name: 'Herald\'s Holdfast',  x: 24.0, y: 10.5 },
      { name: 'Loudwater',           x: 30.0, y: 23.5 },
      { name: 'Llorkh',              x: 32.0, y: 26.0 },
      { name: 'Llork',               x: 32.0, y: 26.0 },

      // ── Western Heartlands ───────────────────────────────────────────────
      { name: 'Elturel',             x: 26.9, y: 46.9 },
      { name: 'Berdusk',             x: 28.1, y: 45.9 },
      { name: 'Scornubel',           x: 25.9, y: 44.8 },
      { name: 'Iriaebor',            x: 33.7, y: 44.1 },
      { name: 'Hill\'s Edge',        x: 30.0, y: 42.0 },
      { name: 'Triel',               x: 30.5, y: 43.0 },
      { name: 'Hluthvar',            x: 31.0, y: 42.5 },
      { name: 'Asbravn',             x: 32.0, y: 41.0 },
      { name: 'Easting',             x: 36.0, y: 42.0 },
      { name: 'Proskur',             x: 37.5, y: 41.5 },
      { name: 'Eversult',            x: 39.0, y: 42.0 },
      { name: 'Priapurl',            x: 39.5, y: 43.0 },
      { name: 'Darkhold',            x: 36.5, y: 40.5 },
      { name: 'Trailstone',          x: 33.0, y: 42.5 },
      { name: 'Greenest',            x: 31.5, y: 41.0 },
      { name: 'Durlag\'s Tower',     x: 18.0, y: 49.0 },
      { name: 'The High Moor',       x: 27.5, y: 38.0 },
      { name: 'Bridge of Fallen Men',x: 28.0, y: 40.0 },

      // ── Amn ──────────────────────────────────────────────────────────────
      { name: 'Athkatla',            x: 21.0, y: 57.0 },
      { name: 'Esmeltaran',          x: 22.0, y: 56.5 },
      { name: 'Crimmor',             x: 22.5, y: 58.0 },
      { name: 'Murann',              x: 19.0, y: 60.0 },
      { name: 'Trademeet',           x: 22.0, y: 58.5 },
      { name: 'Imnesvale',           x: 21.0, y: 59.0 },
      { name: 'Eshpurta',            x: 22.5, y: 57.5 },
      { name: 'Saradush',            x: 25.0, y: 62.0 },
      { name: 'Riatavin',            x: 27.0, y: 63.5 },

      // ── Tethyr / Calimshan ───────────────────────────────────────────────
      { name: 'Zazesspur',           x: 18.3, y: 61.8 },
      { name: 'Memnon',              x: 20.0, y: 63.5 },
      { name: 'Calimport',           x: 21.2, y: 70.0 },
      { name: 'Almraiven',           x: 25.0, y: 71.0 },
      { name: 'Velen',               x: 17.0, y: 64.0 },
      { name: 'Myratma',             x: 18.0, y: 65.0 },
      { name: 'Darromar',            x: 22.0, y: 65.0 },
      { name: 'Ithmong',             x: 21.0, y: 65.0 },
      { name: 'Castle Tethyr',       x: 18.5, y: 64.5 },
      { name: 'Manshaka',            x: 24.0, y: 70.5 },
      { name: 'Keltar',              x: 22.0, y: 69.5 },
      { name: 'Schamdar',            x: 25.0, y: 70.5 },
      { name: 'Volothamp',           x: 26.0, y: 70.5 },
      { name: 'Tulmon',              x: 28.0, y: 71.0 },
      { name: 'Suldolphor',          x: 22.0, y: 71.5 },
      { name: 'Brest',               x: 22.0, y: 60.5 },
      { name: 'Sundabar (Tethyr)',   x: 21.0, y: 60.5 },

      // ── Moonsea ──────────────────────────────────────────────────────────
      { name: 'Zhentil Keep',        x: 47.9, y: 25.4 },
      { name: 'Phlan',               x: 48.6, y: 25.9 },
      { name: 'Hillsfar',            x: 49.8, y: 28.0 },
      { name: 'Mulmaster',           x: 55.7, y: 26.0 },
      { name: 'Melvaunt',            x: 54.9, y: 25.1 },
      { name: 'Thentia',             x: 52.0, y: 27.0 },
      { name: 'Glister',             x: 50.0, y: 19.0 },
      { name: 'Yulash',              x: 48.0, y: 26.5 },
      { name: 'Voonlar',             x: 46.0, y: 27.0 },
      { name: 'Teshwave',            x: 46.0, y: 24.0 },
      { name: 'Elmwood',             x: 52.0, y: 28.0 },
      { name: 'Citadel of the Raven',x: 44.0, y: 21.0 },
      { name: 'Elventree',           x: 50.0, y: 26.0 },
      { name: 'Xul-Jarak',           x: 52.0, y: 24.0 },
      { name: 'Bell in the Deep',    x: 52.0, y: 27.0 },

      // ── Vaasa / Damara / Cold Lands ──────────────────────────────────────
      { name: 'Bloodstone Pass',     x: 62.5, y: 20.0 },
      { name: 'Bloodstone Mines',    x: 63.0, y: 18.0 },
      { name: 'Bloodstone Village',  x: 63.5, y: 19.0 },
      { name: 'Heliogabalus',        x: 64.5, y: 20.0 },
      { name: 'Trailsend',           x: 62.0, y: 21.0 },
      { name: 'Palischuk',           x: 60.0, y: 19.0 },
      { name: 'Vails',               x: 64.0, y: 20.0 },
      { name: 'Darmshall',           x: 62.0, y: 21.0 },
      { name: 'Vaasa',               x: 60.0, y: 17.0 },
      { name: 'Damara',              x: 64.0, y: 20.5 },

      // ── Impiltur ─────────────────────────────────────────────────────────
      { name: 'Lyrabar',             x: 70.0, y: 33.0 },
      { name: 'Sarshel',             x: 67.0, y: 31.0 },
      { name: 'Hlammach',            x: 68.0, y: 32.0 },
      { name: 'Dilpur',              x: 66.0, y: 33.0 },
      { name: 'Lapseur',             x: 64.0, y: 28.0 },

      // ── The Vast / Dragon Reach ──────────────────────────────────────────
      { name: 'Procampur',           x: 63.0, y: 33.0 },
      { name: 'Tantras',             x: 61.0, y: 33.0 },
      { name: 'Calaunt',             x: 60.0, y: 32.0 },
      { name: 'Ravens Bluff',        x: 61.0, y: 32.5 },
      { name: 'Earthfast',           x: 64.0, y: 32.0 },
      { name: 'Master\'s Library',   x: 62.0, y: 30.0 },

      // ── Cormyr ───────────────────────────────────────────────────────────
      { name: 'Suzail',              x: 49.8, y: 38.1 },
      { name: 'Arabel',              x: 48.6, y: 32.9 },
      { name: 'Tilverton',           x: 49.6, y: 32.6 },
      { name: 'Marsember',           x: 51.5, y: 40.0 },
      { name: 'High Horn',           x: 46.0, y: 35.0 },
      { name: 'Eveningstar',         x: 47.0, y: 33.5 },
      { name: 'Halfhap',             x: 47.0, y: 33.0 },
      { name: 'Wheloon',             x: 48.0, y: 36.0 },

      // ── The Dales ────────────────────────────────────────────────────────
      { name: 'Shadowdale',          x: 51.0, y: 32.1 },
      { name: 'Myth Drannor',        x: 52.5, y: 30.5 },
      { name: 'Mistledale',          x: 50.0, y: 32.5 },
      { name: 'Ashabenford',         x: 52.0, y: 33.0 },
      { name: 'Essembra',            x: 53.0, y: 33.0 },
      { name: 'Battledale',          x: 54.0, y: 33.0 },
      { name: 'Tasseldale',          x: 52.0, y: 34.0 },
      { name: 'Daggerdale',          x: 48.0, y: 31.0 },
      { name: 'Featherdale',         x: 55.0, y: 34.0 },
      { name: 'Highmoon',            x: 53.5, y: 34.5 },
      { name: 'Deepingdale',         x: 54.0, y: 34.5 },
      { name: 'Harrowdale',          x: 57.0, y: 33.0 },
      { name: 'Scardale',            x: 56.0, y: 35.0 },
      { name: 'Sessrendale',         x: 53.0, y: 33.5 },
      { name: 'Archenbridge',        x: 55.0, y: 36.0 },

      // ── Sembia ───────────────────────────────────────────────────────────
      { name: 'Ordulin',             x: 53.2, y: 35.2 },
      { name: 'Selgaunt',            x: 54.7, y: 38.9 },
      { name: 'Saerloon',            x: 53.7, y: 41.0 },
      { name: 'Daerlun',             x: 52.5, y: 35.5 },
      { name: 'Yhaunn',              x: 55.0, y: 36.0 },
      { name: 'Urmlaspyr',           x: 55.0, y: 38.0 },
      { name: 'Saerb',               x: 52.0, y: 36.0 },

      // ── Dragon Coast ─────────────────────────────────────────────────────
      { name: 'Westgate',            x: 49.0, y: 44.0 },
      { name: 'Teziir',              x: 47.0, y: 42.0 },
      { name: 'Reddansyr',           x: 53.0, y: 42.0 },
      { name: 'Starmantle',          x: 51.0, y: 42.0 },
      { name: 'Ilipur',              x: 49.0, y: 43.0 },
      { name: 'Pros',                x: 52.0, y: 43.0 },

      // ── Turmish ──────────────────────────────────────────────────────────
      { name: 'Alaghôn',             x: 51.5, y: 45.1 },
      { name: 'Gildenglade',         x: 53.0, y: 45.5 },
      { name: 'Xorhun',              x: 51.0, y: 46.0 },
      { name: 'Sapra',               x: 56.0, y: 43.0 },
      { name: 'Ormath',              x: 49.0, y: 47.0 },

      // ── Vilhon Reach / Chondath / Sespech ────────────────────────────────
      { name: 'Hlondeth',            x: 51.5, y: 46.5 },
      { name: 'Innarlith',           x: 53.0, y: 49.5 },
      { name: 'Hlath',               x: 58.0, y: 44.0 },
      { name: 'Arrabar',             x: 56.0, y: 47.0 },
      { name: 'Reth',                x: 58.5, y: 44.5 },
      { name: 'Iljak',               x: 56.0, y: 47.0 },
      { name: 'Ormpetarr',           x: 54.0, y: 49.0 },
      { name: 'Mussum',              x: 56.0, y: 47.0 },
      { name: 'Nimpeth',             x: 53.0, y: 47.0 },
      { name: 'Mimph',               x: 53.5, y: 47.0 },
      { name: 'Surkh',               x: 50.0, y: 46.5 },
      { name: 'Elbulder',            x: 57.0, y: 49.0 },
      { name: 'Iryandar',            x: 60.5, y: 50.0 },
      { name: 'Tashalar',            x: 56.0, y: 51.0 },
      { name: 'Teshlatn',            x: 55.0, y: 50.0 },
      { name: 'Sambar',              x: 58.0, y: 50.0 },

      // ── Chessenta ────────────────────────────────────────────────────────
      { name: 'Cimbar',              x: 60.5, y: 44.0 },
      { name: 'Luthcheq',            x: 60.1, y: 41.7 },
      { name: 'Airspur',             x: 63.5, y: 43.0 },
      { name: 'Mordulkin',           x: 60.0, y: 41.0 },
      { name: 'Mourktar',            x: 62.0, y: 41.0 },
      { name: 'Heptios',             x: 61.0, y: 42.0 },
      { name: 'Akanax',              x: 62.0, y: 43.0 },
      { name: 'Soolabax',            x: 61.0, y: 41.5 },
      { name: 'Earthrunni',          x: 58.0, y: 41.0 },
      { name: 'Escalant',            x: 59.0, y: 41.0 },

      // ── Threskel ─────────────────────────────────────────────────────────
      { name: 'Threskel',            x: 60.0, y: 41.5 },
      { name: 'Thamor',              x: 61.0, y: 41.0 },

      // ── Unther / Mulhorand / Murghôm ─────────────────────────────────────
      { name: 'Unthalass',           x: 63.5, y: 50.0 },
      { name: 'Messemprar',          x: 66.2, y: 50.1 },
      { name: 'Shussel',             x: 66.0, y: 41.0 },
      { name: 'Skuld',               x: 67.6, y: 60.9 },
      { name: 'Sultim',              x: 67.0, y: 41.0 },
      { name: 'Mishtan',             x: 68.0, y: 64.0 },
      { name: 'Murghyr',             x: 70.0, y: 42.0 },
      { name: 'Mahasarpa',           x: 67.0, y: 45.0 },
      { name: 'Neldorild',           x: 65.0, y: 47.0 },
      { name: 'Gheldaneth',          x: 65.0, y: 47.0 },
      { name: 'Cliffs of Leaping Horses', x: 67.5, y: 43.0 },

      // ── Thay ─────────────────────────────────────────────────────────────
      { name: 'Eltabbar',            x: 68.8, y: 26.7 },
      { name: 'Bezantur',            x: 66.4, y: 33.2 },
      { name: 'Tyraturos',           x: 64.0, y: 29.1 },
      { name: 'Pyarados',            x: 67.6, y: 27.5 },
      { name: 'Surthay',             x: 66.0, y: 28.0 },
      { name: 'Thazar Keep',         x: 67.0, y: 26.0 },
      { name: 'Thay',                x: 67.0, y: 27.0 },
      { name: 'Amrultar',            x: 68.0, y: 30.0 },
      { name: 'Anhaurz',             x: 66.0, y: 29.0 },
      { name: 'Nethentir',           x: 67.0, y: 28.0 },
      { name: 'Bertentir',           x: 67.5, y: 30.0 },

      // ── Aglarond ─────────────────────────────────────────────────────────
      { name: 'Velprintalar',        x: 71.8, y: 34.0 },
      { name: 'Furthinghome',        x: 69.0, y: 35.0 },
      { name: 'Glarondar',           x: 71.0, y: 33.0 },
      { name: 'Emmech',              x: 72.0, y: 36.0 },
      { name: 'Sunglade',            x: 71.0, y: 36.0 },

      // ── Rashemen / Lake Ashane ───────────────────────────────────────────
      { name: 'Immilmar',            x: 70.1, y: 19.4 },
      { name: 'Citadel Rashemar',    x: 74.0, y: 19.0 },
      { name: 'Mulsantir',           x: 71.0, y: 28.0 },
      { name: 'Tethkel',             x: 73.0, y: 22.0 },
      { name: 'Mulptolyos',          x: 71.0, y: 26.0 },
      { name: 'Two Stars',           x: 72.0, y: 27.0 },
      { name: 'Citadel of Blue Fire',x: 74.0, y: 22.0 },
      { name: 'Shamballa',           x: 69.0, y: 23.0 },
      { name: 'Night Hawk Tower',    x: 68.0, y: 22.0 },
      { name: 'Krent Threespires',   x: 67.5, y: 23.5 },

      // ── Thesk ────────────────────────────────────────────────────────────
      { name: 'Thesk',               x: 74.5, y: 24.7 },
      { name: 'Phsant',              x: 73.0, y: 30.0 },
      { name: 'Phent',               x: 71.0, y: 31.0 },
      { name: 'Telflamm',            x: 73.0, y: 32.0 },
      { name: 'Almurel',             x: 74.0, y: 24.0 },
      { name: 'Tammar',              x: 71.0, y: 29.0 },
      { name: 'Yeshelmar',           x: 68.0, y: 25.0 },

      // ── The Great Dale ───────────────────────────────────────────────────
      { name: 'Uthmere',             x: 68.0, y: 22.0 },
      { name: 'The Great Dale',      x: 68.0, y: 24.0 },

      // ── Narfell ──────────────────────────────────────────────────────────
      { name: 'Narfell',             x: 68.0, y: 15.0 },
      { name: 'Peltarch',            x: 65.0, y: 21.0 },
      { name: 'Jiyad',               x: 66.0, y: 21.0 },
      { name: 'N\'Jast',             x: 67.0, y: 21.0 },
      { name: 'Bildoojabad',         x: 66.0, y: 22.0 },
      { name: 'Dun-Thares',          x: 67.0, y: 25.0 },

      // ── Hordelands / Endless Wastes ──────────────────────────────────────
      { name: 'Hordelands',          x: 77.0, y: 23.0 },
      { name: 'The Endless Wastes',  x: 80.0, y: 22.0 },
      { name: 'Semphar',             x: 80.0, y: 25.0 },

      // ── Anauroch ─────────────────────────────────────────────────────────
      { name: 'Anauroch',            x: 44.9, y: 14.6 },
      { name: 'Ascore',              x: 37.0, y: 13.0 },
      { name: 'Spellgard',           x: 37.0, y: 17.0 },
      { name: 'Hlondath',            x: 40.0, y: 16.0 },
      { name: 'City of Shade',       x: 47.0, y: 16.0 },
      { name: 'Empire of Shadow',    x: 46.0, y: 17.0 },
      { name: 'Atar\'s Looking Glass',x: 46.0, y: 16.0 },
      { name: 'Flaming Tower',       x: 47.5, y: 17.0 },
      { name: 'Dagger Falls',        x: 47.0, y: 19.0 },
      { name: 'Mines of Tethyamar',  x: 48.0, y: 18.0 },
      { name: 'Fallen Giant Rift',   x: 42.0, y: 16.0 },
      { name: 'The High Ice',        x: 51.0, y: 6.0  },

      // ── The Shaar / South ────────────────────────────────────────────────
      { name: 'The Shaar',           x: 57.1, y: 68.0 },
      { name: 'Shaarmir',            x: 55.0, y: 68.0 },
      { name: 'Lheper',              x: 57.0, y: 69.0 },
      { name: 'The Border Kingdoms', x: 40.0, y: 65.0 },
      { name: 'Channelgate',         x: 51.0, y: 70.0 },
      { name: 'Liiraput',            x: 44.0, y: 73.0 },
      { name: 'Reithor',             x: 49.0, y: 71.0 },

      // ── Lapaliiya ────────────────────────────────────────────────────────
      { name: 'Lapaliiya',           x: 44.2, y: 72.3 },
      { name: 'Lapal',               x: 44.0, y: 73.0 },
      { name: 'Sheirtalar',          x: 38.0, y: 71.0 },
      { name: 'Lapalpaer',           x: 41.0, y: 76.0 },
      { name: 'Talagbar',            x: 43.0, y: 76.0 },

      // ── Halruaa ──────────────────────────────────────────────────────────
      { name: 'Halruaa',             x: 46.9, y: 77.8 },
      { name: 'Halagard',            x: 47.0, y: 78.0 },
      { name: 'Halarahh',            x: 48.0, y: 79.0 },
      { name: 'Sulduskoon',          x: 50.0, y: 78.0 },
      { name: 'The Nath',            x: 52.0, y: 79.0 },
      { name: 'Lake Halruaa',        x: 47.0, y: 82.0 },
      { name: 'Talatphand',          x: 47.0, y: 80.0 },

      // ── Dambrath ─────────────────────────────────────────────────────────
      { name: 'Dambrath',            x: 52.2, y: 79.4 },
      { name: 'T\'lindhet',          x: 51.0, y: 80.0 },
      { name: 'Hethar',              x: 54.0, y: 80.0 },
      { name: 'Maerstar',            x: 52.0, y: 80.0 },
      { name: 'Cathyr',              x: 52.0, y: 81.0 },
      { name: 'Eluarshee',           x: 51.0, y: 81.0 },
      { name: 'Herath',              x: 47.0, y: 82.0 },

      // ── Luiren ───────────────────────────────────────────────────────────
      { name: 'Luiren',              x: 46.2, y: 81.7 },
      { name: 'Beluir',              x: 58.0, y: 81.0 },
      { name: 'Khôltar',             x: 57.0, y: 81.0 },
      { name: 'Mertik',              x: 58.0, y: 81.0 },
      { name: 'Chethel',             x: 60.0, y: 80.0 },

      // ── Eastern Shaar ────────────────────────────────────────────────────
      { name: 'The Eastern Shaar',   x: 65.0, y: 75.0 },
      { name: 'The Great Rift',      x: 65.0, y: 75.0 },
      { name: 'Khôltar (Rift)',      x: 67.0, y: 75.0 },
      { name: 'Eartheart',           x: 67.0, y: 76.0 },
      { name: 'Three Swords',        x: 65.0, y: 77.0 },
      { name: 'Underhome',           x: 66.0, y: 75.0 },
      { name: 'Delzimmer',           x: 70.0, y: 76.0 },
      { name: 'Thuldar',             x: 75.0, y: 75.0 },

      // ── Chult / Tashalar ─────────────────────────────────────────────────
      { name: 'Mezro',               x: 65.5, y: 60.0 },
      { name: 'Port Nyranzaru',      x: 64.0, y: 58.0 },
      { name: 'Port Castigliar',     x: 66.0, y: 59.0 },
      { name: 'Refuge Bay',          x: 67.0, y: 60.0 },
      { name: 'Omu',                 x: 64.0, y: 62.0 },
      { name: 'Wyrmheart\'s Mine',   x: 62.0, y: 64.0 },
      { name: 'Ishau',               x: 67.0, y: 62.0 },
      { name: 'Fort Beluarian',      x: 64.0, y: 56.0 },
      { name: 'Jungles of Chult',    x: 66.0, y: 61.0 },
      { name: 'The Peaks of Flame',  x: 65.0, y: 63.0 },

      // ── Other / Misc ─────────────────────────────────────────────────────
      { name: 'The Shining Sea',     x: 35.0, y: 70.0 },
      { name: 'Sea of Fallen Stars', x: 55.0, y: 42.0 },
      { name: 'The Moonsea',         x: 50.0, y: 26.0 },
      { name: 'Cormanthor',          x: 53.0, y: 32.0 },
      { name: 'High Forest',         x: 28.0, y: 25.0 },
      { name: 'Greenwood',           x: 30.0, y: 24.0 },
      { name: 'The Forgotten Forest',x: 30.0, y: 33.0 },
      { name: 'The Misty Forest',    x: 23.0, y: 33.0 },
      { name: 'Cloud Peaks',         x: 21.0, y: 56.0 },
      { name: 'Spine of the World',  x: 22.0, y: 10.0 },
      { name: 'Sea of Swords',       x: 12.0, y: 35.0 },
      { name: 'Trackless Sea',       x: 8.0,  y: 42.0 },
      { name: 'The Sword Coast',     x: 14.0, y: 28.0 },
      { name: 'Tortured Land',       x: 60.0, y: 5.0  },

      // ── Inseln ───────────────────────────────────────────────────────────
      { name: 'Moonshae Isles',      x: 8.0,  y: 32.0 },
      { name: 'Caer Callidyrr',      x: 8.0,  y: 30.0 },
      { name: 'Caer Corwell',        x: 7.0,  y: 38.0 },
      { name: 'Iron Keep',           x: 8.0,  y: 32.0 },
      { name: 'Alaron',              x: 11.0, y: 32.0 },
      { name: 'Gwynneth',            x: 8.0,  y: 37.0 },
      { name: 'Moray',               x: 5.0,  y: 38.0 },
      { name: 'Snowdown',            x: 11.0, y: 38.0 },
      { name: 'Norland',             x: 1.0,  y: 34.0 },
      { name: 'Mintarn',             x: 13.0, y: 32.0 },
      { name: 'Ruathym',             x: 6.0,  y: 28.0 },
      { name: 'Gundarlun',           x: 14.0, y: 22.0 },
      { name: 'Mydrauls Child',      x: 5.0,  y: 30.0 },
      { name: 'Inthar',              x: 4.0,  y: 33.0 },
      { name: 'Karinn Archipelago',  x: 9.0,  y: 38.0 },
      { name: 'The Whalebones',      x: 13.0, y: 30.0 },
      { name: 'Flamsterd',           x: 6.0,  y: 41.0 },
      { name: 'Velen (Duchy)',       x: 16.5, y: 41.0 },
      { name: 'Nelanthor Isles',     x: 14.0, y: 44.0 },
      { name: 'Lantan',              x: 32.0, y: 65.0 },
      { name: 'Nimbral',             x: 32.0, y: 78.0 },
      { name: 'Evermeet',            x: 1.0,  y: 50.0 },
      { name: 'Pirate Isles',        x: 58.0, y: 44.0 },
      { name: 'Sambar',              x: 53.0, y: 56.0 },
    ],
  },
  {
    id: 1,
    name: 'Faerûn Extended',
    url: '/faerun-extended.jpg',
    w: 20000, h: 10886,
    initScale: 0.06,
    locations: [
      // ── Faerûn – Sword Coast ─────────────────────────────────────────────
      { name: 'Waterdeep',        x: 13.4, y: 25.5 },
      { name: 'Neverwinter',      x: 12.3, y: 18.7 },
      { name: 'Luskan',           x: 12.8, y: 17.6 },
      { name: 'Port Llast',       x: 12.5, y: 19.5 },
      { name: 'Leilon',           x: 12.6, y: 21.5 },
      { name: 'Daggerford',       x: 12.8, y: 27.5 },
      { name: 'Phandalin',        x: 14.5, y: 24.0 },
      { name: 'Secomber',         x: 15.5, y: 30.0 },
      { name: 'Boareskyr Bridge', x: 14.0, y: 33.5 },
      { name: 'Soubar',           x: 14.0, y: 35.0 },
      { name: "Baldur's Gate",    x: 13.0, y: 39.0 },
      { name: 'Beregost',         x: 13.0, y: 40.5 },
      { name: 'Nashkel',          x: 13.5, y: 41.5 },
      { name: 'Candlekeep',       x: 12.8, y: 41.5 },
      { name: 'Elturel',          x: 15.6, y: 37.1 },

      // ── Faerûn – The North & Icewind Dale ────────────────────────────────
      { name: 'Icewind Dale',     x: 15.5, y: 11.0 },
      { name: 'Bryn Shander',     x: 15.5, y: 11.5 },
      { name: 'Targos',           x: 15.4, y: 11.0 },
      { name: 'Easthaven',        x: 16.0, y: 12.0 },
      { name: 'Mirabar',          x: 13.4, y: 14.6 },
      { name: 'Mithral Hall',     x: 15.9, y: 19.2 },
      { name: 'Silverymoon',      x: 17.3, y: 17.7 },
      { name: 'Everlund',         x: 16.5, y: 18.5 },
      { name: 'Sundabar',         x: 18.2, y: 17.0 },
      { name: 'Citadel Adbar',    x: 19.0, y: 15.0 },
      { name: 'Longsaddle',       x: 14.8, y: 22.0 },
      { name: 'Triboar',          x: 15.5, y: 24.5 },
      { name: 'Yartar',           x: 15.8, y: 25.5 },
      { name: 'Loudwater',        x: 17.0, y: 23.5 },

      // ── Faerûn – Heartlands ──────────────────────────────────────────────
      { name: 'Scornubel',        x: 15.3, y: 36.0 },
      { name: 'Berdusk',          x: 15.8, y: 36.5 },
      { name: 'Iriaebor',         x: 17.2, y: 35.6 },
      { name: 'Darkhold',         x: 17.5, y: 33.0 },
      { name: 'Elturgard',        x: 15.5, y: 38.0 },

      // ── Faerûn – Amn / Tethyr / Calimshan ────────────────────────────────
      { name: 'Athkatla',         x: 14.1, y: 44.5 },
      { name: 'Murann',           x: 13.5, y: 46.5 },
      { name: 'Crimmor',          x: 14.5, y: 45.5 },
      { name: 'Trademeet',        x: 14.5, y: 45.0 },
      { name: 'Zazesspur',        x: 13.5, y: 48.5 },
      { name: 'Memnon',           x: 13.8, y: 47.3 },
      { name: 'Myratma',          x: 14.0, y: 50.0 },
      { name: 'Darromar',         x: 14.5, y: 50.0 },
      { name: 'Calimport',        x: 14.1, y: 51.4 },
      { name: 'Almraiven',        x: 15.5, y: 52.5 },
      { name: 'Saradush',         x: 16.0, y: 49.0 },

      // ── Faerûn – Moonsea / Vaasa / Damara ────────────────────────────────
      { name: 'Zhentil Keep',     x: 20.2, y: 24.3 },
      { name: 'Phlan',            x: 20.5, y: 24.5 },
      { name: 'Hillsfar',         x: 20.5, y: 25.6 },
      { name: 'Mulmaster',        x: 22.3, y: 24.1 },
      { name: 'Melvaunt',         x: 22.0, y: 23.5 },
      { name: 'Thentia',          x: 21.5, y: 25.0 },
      { name: 'Heliogabalus',     x: 24.0, y: 19.0 },
      { name: 'Bloodstone Pass',  x: 23.5, y: 18.5 },
      { name: 'Palischuk',        x: 23.0, y: 17.5 },
      { name: 'Trailsend',        x: 23.5, y: 19.5 },
      { name: 'Vaasa',            x: 23.0, y: 16.0 },
      { name: 'Damara',           x: 24.0, y: 19.0 },

      // ── Faerûn – Cormyr / Dales / Sembia / Vast / Impiltur ───────────────
      { name: 'Suzail',           x: 20.5, y: 30.6 },
      { name: 'Arabel',           x: 20.5, y: 28.5 },
      { name: 'Marsember',        x: 21.0, y: 31.0 },
      { name: 'Shadowdale',       x: 21.1, y: 28.0 },
      { name: 'Myth Drannor',     x: 21.5, y: 27.5 },
      { name: 'Mistledale',       x: 21.0, y: 28.5 },
      { name: 'Highmoon',         x: 22.0, y: 29.0 },
      { name: 'Selgaunt',         x: 22.3, y: 32.2 },
      { name: 'Saerloon',         x: 22.0, y: 33.5 },
      { name: 'Ordulin',          x: 21.5, y: 30.5 },
      { name: 'Daerlun',          x: 21.5, y: 31.0 },
      { name: 'Procampur',        x: 23.0, y: 31.0 },
      { name: 'Tantras',          x: 22.5, y: 31.0 },
      { name: 'Ravens Bluff',     x: 22.5, y: 30.5 },
      { name: 'Lyrabar',          x: 25.0, y: 28.5 },
      { name: 'Sarshel',          x: 24.5, y: 27.5 },

      // ── Faerûn – Dragon Coast / Turmish / Vilhon Reach / Chessenta ───────
      { name: 'Westgate',         x: 20.3, y: 34.4 },
      { name: 'Alaghôn',          x: 21.1, y: 35.3 },
      { name: 'Cimbar',           x: 23.5, y: 35.5 },
      { name: 'Luthcheq',         x: 23.5, y: 34.5 },
      { name: 'Hlondeth',          x: 22.0, y: 36.5 },
      { name: 'Innarlith',        x: 22.5, y: 38.0 },
      { name: 'Arrabar',          x: 22.5, y: 37.0 },

      // ── Thay & East ──────────────────────────────────────────────────────
      { name: 'Eltabbar',         x: 26.7, y: 24.5 },
      { name: 'Bezantur',         x: 25.8, y: 27.8 },
      { name: 'Surthay',          x: 26.0, y: 22.5 },
      { name: 'Tyraturos',        x: 26.5, y: 25.5 },
      { name: 'Pyarados',         x: 27.0, y: 24.5 },

      // ── Aglarond / Rashemen / Thesk ──────────────────────────────────────
      { name: 'Velprintalar',     x: 28.2, y: 28.0 },
      { name: 'Immilmar',         x: 27.1, y: 17.4 },
      { name: 'Mulsantir',        x: 27.5, y: 23.0 },
      { name: 'Citadel Rashemar', x: 28.5, y: 17.0 },
      { name: 'Thesk',            x: 29.5, y: 20.5 },
      { name: 'Phsant',           x: 29.0, y: 24.0 },
      { name: 'Telflamm',         x: 29.5, y: 25.5 },
      { name: 'Rashemen',         x: 28.0, y: 17.0 },
      { name: 'Aglarond',         x: 28.0, y: 27.0 },
      { name: 'Narfell',          x: 29.0, y: 14.2 },
      { name: 'The Great Dale',   x: 28.0, y: 19.5 },

      // ── Unther / Mulhorand / Murghôm ─────────────────────────────────────
      { name: 'Unthalass',        x: 25.3, y: 40.5 },
      { name: 'Messemprar',       x: 26.0, y: 40.5 },
      { name: 'Skuld',            x: 26.4, y: 45.8 },
      { name: 'Sultim',           x: 27.0, y: 34.5 },
      { name: 'Mulhorand',        x: 27.0, y: 44.0 },
      { name: 'Murghôm',          x: 29.0, y: 32.5 },

      // ── Southern Realms ──────────────────────────────────────────────────
      { name: 'Halruaa',          x: 21.0, y: 56.2 },
      { name: 'Halagard',         x: 21.0, y: 56.5 },
      { name: 'Halarahh',         x: 21.5, y: 57.0 },
      { name: 'Dambrath',         x: 22.3, y: 57.2 },
      { name: 'Lapaliiya',        x: 20.2, y: 52.8 },
      { name: 'Luiren',           x: 24.0, y: 56.5 },
      { name: 'Beluir',           x: 24.0, y: 56.5 },
      { name: 'The Shaar',        x: 24.0, y: 50.0 },
      { name: 'The Great Rift',   x: 27.0, y: 50.0 },
      { name: 'Eartheart',        x: 27.0, y: 51.0 },
      { name: 'Mezro',            x: 24.5, y: 49.5 },
      { name: 'Chult',            x: 24.5, y: 50.5 },

      // ── Anauroch ─────────────────────────────────────────────────────────
      { name: 'Anauroch',         x: 21.8, y: 16.2 },
      { name: 'Ascore',           x: 19.5, y: 16.0 },
      { name: 'City of Shade',    x: 22.5, y: 18.0 },
      { name: 'Mines of Tethyamar', x: 21.5, y: 20.0 },

      // ── Kara-Tur ─────────────────────────────────────────────────────────
      { name: 'Kara-Tur',         x: 68.0, y: 28.0 },
      { name: 'Shou Lung',        x: 73.0, y: 22.0 },
      { name: 'Ama Basin',        x: 73.0, y: 7.0  },
      { name: 'T\'u Lung',        x: 75.0, y: 48.0 },
      { name: 'Wa',               x: 80.0, y: 25.0 },
      { name: 'Kozakura',         x: 83.0, y: 30.0 },
      { name: 'Khazari',          x: 60.0, y: 25.0 },
      { name: 'Tabot',            x: 58.0, y: 30.0 },
      { name: 'Koryo',            x: 80.0, y: 22.0 },
      { name: 'Tuigan',           x: 55.0, y: 14.0 },
      { name: 'Plain of Horses',  x: 50.0, y: 17.0 },

      // ── Hordelands / Endless Wastes ──────────────────────────────────────
      { name: 'Hordelands',       x: 50.0, y: 18.0 },
      { name: 'The Endless Wastes', x: 45.0, y: 20.0 },
      { name: 'Semphar',          x: 52.0, y: 22.0 },
      { name: 'Sossal',           x: 35.0, y: 8.0  },

      // ── Zakhara ──────────────────────────────────────────────────────────
      { name: 'Zakhara',          x: 30.0, y: 74.0 },
      { name: 'Huzuz',            x: 30.0, y: 76.0 },
      { name: 'Hiyal',            x: 32.0, y: 75.0 },
      { name: 'Liham',            x: 31.0, y: 78.0 },
      { name: 'Qudra',            x: 30.0, y: 72.0 },
      { name: 'Wasat',            x: 32.0, y: 77.0 },
      { name: 'Halwa',            x: 28.0, y: 73.0 },

      // ── Maztica ──────────────────────────────────────────────────────────
      { name: 'Maztica',          x: 2.0,  y: 62.0 },
      { name: 'Helmsport',        x: 3.0,  y: 60.0 },
      { name: 'Nexal',            x: 3.0,  y: 65.0 },
      { name: 'Ulatos',           x: 3.0,  y: 62.0 },
      { name: 'New Waterdeep',    x: 4.0,  y: 60.0 },

      // ── Evermeet ─────────────────────────────────────────────────────────
      { name: 'Evermeet',         x: 2.0,  y: 38.0 },
      { name: 'Leuthilspar',      x: 2.5,  y: 38.0 },

      // ── Anchorôm ─────────────────────────────────────────────────────────
      { name: 'Anchorôm',         x: 28.0, y: 5.0  },

      // ── Inseln & Sees ────────────────────────────────────────────────────
      { name: 'Moonshae Isles',   x: 10.5, y: 30.0 },
      { name: 'Lantan',           x: 12.5, y: 47.0 },
      { name: 'Nimbral',          x: 18.5, y: 56.0 },
      { name: 'Trackless Sea',    x: 7.0,  y: 35.0 },
      { name: 'Sea of Fallen Stars', x: 21.0, y: 32.0 },
      { name: 'The Shining Sea',  x: 17.0, y: 52.0 },
      { name: 'The Great Sea',    x: 25.0, y: 65.0 },
    ],
  },
  {
    id: 2,
    name: 'Sword Coast',
    url: '/sword-coast.jpg',
    w: 10200, h: 6600,
    initScale: 0.14,
    locations: [
      // ── Northern Coast ───────────────────────────────────────────────────
      { name: 'Luskan',              x: 54.0, y: 9.0  },
      { name: 'Neverwinter',         x: 52.0, y: 13.0 },
      { name: 'Port Llast',          x: 51.0, y: 17.0 },
      { name: 'Helm\'s Hold',        x: 52.5, y: 18.0 },
      { name: 'Thundertree',         x: 51.5, y: 19.5 },
      { name: 'Leilon',              x: 52.0, y: 21.0 },
      { name: 'Neverwinter Wood',    x: 54.0, y: 18.5 },
      { name: 'Mount Hotenow',       x: 56.0, y: 16.5 },
      { name: 'Gauntlgrym',          x: 56.5, y: 15.5 },
      { name: 'Morgur\'s Mound',     x: 57.0, y: 17.0 },
      { name: 'Blackford Crossing',  x: 55.0, y: 14.5 },
      { name: 'Raven Rock',          x: 54.5, y: 11.5 },
      { name: 'Mere of Dead Men',    x: 53.0, y: 24.0 },
      { name: 'Thornhold',           x: 54.0, y: 25.0 },

      // ── Waterdeep Region (Sword Coast North) ─────────────────────────────
      { name: 'Waterdeep',           x: 57.0, y: 30.0 },
      { name: 'Amphail',             x: 59.0, y: 35.0 },
      { name: 'Red Larch',           x: 64.0, y: 36.0 },
      { name: 'Goldenfields',        x: 63.0, y: 38.0 },
      { name: 'Westbridge',          x: 62.0, y: 31.0 },
      { name: 'Bargewright Inn',     x: 63.0, y: 33.0 },
      { name: 'Triboar',             x: 65.0, y: 28.0 },
      { name: 'Yartar',              x: 66.0, y: 29.0 },
      { name: 'Long Road',           x: 60.0, y: 25.0 },
      { name: 'Sword Mountains',     x: 56.0, y: 28.0 },

      // ── Phandalin / Lost Mine area ───────────────────────────────────────
      { name: 'Phandalin',           x: 57.0, y: 25.0 },
      { name: 'Wave Echo Cave',      x: 58.0, y: 26.0 },
      { name: 'Conyberry',           x: 62.0, y: 22.0 },
      { name: 'Old Owl Well',        x: 63.0, y: 23.0 },
      { name: 'Cragmaw Castle',      x: 60.0, y: 24.5 },

      // ── Middle Sword Coast ───────────────────────────────────────────────
      { name: 'Daggerford',          x: 56.0, y: 40.0 },
      { name: 'Secomber',            x: 63.0, y: 43.0 },
      { name: 'Dragonspear Castle',  x: 58.0, y: 46.0 },
      { name: 'Misty Forest',        x: 60.0, y: 42.0 },
      { name: 'Trollbark Forest',    x: 56.0, y: 44.0 },
      { name: 'Warlock\'s Crypt',    x: 55.0, y: 47.5 },
      { name: 'Olfhumbo',            x: 56.0, y: 47.0 },
      { name: 'Trielta Hills',       x: 58.0, y: 48.0 },

      // ── Southern Sword Coast ─────────────────────────────────────────────
      { name: 'Boareskyr Bridge',    x: 56.5, y: 50.0 },
      { name: 'Soubar',              x: 57.0, y: 53.0 },
      { name: "Baldur's Gate",       x: 58.0, y: 63.0 },
      { name: 'Beregost',            x: 58.0, y: 60.0 },
      { name: 'Nashkel',             x: 60.0, y: 66.0 },
      { name: 'Candlekeep',          x: 55.0, y: 67.0 },
      { name: 'River Chionthar',     x: 60.0, y: 63.0 },
      { name: 'The Fields of the Dead', x: 57.0, y: 56.0 },
      { name: 'Trollclaw Ford',      x: 57.0, y: 52.0 },
      { name: 'The Trollclaws',      x: 58.0, y: 51.0 },
      { name: 'Cloakwood',           x: 56.0, y: 62.0 },
      { name: 'Wood of Sharp Teeth', x: 60.0, y: 60.0 },
      { name: 'Fort Morninglord',    x: 65.0, y: 57.0 },
      { name: 'Elturel',             x: 65.0, y: 54.0 },
      { name: 'Elturgard',           x: 64.0, y: 56.0 },

      // ── Western Heartlands ───────────────────────────────────────────────
      { name: 'Scornubel',           x: 64.0, y: 48.0 },
      { name: 'Berdusk',             x: 66.0, y: 52.0 },
      { name: 'Iriaebor',            x: 69.0, y: 51.0 },
      { name: 'Hardbuckler',         x: 68.0, y: 49.0 },
      { name: 'Cornubel',            x: 65.0, y: 50.0 },
      { name: 'Najara',              x: 76.0, y: 49.0 },
      { name: 'Forest of Wyrms',     x: 79.0, y: 49.0 },
      { name: 'Northdark Wood',      x: 68.0, y: 49.0 },
      { name: 'Reaching Woods',      x: 66.0, y: 53.0 },
      { name: 'The Far Hills',       x: 69.0, y: 56.0 },
      { name: 'Darkhold',            x: 70.0, y: 56.0 },
      { name: 'Easting',             x: 71.0, y: 51.0 },
      { name: 'Proskur',             x: 73.0, y: 49.0 },
      { name: 'Eversult',            x: 76.0, y: 51.0 },
      { name: 'Priapurl',            x: 77.0, y: 52.0 },
      { name: 'Riatavin',            x: 67.0, y: 88.0 },

      // ── North / Icewind Dale ─────────────────────────────────────────────
      { name: 'Mirabar',             x: 59.0, y: 6.0  },
      { name: 'Icewind Dale',        x: 63.0, y: 4.0  },
      { name: 'Bryn Shander',        x: 65.0, y: 5.0  },
      { name: 'Targos',              x: 64.0, y: 4.5  },
      { name: 'Termalaine',          x: 64.5, y: 4.0  },
      { name: 'Lonelywood',          x: 63.0, y: 3.5  },
      { name: 'Caer-Konig',          x: 66.0, y: 4.5  },
      { name: 'Caer-Dineval',        x: 66.0, y: 5.0  },
      { name: 'Easthaven',           x: 67.0, y: 6.0  },
      { name: 'Dougan\'s Hole',      x: 65.5, y: 6.5  },
      { name: 'Reghed Glacier',      x: 68.0, y: 1.0  },
      { name: 'Sea of Moving Ice',   x: 62.0, y: 2.0  },
      { name: 'The Spine of the World', x: 62.0, y: 8.0 },
      { name: 'Great Worm Cavern',   x: 65.0, y: 9.0  },
      { name: 'The Lurkwood',        x: 65.0, y: 11.0 },
      { name: 'Kingdom of Many Arrows', x: 67.0, y: 7.0 },
      { name: 'River Mirar',         x: 62.0, y: 11.0 },
      { name: 'Cold Wood',           x: 70.0, y: 9.0  },
      { name: 'Beorunna\'s Well',    x: 70.0, y: 10.5 },

      // ── Silver Marches ───────────────────────────────────────────────────
      { name: 'Silverymoon',         x: 71.0, y: 17.0 },
      { name: 'Everlund',            x: 70.0, y: 18.0 },
      { name: 'Sundabar',            x: 76.0, y: 16.0 },
      { name: 'Mithral Hall',        x: 71.0, y: 15.5 },
      { name: 'Citadel Adbar',       x: 80.0, y: 12.0 },
      { name: 'Citadel Felbarr',     x: 73.0, y: 13.5 },
      { name: 'Menzoberranzan',      x: 67.5, y: 16.5 },
      { name: 'Settlestone',         x: 70.0, y: 16.0 },
      { name: 'One Stone',           x: 72.0, y: 14.0 },
      { name: 'Quaervarr',           x: 70.0, y: 15.5 },
      { name: 'River Surbrin',       x: 71.0, y: 11.0 },
      { name: 'River Rauvin',        x: 73.0, y: 17.0 },
      { name: 'Stone Stand',         x: 76.0, y: 17.0 },
      { name: 'The Evermoors',       x: 68.0, y: 18.5 },
      { name: 'Hellgate Keep',       x: 68.0, y: 19.0 },
      { name: 'Castle Hartwick',     x: 78.0, y: 25.0 },
      { name: 'Hartsvale',           x: 80.0, y: 26.0 },
      { name: 'The Spires',          x: 77.0, y: 26.0 },
      { name: 'Ascore',              x: 78.0, y: 30.0 },
      { name: 'Arn Forest',          x: 78.0, y: 33.0 },
      { name: 'Nether Mountains',    x: 75.0, y: 31.0 },
      { name: 'Anauroch',            x: 84.0, y: 25.0 },
      { name: 'The High Ice',        x: 85.0, y: 22.0 },
      { name: 'The Frozen Sea',      x: 82.0, y: 35.0 },
      { name: 'The Far Forest',      x: 73.0, y: 35.0 },
      { name: 'Loudwater',           x: 73.0, y: 28.0 },
      { name: 'Llorkh',              x: 76.0, y: 34.0 },

      // ── High Forest / Star Mounts ────────────────────────────────────────
      { name: 'The High Forest',     x: 72.0, y: 26.0 },
      { name: 'Star Mounts',         x: 70.0, y: 26.0 },
      { name: 'Karse',               x: 75.0, y: 25.0 },
      { name: 'Unicorn Run',         x: 70.0, y: 28.0 },
      { name: 'Southwood',           x: 74.0, y: 32.0 },
      { name: 'Grandfather Tree',    x: 75.0, y: 21.0 },
      { name: 'Delimbiyr River',     x: 65.0, y: 33.0 },

      // ── Longsaddle area ──────────────────────────────────────────────────
      { name: 'Longsaddle',          x: 64.0, y: 22.0 },
      { name: 'River Flint Rock',    x: 67.0, y: 23.5 },

      // ── The High Moor / Far East Sword Coast ─────────────────────────────
      { name: 'The High Moor',       x: 70.0, y: 38.0 },
      { name: 'Orogoth',             x: 73.0, y: 38.0 },
      { name: 'Serpent Hills',       x: 75.0, y: 42.0 },
      { name: 'Marsh of Chelimber',  x: 79.0, y: 38.0 },
      { name: 'Greycloak Hills',     x: 82.0, y: 39.0 },
      { name: 'Evereska',            x: 82.0, y: 43.0 },
      { name: 'Sunset Mountains',    x: 77.0, y: 56.0 },
      { name: 'The Storm Horns',     x: 86.0, y: 49.0 },
      { name: 'Battle of Bones',     x: 84.0, y: 48.0 },
      { name: 'Lake of Dragons',     x: 92.0, y: 47.0 },

      // ── Amn area ─────────────────────────────────────────────────────────
      { name: 'Athkatla',            x: 61.0, y: 70.0 },
      { name: 'Esmeltaran',          x: 62.0, y: 75.0 },
      { name: 'Crimmor',             x: 60.0, y: 73.0 },
      { name: 'Murann',              x: 57.0, y: 78.0 },
      { name: 'Trademeet',           x: 62.0, y: 75.0 },
      { name: 'Imnesvale',           x: 61.0, y: 76.0 },
      { name: 'The Cloud Peaks',     x: 56.0, y: 76.0 },
      { name: 'The Small Teeth',     x: 56.0, y: 80.0 },
      { name: 'Forest of Tethir',    x: 62.0, y: 88.0 },
      { name: 'Troll Mountains',     x: 67.0, y: 76.0 },
      { name: 'The Snakewood',       x: 65.0, y: 80.0 },
      { name: 'Shilmista Forest',    x: 69.0, y: 86.0 },
      { name: 'Snowflake Mountains', x: 72.0, y: 88.0 },
      { name: 'Tejarn Hills',        x: 64.0, y: 89.0 },
      { name: 'The Giant\'s Plain',  x: 72.0, y: 82.0 },
      { name: 'Green Fields',        x: 71.0, y: 73.0 },
      { name: 'The Snakewood Range', x: 66.0, y: 82.0 },

      // ── Western Sea / Inseln ─────────────────────────────────────────────
      { name: 'Moonshae Isles',      x: 35.0, y: 45.0 },
      { name: 'Sea of Moonshae',     x: 35.0, y: 40.0 },
      { name: 'Caer Callidyrr',      x: 38.0, y: 36.0 },
      { name: 'Caer Corwell',        x: 36.0, y: 50.0 },
      { name: 'Iron Keep',           x: 37.0, y: 38.0 },
      { name: 'Alaron',              x: 42.0, y: 41.0 },
      { name: 'Llewellyn',           x: 41.0, y: 43.0 },
      { name: 'Snowdown',            x: 45.0, y: 52.0 },
      { name: 'Gwynneth',            x: 35.0, y: 48.0 },
      { name: 'Moray',               x: 30.0, y: 48.0 },
      { name: 'Oman\'s Isle',        x: 33.0, y: 42.0 },
      { name: 'Norland',             x: 28.0, y: 38.0 },
      { name: 'Norheim',             x: 10.0, y: 15.0 },
      { name: 'Trodlam Range',       x: 30.0, y: 50.0 },
      { name: 'Fairheight Range',    x: 40.0, y: 38.0 },
      { name: 'Ruathym',             x: 33.0, y: 28.0 },
      { name: 'Mintarn',             x: 39.0, y: 53.0 },
      { name: 'Castle Mintarn',      x: 39.0, y: 53.0 },
      { name: 'The Purple Rocks',    x: 39.0, y: 16.0 },
      { name: 'Gundarlun',           x: 35.0, y: 22.0 },
      { name: 'Gundbarg',            x: 35.0, y: 22.0 },
      { name: 'Tuern',               x: 26.0, y: 10.0 },
      { name: 'Northlander Isles',   x: 37.0, y: 27.0 },
      { name: 'Korinn Archipelago',  x: 41.0, y: 31.0 },
      { name: 'The Whale Bones',     x: 39.0, y: 26.0 },
      { name: 'Finback',             x: 39.5, y: 27.0 },
      { name: 'Skadaurak',           x: 50.0, y: 47.0 },
      { name: 'Orlumbor',            x: 51.0, y: 48.0 },
      { name: 'The Nelanther',       x: 47.0, y: 70.0 },
      { name: 'The Nelanthar Isles', x: 47.0, y: 70.0 },

      // ── Bodies of water / Regionen ───────────────────────────────────────
      { name: 'Sword Coast',         x: 51.0, y: 35.0 },
      { name: 'Sea of Swords',       x: 45.0, y: 58.0 },
      { name: 'Trackless Sea',       x: 25.0, y: 50.0 },
      { name: 'Sea of Fallen Stars', x: 90.0, y: 75.0 },
      { name: 'Westgate',            x: 86.0, y: 77.0 },
      { name: 'Gulthmere',           x: 89.0, y: 82.0 },
      { name: 'Orsraun Mountains',   x: 91.0, y: 86.0 },
      { name: 'Turmish',             x: 95.0, y: 85.0 },
      { name: 'The Flooded Forest',  x: 85.0, y: 85.0 },
      { name: 'The Vilhon Reach',    x: 95.0, y: 92.0 },
      { name: 'The Aphrunn Mountains', x: 95.0, y: 88.0 },
      { name: 'The Shining Plains',  x: 96.0, y: 78.0 },
      { name: 'Sembia',              x: 92.0, y: 70.0 },
      { name: 'Cormyr',              x: 85.0, y: 65.0 },
      { name: 'The Dragonmere',      x: 90.0, y: 65.0 },
      { name: 'The Daleland',        x: 90.0, y: 55.0 },
      { name: 'Cormanthor',          x: 92.0, y: 55.0 },
      { name: 'Myth Drannor',        x: 91.0, y: 56.0 },
      { name: 'Sembia (Region)',     x: 93.0, y: 70.0 },
      { name: 'Hillsfar',            x: 93.0, y: 50.0 },
      { name: 'Zhentil Keep',        x: 89.0, y: 49.0 },
      { name: 'Thar',                x: 96.0, y: 48.0 },
      { name: 'The Ride',            x: 90.0, y: 45.0 },
      { name: 'White Peaks',         x: 86.0, y: 43.0 },
      { name: 'Border Forest',       x: 84.0, y: 47.0 },
      { name: 'Yrev Wud',            x: 93.0, y: 44.0 },
      { name: 'Vesperin Woods',      x: 86.0, y: 50.0 },
      { name: 'Hullack Forest',      x: 85.0, y: 65.0 },
      { name: 'Thunder Peaks',       x: 88.0, y: 65.0 },
      { name: 'Archwood',            x: 90.0, y: 66.0 },
      { name: 'Ordulin',             x: 95.0, y: 68.0 },
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
    const q = val.trim().toLowerCase()
    if (!q) {
      updateMS({ search: val, searchResults: [] })
      return
    }
    // Score: 0 = exact, 1 = startsWith, 2 = wordStart, 3 = contains
    const scored = activeMap.locations
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
    updateMS({ search: val, searchResults: scored })
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
