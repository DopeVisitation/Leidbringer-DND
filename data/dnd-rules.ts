import type { DnDRule } from '@/types'

export const DND_RULES: DnDRule[] = [
  // ── CONDITIONS ─────────────────────────────────────────────────────────────
  {
    id: 'blinded',
    title: 'Blinded (Geblendet)',
    category: 'conditions',
    keywords: ['blinded', 'geblendet', 'sehen', 'sight'],
    content: `A blinded creature can't see and automatically fails any ability check that requires sight.
Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.`,
  },
  {
    id: 'charmed',
    title: 'Charmed (Bezaubert)',
    category: 'conditions',
    keywords: ['charmed', 'bezaubert', 'charm'],
    content: `A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.
The charmer has advantage on any ability check to interact socially with the creature.`,
  },
  {
    id: 'deafened',
    title: 'Deafened (Betäubt)',
    category: 'conditions',
    keywords: ['deafened', 'taub', 'hören', 'hearing'],
    content: `A deafened creature can't hear and automatically fails any ability check that requires hearing.`,
  },
  {
    id: 'exhaustion',
    title: 'Exhaustion (Erschöpfung)',
    category: 'conditions',
    keywords: ['exhaustion', 'erschöpfung', 'tired', 'fatigue'],
    content: `Exhaustion is measured in 6 levels.
Level 1: Disadvantage on ability checks
Level 2: Speed halved
Level 3: Disadvantage on attack rolls and saving throws
Level 4: Hit point maximum halved
Level 5: Speed reduced to 0
Level 6: Death

Finishing a long rest reduces exhaustion by 1 level (if you have food and water).`,
  },
  {
    id: 'frightened',
    title: 'Frightened (Verängstigt)',
    category: 'conditions',
    keywords: ['frightened', 'verängstigt', 'angst', 'fear'],
    content: `A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.
The creature can't willingly move closer to the source of its fear.`,
  },
  {
    id: 'grappled',
    title: 'Grappled (Gepackt)',
    category: 'conditions',
    keywords: ['grappled', 'gepackt', 'greifen', 'grapple', 'festgehalten'],
    content: `A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.
The condition ends if the grappler is incapacitated.
The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect.`,
  },
  {
    id: 'incapacitated',
    title: 'Incapacitated (Handlungsunfähig)',
    category: 'conditions',
    keywords: ['incapacitated', 'handlungsunfähig', 'unable'],
    content: `An incapacitated creature can't take actions or reactions.`,
  },
  {
    id: 'invisible',
    title: 'Invisible (Unsichtbar)',
    category: 'conditions',
    keywords: ['invisible', 'unsichtbar', 'invisibility', 'stealth'],
    content: `An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.
Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.`,
  },
  {
    id: 'paralyzed',
    title: 'Paralyzed (Gelähmt)',
    category: 'conditions',
    keywords: ['paralyzed', 'gelähmt', 'paralyze'],
    content: `A paralyzed creature is incapacitated (can't take actions or reactions) and can't move or speak.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.
Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.`,
  },
  {
    id: 'petrified',
    title: 'Petrified (Versteinert)',
    category: 'conditions',
    keywords: ['petrified', 'versteinert', 'stone'],
    content: `A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.
The creature is incapacitated, can't move or speak, and is unaware of its surroundings.
Attack rolls against the creature have advantage.
The creature automatically fails Strength and Dexterity saving throws.
The creature has resistance to all damage.
The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.`,
  },
  {
    id: 'poisoned',
    title: 'Poisoned (Vergiftet)',
    category: 'conditions',
    keywords: ['poisoned', 'vergiftet', 'gift', 'poison'],
    content: `A poisoned creature has disadvantage on attack rolls and ability checks.`,
  },
  {
    id: 'prone',
    title: 'Prone (Liegend)',
    category: 'conditions',
    keywords: ['prone', 'liegend', 'boden', 'knocked down', 'fallen'],
    content: `A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.
The creature has disadvantage on attack rolls.
An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.`,
  },
  {
    id: 'restrained',
    title: 'Restrained (Gefesselt)',
    category: 'conditions',
    keywords: ['restrained', 'gefesselt', 'fesseln', 'entangle', 'web'],
    content: `A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.
Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.
The creature has disadvantage on Dexterity saving throws.`,
  },
  {
    id: 'stunned',
    title: 'Stunned (Betäubt)',
    category: 'conditions',
    keywords: ['stunned', 'betäubt', 'stun'],
    content: `A stunned creature is incapacitated (can't take actions or reactions), can't move, and can speak only falteringly.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.`,
  },
  {
    id: 'unconscious',
    title: 'Unconscious (Bewusstlos)',
    category: 'conditions',
    keywords: ['unconscious', 'bewusstlos', 'ohnmacht', 'knocked out'],
    content: `An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings.
The creature drops whatever it's holding and falls prone.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.
Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.`,
  },

  // ── COMBAT ─────────────────────────────────────────────────────────────────
  {
    id: 'initiative',
    title: 'Initiative',
    category: 'combat',
    keywords: ['initiative', 'turn order', 'combat start', 'reihenfolge'],
    content: `At the start of combat, every participant makes a Dexterity check (initiative roll).
The DM ranks the combatants in order from highest to lowest roll. This is the initiative order.

Ties: The DM decides the order among tied DM-controlled creatures. Tied players can agree; if not, they roll off.`,
  },
  {
    id: 'attack-roll',
    title: 'Attack Roll',
    category: 'combat',
    keywords: ['attack', 'angriff', 'hit', 'treffen', 'attack roll'],
    content: `Attack roll = d20 + ability modifier + proficiency bonus (if proficient)

Hit if attack roll ≥ target's Armor Class (AC).

**Critical Hit:** Natural 20 — roll damage dice twice.
**Critical Miss:** Natural 1 — automatic miss.

Melee attacks use Strength (or Dexterity for finesse weapons).
Ranged attacks use Dexterity.`,
  },
  {
    id: 'opportunity-attack',
    title: 'Opportunity Attack (Gelegenheitsangriff)',
    category: 'combat',
    keywords: ['opportunity attack', 'gelegenheitsangriff', 'AoO', 'leaving melee'],
    content: `You can make an opportunity attack when a hostile creature you can see moves out of your reach.
Using your reaction, make one melee attack against the provoking creature.
The attack occurs right before the creature leaves your reach.
You don't provoke an opportunity attack when you teleport or when someone or something moves you without using your movement.`,
  },
  {
    id: 'two-weapon-fighting',
    title: 'Two-Weapon Fighting (Zweiwaffenkampf)',
    category: 'combat',
    keywords: ['two weapon', 'dual wield', 'zweiwaffenkampf', 'offhand', 'bonus action attack'],
    content: `When you take the Attack action and attack with a light melee weapon, you can use your bonus action to attack with a different light melee weapon in your other hand.
You don't add your ability modifier to the bonus action attack's damage (unless it's negative).
Both weapons must have the light property.`,
  },
  {
    id: 'cover',
    title: 'Cover (Deckung)',
    category: 'combat',
    keywords: ['cover', 'deckung', 'half cover', 'three-quarters cover', 'total cover'],
    content: `**Half Cover:** +2 bonus to AC and Dexterity saving throws. Low walls, large furniture, another creature.

**Three-Quarters Cover:** +5 bonus to AC and Dexterity saving throws. Portcullises, arrow slits.

**Total Cover:** Can't be targeted directly. Completely concealed by an obstacle.`,
  },
  {
    id: 'death-saving-throw',
    title: 'Death Saving Throw (Todesrettungswurf)',
    category: 'combat',
    keywords: ['death saving throw', 'sterben', 'dying', 'unconscious', 'stable', 'tot'],
    content: `When you drop to 0 HP, you fall unconscious and start making death saving throws.

Roll d20 at the start of each of your turns:
- **10 or higher:** 1 success
- **9 or lower:** 1 failure
- **Natural 20:** Regain 1 HP
- **Natural 1:** 2 failures

**3 successes:** Stabilize (you stop making throws)
**3 failures:** Die

Taking any damage while at 0 HP adds 1 failure (critical hit adds 2).
Another creature can stabilize you with a DC 10 Medicine check (action).`,
  },

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  {
    id: 'action-attack',
    title: 'Action: Attack',
    category: 'actions',
    keywords: ['attack action', 'angriffsaktion', 'attack'],
    content: `Make one melee or ranged weapon attack.
Certain features (Extra Attack) let you make additional attacks with this action.`,
  },
  {
    id: 'action-cast-spell',
    title: 'Action: Cast a Spell',
    category: 'actions',
    keywords: ['cast spell', 'zaubern', 'spell action'],
    content: `Cast a spell with a casting time of 1 action.
Spells with longer casting times (1 minute, 1 hour) require multiple rounds or out-of-combat time.`,
  },
  {
    id: 'action-dash',
    title: 'Action: Dash',
    category: 'actions',
    keywords: ['dash', 'sprint', 'extra movement', 'bewegen', 'rennen'],
    content: `Gain extra movement equal to your speed for the current turn.
Any increase or decrease to your speed changes the extra movement by the same amount.`,
  },
  {
    id: 'action-disengage',
    title: 'Action: Disengage',
    category: 'actions',
    keywords: ['disengage', 'rückzug', 'withdraw', 'retreat', 'opportunity attack'],
    content: `Your movement doesn't provoke opportunity attacks for the rest of the turn.`,
  },
  {
    id: 'action-dodge',
    title: 'Action: Dodge',
    category: 'actions',
    keywords: ['dodge', 'ausweichen', 'defense', 'disadvantage'],
    content: `Until the start of your next turn:
- Attack rolls against you have disadvantage (if you can see the attacker)
- Dexterity saving throws have advantage

You lose this benefit if you are incapacitated or if your speed drops to 0.`,
  },
  {
    id: 'action-help',
    title: 'Action: Help',
    category: 'actions',
    keywords: ['help', 'helfen', 'assist', 'advantage', 'aid'],
    content: `You can aid another creature in a task.
**Attacking:** The target has advantage on its next attack roll against the creature you designate (within 5 feet of you).
**Ability check:** The target has advantage on its next ability check for the task.`,
  },
  {
    id: 'action-hide',
    title: 'Action: Hide',
    category: 'actions',
    keywords: ['hide', 'verstecken', 'stealth', 'sneak', 'verbergen'],
    content: `Make a Dexterity (Stealth) check. If successful, you are hidden.
You must be heavily obscured or behind something to hide.
You can't hide from a creature that can see you.
If you make noise, you give away your position.
Attacking reveals your location (whether or not the attack hits).`,
  },
  {
    id: 'action-ready',
    title: 'Action: Ready',
    category: 'actions',
    keywords: ['ready', 'bereit machen', 'readied action', 'reaction', 'trigger'],
    content: `Prepare to act in response to a trigger.
1. Choose your action and the trigger ("When the enemy opens the door…")
2. When the trigger occurs, use your reaction to take that action (or ignore it)

A readied spell requires concentration. If you don't fire it by your next turn, the spell slot is expended.`,
  },
  {
    id: 'action-grapple',
    title: 'Action: Grapple',
    category: 'actions',
    keywords: ['grapple', 'greifen', 'grab', 'festhalten', 'wrestling'],
    content: `Using the Attack action, make a special melee attack to grapple a creature up to one size larger than you.
Roll Athletics (Strength) vs. target's Athletics or Acrobatics (their choice).
On success: target gains the Grappled condition.
You can drag a grappled creature (move at half speed).`,
  },

  // ── SPELLCASTING ───────────────────────────────────────────────────────────
  {
    id: 'concentration',
    title: 'Concentration (Konzentration)',
    category: 'spellcasting',
    keywords: ['concentration', 'konzentration', 'concentrating', 'spell', 'maintain'],
    content: `Some spells require concentration to maintain.
- You can concentrate on only one spell at a time.
- Concentrating on a new spell ends the previous one.

**Breaking concentration:**
- Casting another concentration spell
- Being incapacitated or killed
- Taking damage → DC 10 Constitution save (or half damage, whichever is higher). Fail = concentration broken.
- The DM can call for other Constitution saves (strong wind, rough seas, etc.).`,
  },
  {
    id: 'spell-slots',
    title: 'Spell Slots',
    category: 'spellcasting',
    keywords: ['spell slots', 'zauberslots', 'spell level', 'upcast', 'higher level'],
    content: `Spellcasters have a limited number of spell slots per level.
Casting a spell expends a slot of that spell's level or higher (upcasting).
Spell slots are recovered on a long rest (most classes).
Warlocks recover slots on a short rest.

**Cantrips (level 0):** Don't use spell slots, can be cast unlimited times.`,
  },
  {
    id: 'ritual-casting',
    title: 'Ritual Casting (Ritualzaubern)',
    category: 'spellcasting',
    keywords: ['ritual', 'ritual casting', 'ritualzauber', 'extra 10 minutes'],
    content: `Certain spells have the ritual tag and can be cast as rituals.
Ritual casting takes 10 extra minutes but does NOT expend a spell slot.
You must have the spell prepared (or in your spellbook for Wizards).
Ritual casters can also cast ritual spells not prepared (from their book) — Wizards only.`,
  },

  // ── RESTING ────────────────────────────────────────────────────────────────
  {
    id: 'short-rest',
    title: 'Short Rest (Kurze Rast)',
    category: 'resting',
    keywords: ['short rest', 'kurze rast', 'hit dice', 'trefferwürfel', 'healing'],
    content: `A short rest is a period of downtime of at least 1 hour.
During a short rest you may spend Hit Dice to regain HP:
- Roll the die + Constitution modifier per die spent
- Regain that many HP (up to max)

Features that recharge on a short rest:
- Warlock spell slots
- Fighter's Action Surge (some levels)
- Monk's Ki (partial)
- Second Wind`,
  },
  {
    id: 'long-rest',
    title: 'Long Rest (Lange Rast)',
    category: 'resting',
    keywords: ['long rest', 'lange rast', 'sleep', 'schlafen', 'recover', 'full rest'],
    content: `A long rest is at least 8 hours (6 hours sleep + up to 2 hours light activity).
After a long rest:
- Regain all lost HP
- Regain half your max Hit Dice (minimum 1)
- Most spell slots restored
- Most class features restored

You can only benefit from one long rest per 24 hours.
The rest is interrupted if you take more than 1 hour of strenuous activity.`,
  },

  // ── EQUIPMENT ──────────────────────────────────────────────────────────────
  {
    id: 'armor-classes',
    title: 'Armor Classes',
    category: 'equipment',
    keywords: ['armor', 'rüstung', 'AC', 'rüstungsklasse', 'light armor', 'medium armor', 'heavy armor'],
    content: `**Light Armor:** Leather (11+Dex), Studded Leather (12+Dex) — full Dex modifier applies.

**Medium Armor:** Hide (12+Dex max 2), Chain Shirt (13+Dex max 2), Scale Mail (14+Dex max 2, Disadvantage on Stealth), Breastplate (14+Dex max 2), Half Plate (15+Dex max 2, Disadvantage on Stealth).

**Heavy Armor:** Ring Mail (14), Chain Mail (16, Str 13 req., Disadvantage on Stealth), Splint (17, Str 15 req., Disadvantage on Stealth), Plate (18, Str 15 req., Disadvantage on Stealth).

**Shield:** +2 AC. Requires one free hand.`,
  },
  {
    id: 'weapon-properties',
    title: 'Weapon Properties',
    category: 'equipment',
    keywords: ['weapon', 'waffe', 'finesse', 'versatile', 'heavy', 'light', 'reach', 'thrown'],
    content: `**Finesse:** Use Strength OR Dexterity modifier (your choice).
**Versatile:** Can be used one- or two-handed (two-handed damage in parentheses).
**Heavy:** Small/Tiny creatures have Disadvantage with heavy weapons.
**Light:** Used in off-hand for two-weapon fighting.
**Reach:** Adds 5 feet to your reach.
**Thrown:** Can be thrown (melee weapons use Strength, finesse can use Dex).
**Two-Handed:** Requires two hands.
**Loading:** One piece of ammunition per action/bonus action/reaction.`,
  },
]
