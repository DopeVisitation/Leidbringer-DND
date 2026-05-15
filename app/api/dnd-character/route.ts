import { NextResponse } from 'next/server'

const STAT_IDS: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }

const ALIGNMENTS: Record<number, string> = {
  1: 'Rechtschaffen Gut', 2: 'Neutral Gut', 3: 'Chaotisch Gut',
  4: 'Rechtschaffen Neutral', 5: 'Neutral', 6: 'Chaotisch Neutral',
  7: 'Rechtschaffen Böse', 8: 'Neutral Böse', 9: 'Chaotisch Böse',
}

// D&D 5e Skills mit zugehöriger Ability und deutschem Namen
const SKILLS: { key: string; ability: string; name: string; nameDe: string }[] = [
  { key: 'acrobatics',      ability: 'DEX', name: 'Acrobatics',      nameDe: 'Akrobatik' },
  { key: 'animal-handling', ability: 'WIS', name: 'Animal Handling', nameDe: 'Tierführung' },
  { key: 'arcana',          ability: 'INT', name: 'Arcana',          nameDe: 'Arkane Kunde' },
  { key: 'athletics',       ability: 'STR', name: 'Athletics',       nameDe: 'Athletik' },
  { key: 'deception',       ability: 'CHA', name: 'Deception',       nameDe: 'Täuschen' },
  { key: 'history',         ability: 'INT', name: 'History',         nameDe: 'Geschichte' },
  { key: 'insight',         ability: 'WIS', name: 'Insight',         nameDe: 'Einsicht' },
  { key: 'intimidation',    ability: 'CHA', name: 'Intimidation',    nameDe: 'Einschüchtern' },
  { key: 'investigation',   ability: 'INT', name: 'Investigation',   nameDe: 'Nachforschung' },
  { key: 'medicine',        ability: 'WIS', name: 'Medicine',        nameDe: 'Heilkunde' },
  { key: 'nature',          ability: 'INT', name: 'Nature',          nameDe: 'Naturkunde' },
  { key: 'perception',      ability: 'WIS', name: 'Perception',      nameDe: 'Wahrnehmung' },
  { key: 'performance',     ability: 'CHA', name: 'Performance',     nameDe: 'Auftreten' },
  { key: 'persuasion',      ability: 'CHA', name: 'Persuasion',      nameDe: 'Überzeugen' },
  { key: 'religion',        ability: 'INT', name: 'Religion',        nameDe: 'Religion' },
  { key: 'sleight-of-hand', ability: 'DEX', name: 'Sleight of Hand', nameDe: 'Fingerfertigkeit' },
  { key: 'stealth',         ability: 'DEX', name: 'Stealth',         nameDe: 'Heimlichkeit' },
  { key: 'survival',        ability: 'WIS', name: 'Survival',        nameDe: 'Überleben' },
]

interface DnDModifier {
  type: string
  subType: string
  friendlySubtypeName?: string
  friendlyTypeName?: string
  value?: number
  componentId?: number
  isGranted?: boolean
}

function allModifiers(char: { modifiers?: Record<string, DnDModifier[]> }): DnDModifier[] {
  const m = char.modifiers ?? {}
  return [
    ...(m.race ?? []),
    ...(m.class ?? []),
    ...(m.background ?? []),
    ...(m.item ?? []),
    ...(m.feat ?? []),
    ...(m.condition ?? []),
  ]
}

