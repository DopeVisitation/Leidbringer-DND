import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') ?? ''

  // Extract character ID from URL like https://www.dndbeyond.com/characters/45250671
  const match = url.match(/characters\/(\d+)/)
  if (!match) {
    return NextResponse.json({ error: 'Ungültige DnD Beyond URL' }, { status: 400 })
  }

  const characterId = match[1]

  try {
    // DnD Beyond character service (works for public characters)
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 300 }, // cache 5 min
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Charakter nicht gefunden oder privat' },
        { status: 404 }
      )
    }

    const json = await res.json()
    const char = json?.data

    if (!char) {
      return NextResponse.json({ error: 'Keine Daten' }, { status: 404 })
    }

    // Calculate total level
    const totalLevel = (char.classes ?? []).reduce(
      (sum: number, c: { level: number }) => sum + (c.level ?? 0),
      0
    )

    // Build class string (e.g. "Fighter 5 / Wizard 3")
    const classString = (char.classes ?? [])
      .map((c: { level: number; definition?: { name: string } }) =>
        `${c.definition?.name ?? 'Unknown'} ${c.level}`
      )
      .join(' / ')

    return NextResponse.json({
      character_name: char.name ?? 'Unbekannt',
      class_name: classString || 'Unbekannt',
      level: totalLevel || 1,
      race: char.race?.fullName ?? char.race?.baseName ?? '',
      avatar_url: char.decorations?.avatarUrl ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Laden des Charakters' },
      { status: 500 }
    )
  }
}
