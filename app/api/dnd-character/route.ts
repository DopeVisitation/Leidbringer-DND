import { NextResponse } from 'next/server'

const STAT_IDS: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }

const ALIGNMENTS: Record<number, string> = {
  1: 'Rechtschaffen Gut', 2: 'Neutral Gut', 3: 'Chaotisch Gut',
  4: 'Rechtschaffen Neutral', 5: 'Neutral', 6: 'Chaotisch Neutral',
  7: 'Rechtschaffen Böse', 8: 'Neutral Böse', 9: 'Chaotisch Böse',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') ?? ''

  const match = url.match(/characters\/(\d+)/)
  if (!match) {
    return NextResponse.json({ error: 'Ungültige DnD Beyond URL' }, { status: 400 })
  }

  const characterId = match[1]

  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
      {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Charakter nicht gefunden oder privat' }, { status: 404 })
    }

    const json = await res.json()
    const char = json?.data
    if (!char) return NextResponse.json({ error: 'Keine Daten' }, { status: 404 })

    // Level & class
    const totalLevel = (char.classes ?? []).reduce((s: number, c: { level: number }) => s + (c.level ?? 0), 0)
    const classString = (char.classes ?? [])
      .map((c: { level: number; definition?: { name: string } }) => `${c.definition?.name ?? 'Unknown'} ${c.level}`)
      .join(' / ')

    // Ability scores — base stats + overrides
    const baseStats: Record<string, number> = {}
    for (const s of (char.stats ?? [])) {
      const name = STAT_IDS[s.id]
      if (name) baseStats[name] = s.value ?? 10
    }
    // Apply overrides
    for (const s of (char.overrideStats ?? [])) {
      const name = STAT_IDS[s.id]
      if (name && s.value != null) baseStats[name] = s.value
    }
    // Apply bonuses from racial/class
    for (const bonus of (char.bonusStats ?? [])) {
      const name = STAT_IDS[bonus.id]
      if (name && bonus.value) baseStats[name] = (baseStats[name] ?? 10) + bonus.value
    }

    // HP
    const overrideHp: number | null = char.overrideHitPoints ?? null
    let baseHp = 0
    for (const cls of (char.classes ?? [])) {
      const hitDice: number = cls.definition?.hitDice ?? 8
      baseHp += hitDice + (cls.level - 1) * Math.ceil(hitDice / 2 + 0.5)
    }
    const conMod = Math.floor(((baseStats['CON'] ?? 10) - 10) / 2)
    const hpFromCon = totalLevel * conMod
    const maxHp = overrideHp ?? (baseHp + hpFromCon + (char.bonusHitPoints ?? 0))

    // Proficiency bonus
    const profBonus = Math.ceil(totalLevel / 4) + 1

    // Speed (default 30 from race)
    const speed: number = char.race?.weightSpeeds?.normal?.walk ?? 30

    // Initiative = DEX modifier
    const initiative = Math.floor(((baseStats['DEX'] ?? 10) - 10) / 2)

    return NextResponse.json({
      character_name: char.name ?? 'Unbekannt',
      class_name: classString || 'Unbekannt',
      level: totalLevel || 1,
      race: char.race?.fullName ?? char.race?.baseName ?? '',
      background: char.background?.definition?.name ?? '',
      alignment: ALIGNMENTS[char.alignmentId] ?? '',
      avatar_url: char.decorations?.avatarUrl ?? null,
      stats: baseStats,
      max_hp: maxHp,
      proficiency_bonus: profBonus,
      speed,
      initiative,
      inspiration: char.inspiration ?? false,
    })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden des Charakters' }, { status: 500 })
  }
}
