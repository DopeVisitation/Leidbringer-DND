import { NextResponse } from 'next/server'

const STAT_IDS: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }

const ALIGNMENTS: Record<number, string> = {
  1: 'Rechtschaffen Gut', 2: 'Neutral Gut', 3: 'Chaotisch Gut',
  4: 'Rechtschaffen Neutral', 5: 'Neutral', 6: 'Chaotisch Neutral',
  7: 'Rechtschaffen Böse', 8: 'Neutral Böse', 9: 'Chaotisch Böse',
}

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

function modAt(score: number): number { return Math.floor((score - 10) / 2) }
function fmtBonus(n: number): string { return n >= 0 ? `+${n}` : `${n}` }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') ?? ''

  const match = url.match(/characters\/(\d+)/)
  if (!match) return NextResponse.json({ error: 'Ungültige DnD Beyond URL' }, { status: 400 })

  const characterId = match[1]

  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'Charakter nicht gefunden oder privat' }, { status: 404 })

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
      const name = STAT_IDS[s.id]; if (name) baseStats[name] = s.value ?? 10
    }
    for (const s of (char.overrideStats ?? [])) {
      const name = STAT_IDS[s.id]; if (name && s.value != null) baseStats[name] = s.value
    }
    for (const bonus of (char.bonusStats ?? [])) {
      const name = STAT_IDS[bonus.id]; if (name && bonus.value) baseStats[name] = (baseStats[name] ?? 10) + bonus.value
    }

    const mods = allModifiers(char)
    for (const m of mods) {
      if (m.type === 'bonus' && m.value) {
        const map: Record<string, string> = {
          'strength-score': 'STR', 'dexterity-score': 'DEX', 'constitution-score': 'CON',
          'intelligence-score': 'INT', 'wisdom-score': 'WIS', 'charisma-score': 'CHA',
        }
        const stat = map[m.subType]; if (stat) baseStats[stat] = (baseStats[stat] ?? 10) + m.value
      }
    }

    // ── HP ────────────────────────────────────────────────────────────────
    // Use baseHitPoints stored by DnD Beyond (no re-calculation = no off-by-one errors)
    const overrideHp: number | null = char.overrideHitPoints ?? null
    const conMod = modAt(baseStats['CON'] ?? 10)
    const maxHp = overrideHp ?? ((char.baseHitPoints ?? 0) + totalLevel * conMod + (char.bonusHitPoints ?? 0))
    const removedHp: number = char.removedHitPoints ?? 0
    const currentHp = maxHp - removedHp

    // ── Proficiency bonus ────────────────────────────────────────────────
    const profBonus = Math.ceil(totalLevel / 4) + 1

    // ── Speed ────────────────────────────────────────────────────────────
    const speed: number = char.race?.weightSpeeds?.normal?.walk ?? 30

    // ── Initiative ───────────────────────────────────────────────────────
    let initiative = modAt(baseStats['DEX'] ?? 10)
    for (const m of mods) {
      if (m.type === 'bonus' && m.subType === 'initiative' && typeof m.value === 'number') initiative += m.value
    }

    // ── Skills ───────────────────────────────────────────────────────────
    const skills = SKILLS.map((s) => {
      const isProf = mods.some((m) => m.type === 'proficiency' && m.subType === s.key)
      const isExp  = mods.some((m) => m.type === 'expertise'   && m.subType === s.key)
      const isHalf = mods.some((m) => (m.type === 'half-proficiency' || m.type === 'half-proficiency-round-up') && m.subType === s.key)
      const abilityMod = modAt(baseStats[s.ability] ?? 10)
      let bonus = abilityMod
      if (isExp) bonus += profBonus * 2
      else if (isProf) bonus += profBonus
      else if (isHalf) bonus += Math.floor(profBonus / 2)
      for (const m of mods) {
        if (m.type === 'bonus' && m.subType === s.key && typeof m.value === 'number') bonus += m.value
      }
      return { key: s.key, name: s.name, nameDe: s.nameDe, ability: s.ability, proficient: isProf, expertise: isExp, halfProficient: isHalf, bonus }
    })

    // ── Saving Throws ─────────────────────────────────────────────────────
    const SAVE_KEYS: Record<string, string> = {
      STR: 'strength-saving-throws', DEX: 'dexterity-saving-throws',
      CON: 'constitution-saving-throws', INT: 'intelligence-saving-throws',
      WIS: 'wisdom-saving-throws', CHA: 'charisma-saving-throws',
    }
    const saves = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((ab) => {
      const saveKey = SAVE_KEYS[ab]
      const isProf = mods.some((m) => m.type === 'proficiency' && m.subType === saveKey)
      const abilityMod = modAt(baseStats[ab] ?? 10)
      let bonus = abilityMod + (isProf ? profBonus : 0)
      // Bonus modifiers from items/feats (e.g. Cloak of Protection = +1 to all saves)
      for (const m of mods) {
        if (m.type === 'bonus' && typeof m.value === 'number') {
          if (m.subType === saveKey || m.subType === 'saving-throws') bonus += m.value
        }
      }
      return { ability: ab, proficient: isProf, bonus }
    })

    // ── Passive stats ─────────────────────────────────────────────────────
    const perceptionSkill = skills.find((s) => s.key === 'perception')
    const investigationSkill = skills.find((s) => s.key === 'investigation')
    const insightSkill = skills.find((s) => s.key === 'insight')
    const passive_perception   = 10 + (perceptionSkill?.bonus ?? 0)
    const passive_investigation = 10 + (investigationSkill?.bonus ?? 0)
    const passive_insight      = 10 + (insightSkill?.bonus ?? 0)

    // ── Darkvision ────────────────────────────────────────────────────────
    let darkvision = 0
    for (const m of mods) {
      if (m.type === 'set-base' && m.subType === 'darkvision' && typeof m.value === 'number') {
        darkvision = Math.max(darkvision, m.value)
      }
    }

    // ── Inventory ─────────────────────────────────────────────────────────
    interface InventoryItem {
      definition?: {
        name?: string; type?: string; filterType?: string
        armorClass?: number; armorTypeId?: number
        damage?: { diceString?: string }; damageType?: string
        properties?: { name: string }[]
        attackType?: number; range?: number; longRange?: number
        weight?: number; description?: string
        isConsumable?: boolean; tags?: string[]
        grantedModifiers?: DnDModifier[]
      }
      equipped?: boolean; quantity?: number
      id?: number; entityTypeId?: number
    }
    const inv: InventoryItem[] = char.inventory ?? []

    const armor = inv
      .filter((it) => it.definition?.filterType === 'Armor' || it.definition?.type === 'Shield')
      .map((it) => ({
        name: it.definition?.name ?? 'Unbekannt',
        type: it.definition?.type ?? '',
        armorTypeId: it.definition?.armorTypeId ?? 0,
        armorClass: it.definition?.armorClass ?? null,
        equipped: !!it.equipped,
      }))

    const weapons = inv
      .filter((it) => it.definition?.filterType === 'Weapon' || it.definition?.type === 'Weapon')
      .map((it) => {
        const def = it.definition!
        const props = (def.properties ?? []).map((p) => p.name).filter(Boolean)
        const isFinesse = props.includes('Finesse')
        const isRanged  = def.attackType === 2 || (def.range ?? 0) > 5
        const strMod = modAt(baseStats['STR'] ?? 10)
        const dexMod = modAt(baseStats['DEX'] ?? 10)
        const atkMod = isRanged ? dexMod : isFinesse ? Math.max(strMod, dexMod) : strMod
        // Check for magic bonus on this weapon from modifiers granted
        let magicBonus = 0
        for (const gm of (def.grantedModifiers ?? [])) {
          if (gm.type === 'bonus' && (gm.subType === 'magic' || gm.subType === 'attack') && typeof gm.value === 'number') magicBonus = Math.max(magicBonus, gm.value)
        }
        return {
          name: def.name ?? 'Unbekannt',
          damage: def.damage?.diceString ?? '',
          damageType: def.damageType ?? '',
          properties: props,
          attackBonus: atkMod + profBonus + magicBonus,
          damageBonus: atkMod + magicBonus,
          range: def.range ?? null, longRange: def.longRange ?? null,
          equipped: !!it.equipped,
        }
      })

    // Custom actions (DnD Beyond custom attacks)
    interface CustomAction {
      name?: string; toHit?: number; damage?: string; damageTypeId?: number
      range?: number; longRange?: number; isMartialArts?: boolean; id?: number
      fixedSaveDc?: number; isProficient?: boolean; abilityModifierStatId?: number
    }
    const customActions: CustomAction[] = char.customActions ?? []
    const weaponsFromCustom = customActions
      .filter((a) => a.toHit !== null && a.toHit !== undefined)
      .map((a) => ({
        name: a.name ?? 'Custom Attack',
        damage: a.damage ?? '',
        damageType: '',
        properties: [],
        attackBonus: a.toHit ?? 0,
        damageBonus: 0,
        range: a.range ?? null, longRange: a.longRange ?? null,
        equipped: true,
        isCustom: true,
      }))

    const allWeapons = [...weapons, ...weaponsFromCustom]

    // ── Non-weapon, non-armor inventory items ─────────────────────────────
    const inventoryItems = inv
      .filter((it) => it.definition?.filterType !== 'Weapon' && it.definition?.filterType !== 'Armor' && it.definition?.type !== 'Shield')
      .map((it) => ({
        name: it.definition?.name ?? 'Unbekannt',
        type: it.definition?.type ?? it.definition?.filterType ?? '',
        quantity: it.quantity ?? 1,
        weight: it.definition?.weight ?? 0,
        equipped: !!it.equipped,
      }))

    // ── Tools ────────────────────────────────────────────────────────────
    const tools = mods
      .filter((m) => m.type === 'proficiency' && (
        m.subType.includes('tools') || m.subType.includes('instrument') ||
        m.subType.includes('kit')   || m.subType.includes('supplies')
      ))
      .map((m) => m.friendlySubtypeName ?? m.subType)
      .filter((v, i, a) => a.indexOf(v) === i)

    // ── Languages ────────────────────────────────────────────────────────
    const languages = mods
      .filter((m) => m.type === 'language')
      .map((m) => m.friendlySubtypeName ?? m.subType)
      .filter((v, i, a) => a.indexOf(v) === i)

    // ── Armor Class (FIXED) ───────────────────────────────────────────────
    // Priority: overrideArmorClass → computed
    let ac: number
    if (char.overrideArmorClass != null && char.overrideArmorClass > 0) {
      ac = char.overrideArmorClass
    } else {
      let baseAC = 10 + modAt(baseStats['DEX'] ?? 10) // Unarmored default

      // Check 'set' type modifiers (Mage Armor = 13+DEX, Bracers of Defense = 13+DEX, etc.)
      for (const m of mods) {
        if (m.type === 'set' && typeof m.value === 'number') {
          if (m.subType === 'unarmored-armor-class') {
            baseAC = Math.max(baseAC, m.value + modAt(baseStats['DEX'] ?? 10))
          } else if (m.subType === 'armor-class') {
            baseAC = Math.max(baseAC, m.value)
          }
        }
      }

      // Equipped armor (fix: use armorTypeId, not type string)
      const equippedArmor = armor.find((a) => a.equipped && a.armorClass && a.armorTypeId !== 0 && a.type !== 'Shield')
      if (equippedArmor?.armorClass) {
        const dx = modAt(baseStats['DEX'] ?? 10)
        const typeId = equippedArmor.armorTypeId ?? 0
        let armorAC = equippedArmor.armorClass
        if (typeId === 1)      armorAC += dx               // Light Armor
        else if (typeId === 2) armorAC += Math.min(dx, 2)  // Medium Armor
        // Heavy (typeId === 3): no DEX added
        baseAC = Math.max(baseAC, armorAC)
      }

      // Shield
      const equippedShield = armor.find((a) => a.equipped && a.type === 'Shield')
      if (equippedShield) baseAC += 2

      // Bonus modifiers (rings, bracers, etc.)
      for (const m of mods) {
        if (m.type === 'bonus' && m.subType === 'armor-class' && typeof m.value === 'number') baseAC += m.value
      }

      ac = baseAC
    }

    // ── Spellcasting ability & derived stats ──────────────────────────────
    const SC_ABILITY_BY_ID: Record<number, string> = { 1:'STR', 2:'DEX', 3:'CON', 4:'INT', 5:'WIS', 6:'CHA' }
    const primaryClass = (char.classes ?? [])[0]
    const spellcastingAbility = SC_ABILITY_BY_ID[primaryClass?.spellCastingAbilityId ?? 4] ?? 'INT'
    const spellcastingMod = modAt(baseStats[spellcastingAbility] ?? 10)
    const spellAttackBonus = spellcastingMod + profBonus
    const spellSaveDC = 8 + spellcastingMod + profBonus

    // ── Spells ────────────────────────────────────────────────────────────
    interface SpellSlotItem {
      alwaysPrepared?: boolean
      prepared?: boolean
      definition?: {
        name?: string; level?: number; school?: string
        attackType?: number; saveStatId?: number; range?: { origin?: string; rangeValue?: number }
        description?: string; duration?: { durationUnit?: string; durationInterval?: number }
        castingTimeDescription?: string; components?: number[]
      }
    }
    const classSpells = (char.classSpells ?? []).flatMap((c: { spells?: SpellSlotItem[] }) => c.spells ?? [])
    const additionalSpells = [...(char.spells?.race ?? []), ...(char.spells?.background ?? []), ...(char.spells?.class ?? [])]
    const allSpells = [...classSpells, ...additionalSpells]
    const spells = allSpells
      .map((s: SpellSlotItem) => ({
        name: s.definition?.name ?? '',
        level: s.definition?.level ?? 0,
        school: s.definition?.school ?? '',
        attackType: s.definition?.attackType ?? null,
        alwaysPrepared: s.alwaysPrepared ?? false,
        prepared: s.prepared ?? false,
      }))
      .filter((s) => s.name)

    // ── Spell slots ───────────────────────────────────────────────────────
    const rawSlots: Record<string, { used: number; available: number }> = {}
    const spellSlotInfo = char.spellSlots ?? []
    for (const slot of spellSlotInfo) {
      const lvl = slot.level ?? slot.spellLevel
      if (lvl) rawSlots[`${lvl}`] = { used: slot.used ?? 0, available: slot.available ?? 0 }
    }

    // ── Features ─────────────────────────────────────────────────────────
    interface FeatureDef { name?: string; description?: string; snippet?: string; requiredLevel?: number }
    const features: { name: string; source: string; description: string; level?: number }[] = []

    // Class features
    for (const cls of (char.classes ?? [])) {
      const className: string = cls.definition?.name ?? 'Class'
      const subName: string | undefined = cls.subclassDefinition?.name
      for (const feat of (cls.classFeatures ?? [])) {
        const d: FeatureDef = feat.definition ?? feat
        if (d.name && feat.requiredLevel <= cls.level) {
          features.push({
            name: d.name,
            source: subName && (feat.classFeatureTypeId === 2 || feat.id > 10000) ? subName : className,
            description: d.description ?? d.snippet ?? '',
            level: feat.requiredLevel,
          })
        }
      }
      for (const feat of (cls.subclassDefinition?.classFeatures ?? [])) {
        const d: FeatureDef = feat.definition ?? feat
        if (d.name && feat.requiredLevel <= cls.level) {
          features.push({
            name: d.name,
            source: subName ?? className,
            description: d.description ?? d.snippet ?? '',
            level: feat.requiredLevel,
          })
        }
      }
    }

    // Race traits
    for (const trait of (char.race?.racialTraits ?? [])) {
      const d: FeatureDef = trait.definition ?? trait
      if (d.name) features.push({ name: d.name, source: char.race?.fullName ?? 'Race', description: d.description ?? '' })
    }

    // Feats
    for (const feat of (char.feats ?? [])) {
      const d: FeatureDef = feat.definition ?? feat
      if (d.name) features.push({ name: d.name, source: 'Feat', description: d.description ?? '' })
    }

    // ── Currencies ───────────────────────────────────────────────────────
    const currencies = {
      cp: char.currencies?.cp ?? 0, sp: char.currencies?.sp ?? 0,
      ep: char.currencies?.ep ?? 0, gp: char.currencies?.gp ?? 0,
      pp: char.currencies?.pp ?? 0,
    }

    // ── Character notes / traits ──────────────────────────────────────────
    const characterNotes = {
      personalityTraits: char.traits?.personalityTraits ?? '',
      ideals:            char.traits?.ideals ?? '',
      bonds:             char.traits?.bonds ?? '',
      flaws:             char.traits?.flaws ?? '',
      backstory:         char.notes?.backstory ?? '',
      appearance:        char.traits?.appearance ?? '',
    }

    // ── Background feature ────────────────────────────────────────────────
    const backgroundFeature = char.background?.definition?.featureDescription ?? ''
    const backgroundName    = char.background?.definition?.name ?? ''

    // ── Final response ────────────────────────────────────────────────────
    return NextResponse.json({
      character_name: char.name ?? 'Unbekannt',
      class_name: classString || 'Unbekannt',
      level: totalLevel || 1,
      race: char.race?.fullName ?? char.race?.baseName ?? '',
      background: backgroundName,
      background_feature: backgroundFeature,
      alignment: ALIGNMENTS[char.alignmentId] ?? '',
      avatar_url: char.decorations?.avatarUrl ?? null,
      stats: baseStats,
      max_hp: maxHp,
      current_hp: currentHp,
      armor_class: ac,
      proficiency_bonus: profBonus,
      speed,
      initiative,
      inspiration: char.inspiration ?? false,
      passive_perception, passive_investigation, passive_insight,
      darkvision,
      skills,
      saves,
      armor,
      weapons: allWeapons,
      tools,
      languages,
      spells,
      spell_slots: rawSlots,
      spellcasting_ability: spellcastingAbility,
      spell_attack_bonus: spellAttackBonus,
      spell_save_dc: spellSaveDC,
      features,
      inventory_items: inventoryItems,
      currencies,
      character_notes: characterNotes,
    })
  } catch (e) {
    console.error('DnD Beyond fetch failed', e)
    return NextResponse.json({ error: 'Fehler beim Laden des Charakters' }, { status: 500 })
  }
}