function modAt(score: number): number {
  return Math.floor((score - 10) / 2)
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

    // ── Level & class ─────────────────────────────────────────────────────
    const totalLevel = (char.classes ?? []).reduce((s: number, c: { level: number }) => s + (c.level ?? 0), 0)
    const classString = (char.classes ?? [])
      .map((c: { level: number; definition?: { name: string } }) => `${c.definition?.name ?? 'Unknown'} ${c.level}`)
      .join(' / ')

    // ── Ability scores ────────────────────────────────────────────────────
    const baseStats: Record<string, number> = {}
    for (const s of (char.stats ?? [])) {
      const name = STAT_IDS[s.id]
      if (name) baseStats[name] = s.value ?? 10
    }
    for (const s of (char.overrideStats ?? [])) {
      const name = STAT_IDS[s.id]
      if (name && s.value != null) baseStats[name] = s.value
    }
    for (const bonus of (char.bonusStats ?? [])) {
      const name = STAT_IDS[bonus.id]
      if (name && bonus.value) baseStats[name] = (baseStats[name] ?? 10) + bonus.value
    }

    // Stat-bonus modifiers (z.B. +2 STR vom Item)
    const mods = allModifiers(char)
    for (const m of mods) {
      if (m.type === 'bonus' && m.value) {
        const map: Record<string, string> = {
          'strength-score': 'STR', 'dexterity-score': 'DEX', 'constitution-score': 'CON',
          'intelligence-score': 'INT', 'wisdom-score': 'WIS', 'charisma-score': 'CHA',
        }
        const stat = map[m.subType]
        if (stat) baseStats[stat] = (baseStats[stat] ?? 10) + m.value
      }
    }

    // ── HP ────────────────────────────────────────────────────────────────
    const overrideHp: number | null = char.overrideHitPoints ?? null
    let baseHp = 0
    for (const cls of (char.classes ?? [])) {
      const hitDice: number = cls.definition?.hitDice ?? 8
      baseHp += hitDice + (cls.level - 1) * Math.ceil(hitDice / 2 + 0.5)
    }
    const conMod = modAt(baseStats['CON'] ?? 10)
    const hpFromCon = totalLevel * conMod
    const maxHp = overrideHp ?? (baseHp + hpFromCon + (char.bonusHitPoints ?? 0))

    // ── Proficiency bonus ────────────────────────────────────────────────
    const profBonus = Math.ceil(totalLevel / 4) + 1

    // ── Speed ────────────────────────────────────────────────────────────
    const speed: number = char.race?.weightSpeeds?.normal?.walk ?? 30

    // ── Initiative ───────────────────────────────────────────────────────
    const initiative = modAt(baseStats['DEX'] ?? 10)

    // ── Skills ───────────────────────────────────────────────────────────
    const skills = SKILLS.map((s) => {
      const isProf = mods.some((m) => m.type === 'proficiency' && m.subType === s.key)
      const isExp = mods.some((m) => m.type === 'expertise' && m.subType === s.key)
      const isHalfProf = mods.some(
        (m) => (m.type === 'half-proficiency' || m.type === 'half-proficiency-round-up')
          && m.subType === s.key
      )
      const abilityMod = modAt(baseStats[s.ability] ?? 10)
      let bonus = abilityMod
      if (isExp) bonus += profBonus * 2
      else if (isProf) bonus += profBonus
      else if (isHalfProf) bonus += Math.floor(profBonus / 2)

      // Extra "bonus" modifiers that explicitly target this skill
      for (const m of mods) {
        if (m.type === 'bonus' && m.subType === s.key && typeof m.value === 'number') {
          bonus += m.value
        }
      }

      return {
        key: s.key,
        name: s.name,
        nameDe: s.nameDe,
        ability: s.ability,
        proficient: isProf,
        expertise: isExp,
        halfProficient: isHalfProf,
        bonus,
      }
    })

    // ── Saving Throws ─────────────────────────────────────────────────────
    const saves = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((ab) => {
      const subType = `${ab === 'STR' ? 'strength' : ab === 'DEX' ? 'dexterity' : ab === 'CON' ? 'constitution' : ab === 'INT' ? 'intelligence' : ab === 'WIS' ? 'wisdom' : 'charisma'}-saving-throws`
      const isProf = mods.some((m) => m.type === 'proficiency' && m.subType === subType)
      const abilityMod = modAt(baseStats[ab] ?? 10)
      return {
        ability: ab,
        proficient: isProf,
        bonus: abilityMod + (isProf ? profBonus : 0),
      }
    })

    // ── Inventar: Armor, Weapons, Tools ──────────────────────────────────
    interface InventoryItem {
      definition?: {
        name?: string
        type?: string
        filterType?: string
        armorClass?: number
        armorTypeId?: number
        damage?: { diceString?: string }
        damageType?: string
        properties?: { name: string }[]
        attackType?: number
        range?: number
        longRange?: number
      }
      equipped?: boolean
      quantity?: number
    }
    const inv: InventoryItem[] = char.inventory ?? []

    const armor = inv
      .filter((it) => it.definition?.filterType === 'Armor' || it.definition?.type === 'Armor' || it.definition?.type === 'Shield')
      .map((it) => ({
        name: it.definition?.name ?? 'Unbekannt',
        type: it.definition?.type ?? '',
        armorClass: it.definition?.armorClass ?? null,
        equipped: !!it.equipped,
      }))

    const weapons = inv
      .filter((it) => it.definition?.filterType === 'Weapon' || it.definition?.type === 'Weapon')
      .map((it) => {
        const def = it.definition!
        const props = (def.properties ?? []).map((p) => p.name).filter(Boolean)
        const isFinesse = props.includes('Finesse')
        const isRanged = def.attackType === 2 || (def.range ?? 0) > 5
        // Attack stat: ranged -> DEX, finesse -> max(STR, DEX), melee -> STR
        const strMod = modAt(baseStats['STR'] ?? 10)
        const dexMod = modAt(baseStats['DEX'] ?? 10)
        const atkMod = isRanged ? dexMod : isFinesse ? Math.max(strMod, dexMod) : strMod
        return {
          name: def.name ?? 'Unbekannt',
          damage: def.damage?.diceString ?? '',
          damageType: def.damageType ?? '',
          properties: props,
          attackBonus: atkMod + profBonus,
          damageBonus: atkMod,
          range: def.range ?? null,
          longRange: def.longRange ?? null,
          equipped: !!it.equipped,
        }
      })

    // ── Tools (Proficiencies vom Typ "tool-*") ───────────────────────────
    const tools = mods
      .filter((m) => m.type === 'proficiency' && (m.subType.includes('tools') || m.subType.includes('instrument') || m.subType.includes('kit') || m.subType.includes('supplies')))
      .map((m) => m.friendlySubtypeName ?? m.subType)
      .filter((v, i, a) => a.indexOf(v) === i) // dedupe

    // ── Languages ────────────────────────────────────────────────────────
    const languages = mods
      .filter((m) => m.type === 'language')
      .map((m) => m.friendlySubtypeName ?? m.subType)
      .filter((v, i, a) => a.indexOf(v) === i)

    // ── Armor Class ──────────────────────────────────────────────────────
    // Heuristik: höchste equipped Armor + DEX-Mod (limited by armor type) + Schild
    let ac = 10 + modAt(baseStats['DEX'] ?? 10)  // unarmored default
    const equippedArmor = armor.find((a) => a.equipped && a.armorClass && a.type !== 'Shield')
    const equippedShield = armor.find((a) => a.equipped && a.type === 'Shield')
    if (equippedArmor && equippedArmor.armorClass) {
      // Light armor: full DEX. Medium: max +2. Heavy: no DEX.
      // Wir behandeln pauschal: addiere DEX wenn unter Light/Medium-Definition
      // Da das in DnD-Beyond komplex ist, lassen wir den Override (overrideArmorClass) Vorrang.
      ac = equippedArmor.armorClass
      const dx = modAt(baseStats['DEX'] ?? 10)
      // Vereinfacht: erlaube DEX-Bonus, gekappt auf 2 für Plattenrüstung
      if (equippedArmor.type?.toLowerCase().includes('light')) ac += dx
      else if (equippedArmor.type?.toLowerCase().includes('medium')) ac += Math.min(dx, 2)
    }
    if (equippedShield) ac += 2
    // AC bonus von Modifiern
    for (const m of mods) {
      if (m.type === 'bonus' && m.subType === 'armor-class' && typeof m.value === 'number') {
        ac += m.value
      }
    }
    if (char.overrideArmorClass != null) ac = char.overrideArmorClass

    // ── Spells (nur Liste der bekannten, ohne Detail) ────────────────────
    interface SpellSlotItem { definition?: { name?: string; level?: number; school?: string } }
    const classSpells = (char.classSpells ?? []).flatMap((c: { spells?: SpellSlotItem[] }) => c.spells ?? [])
    const additionalSpells = char.spells?.race ?? []
    const allSpells = [...classSpells, ...additionalSpells]
    const spells = allSpells
      .map((s: SpellSlotItem) => ({
        name: s.definition?.name ?? '',
        level: s.definition?.level ?? 0,
        school: s.definition?.school ?? '',
      }))
      .filter((s) => s.name)

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
      armor_class: ac,
      proficiency_bonus: profBonus,
      speed,
      initiative,
      inspiration: char.inspiration ?? false,
      skills,
      saves,
      armor,
      weapons,
      tools,
      languages,
      spells,
    })
  } catch (e) {
    console.error('DnD Beyond fetch failed', e)
    return NextResponse.json({ error: 'Fehler beim Laden des Charakters' }, { status: 500 })
  }
}
