/**
 * Dark Fantasy SVG Token Icons
 * Each icon is defined as SVG element strings rendered inside a viewBox="0 0 40 40".
 * The token circle provides the colored background.
 * Elements default to fill="white"; use fill="black" for negative space.
 *
 * In the battlemap, tokens are rendered as:
 *   <circle r={r} fill={token.color} />        ← colored background
 *   <svg viewBox="0 0 40 40" ...>               ← icon layer
 *     {icon SVG elements}
 *   </svg>
 */

export type TokenIconCategory =
  | 'Untote'
  | 'Drachen'
  | 'Monster'
  | 'Tiere'
  | 'Helden'
  | 'Dämonen'
  | 'Magie'
  | 'Menschen'
  | 'Kreaturen'

export interface DarkFantasyIcon {
  id: string
  name: string
  category: TokenIconCategory
  /**
   * SVG elements as a string. Will be placed inside an <svg viewBox="0 0 40 40">
   * Use fill="white" (default) for the icon body.
   * Use fill="black" to cut negative-space details.
   */
  svg: string
}

export const DARK_FANTASY_ICONS: DarkFantasyIcon[] = [
  // ── UNTOTE ─────────────────────────────────────────────────────────────────
  {
    id: 'skull',
    name: 'Totenschädel',
    category: 'Untote',
    svg: `
      <ellipse cx="20" cy="16" rx="13" ry="12" fill="white"/>
      <ellipse cx="14" cy="15" rx="4" ry="4.5" fill="black"/>
      <ellipse cx="26" cy="15" rx="4" ry="4.5" fill="black"/>
      <circle cx="20" cy="22" r="2.5" fill="black"/>
      <path d="M9,25 L31,25 L29.5,37 L10.5,37 Z" fill="white"/>
      <rect x="13" y="27" width="3" height="10" fill="black"/>
      <rect x="20" y="27" width="3" height="10" fill="black"/>
    `,
  },
  {
    id: 'skeleton',
    name: 'Skelett',
    category: 'Untote',
    svg: `
      <ellipse cx="20" cy="8" rx="9" ry="8" fill="white"/>
      <circle cx="16" cy="7" r="3" fill="black"/>
      <circle cx="24" cy="7" r="3" fill="black"/>
      <circle cx="20" cy="12" r="1.8" fill="black"/>
      <rect x="14" y="13" width="12" height="5" rx="2" fill="white"/>
      <rect x="18" y="18" width="4" height="4" rx="2" fill="white"/>
      <rect x="18" y="23" width="4" height="4" rx="2" fill="white"/>
      <rect x="18" y="28" width="4" height="4" rx="2" fill="white"/>
      <path d="M14,19 Q7,21 7,27 Q7,31 14,30" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M26,19 Q33,21 33,27 Q33,31 26,30" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M14,25 Q8,27 9,33" stroke="white" stroke-width="2" fill="none"/>
      <path d="M26,25 Q32,27 31,33" stroke="white" stroke-width="2" fill="none"/>
      <path d="M10,22 Q3,26 2,33" stroke="white" stroke-width="3" fill="none"/>
      <path d="M30,22 Q37,26 38,33" stroke="white" stroke-width="3" fill="none"/>
    `,
  },
  {
    id: 'zombie',
    name: 'Zombie',
    category: 'Untote',
    svg: `
      <circle cx="20" cy="13" r="10" fill="white"/>
      <circle cx="15" cy="11" r="3" fill="black"/>
      <circle cx="25" cy="11" r="3" fill="black"/>
      <circle cx="16" cy="10" r="1.2" fill="white" opacity="0.6"/>
      <circle cx="26" cy="10" r="1.2" fill="white" opacity="0.6"/>
      <path d="M13,18 Q20,22 27,18" stroke="black" stroke-width="1.5" fill="none"/>
      <path d="M15,18 L14,22 M18,19 L18,23 M22,19 L22,23 M25,18 L26,22" stroke="white" stroke-width="1.5" fill="none"/>
      <path d="M12,22 L10,40 L20,38 L30,40 L28,22 Z" fill="white"/>
      <path d="M8,25 L2,32 L6,34 L4,40" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M32,25 L38,32 L34,34 L36,40" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M14,27 L18,35 L17,27" stroke="black" stroke-width="1" fill="none" opacity="0.5"/>
    `,
  },
  {
    id: 'ghost',
    name: 'Geist',
    category: 'Untote',
    svg: `
      <path d="M10,24 Q10,5 20,4 Q30,5 30,24 L30,38 Q27,33 24,38 Q21,33 20,38 Q19,33 16,38 Q13,33 10,38 Z" fill="white"/>
      <circle cx="15" cy="20" r="3.5" fill="black"/>
      <circle cx="25" cy="20" r="3.5" fill="black"/>
      <circle cx="16" cy="19" r="1.5" fill="white" opacity="0.5"/>
      <circle cx="26" cy="19" r="1.5" fill="white" opacity="0.5"/>
      <path d="M14,27 Q20,30 26,27" stroke="black" stroke-width="1.5" fill="none"/>
    `,
  },
  {
    id: 'vampire',
    name: 'Vampir',
    category: 'Untote',
    svg: `
      <path d="M20,4 L36,28 L30,38 L20,32 L10,38 L4,28 Z" fill="white"/>
      <circle cx="20" cy="11" r="8" fill="white"/>
      <path d="M12,9 Q14,2 20,2 Q26,2 28,9 Q24,6 20,5 Q16,6 12,9 Z" fill="black" opacity="0.7"/>
      <circle cx="16" cy="10" r="3" fill="black"/>
      <circle cx="24" cy="10" r="3" fill="black"/>
      <circle cx="16.8" cy="9.2" r="1.3" fill="white" opacity="0.5"/>
      <circle cx="24.8" cy="9.2" r="1.3" fill="white" opacity="0.5"/>
      <polygon points="16,18 17.5,23 19,18" fill="white"/>
      <polygon points="21,18 22.5,23 24,18" fill="white"/>
    `,
  },
  {
    id: 'lich',
    name: 'Lich',
    category: 'Untote',
    svg: `
      <path d="M11,22 L9,40 L31,40 L29,22 Z" fill="white"/>
      <circle cx="20" cy="14" r="9" fill="white"/>
      <path d="M11,12 Q13,4 20,3 Q27,4 29,12 Q25,8 20,8 Q15,8 11,12 Z" fill="black" opacity="0.8"/>
      <path d="M12,9 L6,6 M28,9 L34,6" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="15" cy="14" rx="4" ry="4.5" fill="black"/>
      <ellipse cx="25" cy="14" rx="4" ry="4.5" fill="black"/>
      <circle cx="15" cy="14" r="2" fill="white" opacity="0.7"/>
      <circle cx="25" cy="14" r="2" fill="white" opacity="0.7"/>
      <circle cx="20" cy="20" r="2" fill="black"/>
      <rect x="29" y="18" width="3" height="20" rx="1" fill="white"/>
      <circle cx="30.5" cy="16" r="5" fill="white"/>
      <circle cx="29" cy="14.5" r="2.5" fill="black"/>
      <circle cx="32" cy="14.5" r="2.5" fill="black"/>
    `,
  },

  // ── DRACHEN ────────────────────────────────────────────────────────────────
  {
    id: 'dragon',
    name: 'Drache',
    category: 'Drachen',
    svg: `
      <ellipse cx="20" cy="30" rx="7" ry="8" fill="white"/>
      <ellipse cx="20" cy="17" rx="10" ry="9" fill="white"/>
      <path d="M10,17 L4,22 L4,26 L13,24 Z" fill="white"/>
      <path d="M12,12 L8,1 L17,12 Z" fill="white"/>
      <path d="M24,11 L28,1 L31,12 Z" fill="white"/>
      <ellipse cx="16" cy="16" rx="3.5" ry="3" fill="black"/>
      <circle cx="17" cy="15.5" r="1.5" fill="white" opacity="0.6"/>
      <circle cx="6" cy="24" r="1.8" fill="black"/>
      <path d="M12,24 L0,14 L9,26 Z" fill="white"/>
      <path d="M27,22 L39,13 L32,24 Z" fill="white"/>
      <path d="M20,36 Q16,40 14,38" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'wyvern',
    name: 'Wyvern',
    category: 'Drachen',
    svg: `
      <path d="M12,8 L20,28 L28,8 Q28,2 20,0 Q12,2 12,8 Z" fill="white"/>
      <path d="M12,10 L2,4 L4,16 L12,18 Z" fill="white"/>
      <path d="M28,10 L38,4 L36,16 L28,18 Z" fill="white"/>
      <ellipse cx="20" cy="30" rx="6" ry="7" fill="white"/>
      <circle cx="16" cy="10" r="3" fill="black"/>
      <circle cx="24" cy="10" r="3" fill="black"/>
      <circle cx="16.8" cy="9" r="1.5" fill="white" opacity="0.5"/>
      <circle cx="24.8" cy="9" r="1.5" fill="white" opacity="0.5"/>
      <path d="M20,36 Q15,40 13,38 Q16,36 20,38 Q24,36 27,38 Q25,40 20,36 Z" fill="white"/>
    `,
  },
  {
    id: 'hydra',
    name: 'Hydra',
    category: 'Drachen',
    svg: `
      <ellipse cx="20" cy="32" rx="8" ry="6" fill="white"/>
      <path d="M16,30 L14,16 L17,10 L20,8 L23,10 L26,16 L24,30 Z" fill="white"/>
      <ellipse cx="20" cy="6" rx="7" ry="5" fill="white"/>
      <path d="M14,30 L4,20 L2,13 L6,9 L10,11 L12,24 Z" fill="white"/>
      <ellipse cx="4" cy="8" rx="5" ry="4" fill="white"/>
      <path d="M26,30 L36,20 L38,13 L34,9 L30,11 L28,24 Z" fill="white"/>
      <ellipse cx="36" cy="8" rx="5" ry="4" fill="white"/>
      <circle cx="18" cy="6" r="2.5" fill="black"/>
      <circle cx="22" cy="6" r="2.5" fill="black"/>
      <circle cx="2" cy="8" r="1.8" fill="black"/>
      <circle cx="6" cy="8" r="1.8" fill="black"/>
      <circle cx="34" cy="8" r="1.8" fill="black"/>
      <circle cx="38" cy="8" r="1.8" fill="black"/>
    `,
  },

  // ── MONSTER ────────────────────────────────────────────────────────────────
  {
    id: 'orc',
    name: 'Ork',
    category: 'Monster',
    svg: `
      <circle cx="20" cy="20" r="15" fill="white"/>
      <path d="M7,14 Q20,10 33,14 Q20,18 7,14 Z" fill="black" opacity="0.5"/>
      <ellipse cx="14" cy="17" rx="4.5" ry="4" fill="black"/>
      <circle cx="15" cy="16" r="1.8" fill="white" opacity="0.5"/>
      <ellipse cx="26" cy="17" rx="4.5" ry="4" fill="black"/>
      <circle cx="27" cy="16" r="1.8" fill="white" opacity="0.5"/>
      <ellipse cx="20" cy="22" rx="5" ry="4" fill="black" opacity="0.5"/>
      <path d="M10,29 Q20,33 30,29" stroke="black" stroke-width="1.5" fill="none"/>
      <polygon points="13,29 11,39 16,39 16,30 Z" fill="white"/>
      <polygon points="27,29 29,39 24,39 24,30 Z" fill="white"/>
    `,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    category: 'Monster',
    svg: `
      <circle cx="20" cy="23" r="12" fill="white"/>
      <ellipse cx="7" cy="22" rx="6" ry="9" fill="white"/>
      <ellipse cx="33" cy="22" rx="6" ry="9" fill="white"/>
      <ellipse cx="7" cy="22" rx="3.5" ry="6" fill="black" opacity="0.3"/>
      <ellipse cx="33" cy="22" rx="3.5" ry="6" fill="black" opacity="0.3"/>
      <circle cx="15" cy="20" r="4.5" fill="black"/>
      <circle cx="25" cy="20" r="4.5" fill="black"/>
      <circle cx="16" cy="19" r="2" fill="white" opacity="0.7"/>
      <circle cx="26" cy="19" r="2" fill="white" opacity="0.7"/>
      <ellipse cx="20" cy="27" rx="4" ry="3" fill="black" opacity="0.5"/>
      <path d="M10,30 Q20,36 30,30 Q20,34 10,30" fill="black"/>
      <rect x="13" y="29" width="3" height="5" rx="1" fill="white"/>
      <rect x="18" y="29" width="3" height="6" rx="1" fill="white"/>
      <rect x="23" y="29" width="3" height="5" rx="1" fill="white"/>
    `,
  },
  {
    id: 'troll',
    name: 'Troll',
    category: 'Monster',
    svg: `
      <ellipse cx="18" cy="27" rx="12" ry="10" fill="white"/>
      <circle cx="20" cy="14" r="11" fill="white"/>
      <path d="M10,11 Q20,7 30,11 Q20,16 10,11 Z" fill="black" opacity="0.5"/>
      <ellipse cx="20" cy="19" rx="5" ry="4" fill="black" opacity="0.4"/>
      <circle cx="15" cy="13" r="3.5" fill="black"/>
      <circle cx="25" cy="13" r="3.5" fill="black"/>
      <circle cx="15.8" cy="12" r="1.5" fill="white" opacity="0.5"/>
      <circle cx="25.8" cy="12" r="1.5" fill="white" opacity="0.5"/>
      <rect x="27" y="20" width="6" height="18" rx="3" fill="white"/>
      <ellipse cx="30" cy="20" rx="5" ry="4" fill="white"/>
    `,
  },
  {
    id: 'spider',
    name: 'Spinne',
    category: 'Monster',
    svg: `
      <ellipse cx="20" cy="27" rx="9" ry="8" fill="white"/>
      <ellipse cx="20" cy="16" rx="7" ry="6" fill="white"/>
      <path d="M14,13 L1,4 L2,6 L15,15 Z" fill="white"/>
      <path d="M13,17 L0,14 L1,17 L13,19 Z" fill="white"/>
      <path d="M13,21 L2,22 L3,25 L14,23 Z" fill="white"/>
      <path d="M15,24 L7,35 L9,36 L17,25 Z" fill="white"/>
      <path d="M26,13 L39,4 L38,6 L25,15 Z" fill="white"/>
      <path d="M27,17 L40,14 L39,17 L27,19 Z" fill="white"/>
      <path d="M27,21 L38,22 L37,25 L26,23 Z" fill="white"/>
      <path d="M25,24 L33,35 L31,36 L23,25 Z" fill="white"/>
      <circle cx="17" cy="13" r="1.8" fill="black"/>
      <circle cx="20" cy="12" r="1.8" fill="black"/>
      <circle cx="23" cy="13" r="1.8" fill="black"/>
    `,
  },
  {
    id: 'beholder',
    name: 'Auge des Schreckens',
    category: 'Monster',
    svg: `
      <circle cx="20" cy="23" r="14" fill="white"/>
      <circle cx="20" cy="23" r="9" fill="black"/>
      <ellipse cx="20" cy="23" rx="2.5" ry="5" fill="black" opacity="0.9"/>
      <circle cx="20" cy="23" r="4.5" fill="white" opacity="0.15"/>
      <path d="M7,19 Q13,21 18,23" stroke="white" stroke-width="1" fill="none" opacity="0.3"/>
      <path d="M8,27 Q13,25 18,23" stroke="white" stroke-width="1" fill="none" opacity="0.3"/>
      <path d="M33,19 Q27,21 22,23" stroke="white" stroke-width="1" fill="none" opacity="0.3"/>
      <path d="M32,27 Q27,25 22,23" stroke="white" stroke-width="1" fill="none" opacity="0.3"/>
      <path d="M6,23 Q13,14 14,8" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="14" cy="7" r="3.5" fill="white"/>
      <circle cx="13" cy="7" r="1.5" fill="black"/>
      <path d="M20,9 Q21,3 24,1" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="24" cy="0" r="3" fill="white"/>
      <circle cx="24.5" cy="0" r="1.3" fill="black"/>
      <path d="M34,22 Q39,18 40,12" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="40" cy="11" r="3" fill="white"/>
      <circle cx="39.5" cy="10" r="1.3" fill="black"/>
    `,
  },
  {
    id: 'mimic',
    name: 'Mimik',
    category: 'Monster',
    svg: `
      <rect x="6" y="18" width="28" height="18" rx="3" fill="white"/>
      <rect x="6" y="13" width="28" height="8" rx="2" fill="white"/>
      <path d="M7,20 L10,20 L10,23 L13,20 L13,23 L16,20 L16,23 L19,20 L19,23 L22,20 L22,23 L25,20 L25,23 L28,20 L28,23 L31,20 L31,23 L33,20" stroke="black" stroke-width="1.5" fill="none"/>
      <rect x="17" y="14" width="6" height="6" rx="2" fill="black" opacity="0.5"/>
      <circle cx="13" cy="16" r="3.5" fill="black"/>
      <circle cx="27" cy="16" r="3.5" fill="black"/>
      <circle cx="13.5" cy="15.5" r="1.5" fill="white" opacity="0.9"/>
      <circle cx="27.5" cy="15.5" r="1.5" fill="white" opacity="0.9"/>
      <ellipse cx="12" cy="36" rx="4" ry="3" fill="white"/>
      <ellipse cx="20" cy="37" rx="4" ry="3" fill="white"/>
      <ellipse cx="28" cy="36" rx="4" ry="3" fill="white"/>
    `,
  },
  {
    id: 'werewolf',
    name: 'Werwolf',
    category: 'Monster',
    svg: `
      <path d="M14,24 L12,40 L20,38 L28,40 L26,24 Z" fill="white"/>
      <circle cx="20" cy="16" r="10" fill="white"/>
      <ellipse cx="20" cy="22" rx="7" ry="5" fill="white"/>
      <polygon points="11,10 6,0 16,10" fill="white"/>
      <polygon points="29,10 34,0 24,10" fill="white"/>
      <circle cx="15" cy="14" r="3.5" fill="black"/>
      <circle cx="25" cy="14" r="3.5" fill="black"/>
      <circle cx="15.8" cy="13.2" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="25.8" cy="13.2" r="1.5" fill="white" opacity="0.7"/>
      <ellipse cx="20" cy="22" rx="3.5" ry="2.5" fill="black"/>
      <path d="M13,36 L11,40 M15,37 L14,41 M17,38 L16,42" stroke="white" stroke-width="1.5" fill="none"/>
      <path d="M27,36 L29,40 M25,37 L26,41 M23,38 L24,42" stroke="white" stroke-width="1.5" fill="none"/>
    `,
  },
  {
    id: 'golem',
    name: 'Golem',
    category: 'Monster',
    svg: `
      <rect x="10" y="20" width="20" height="16" rx="2" fill="white"/>
      <rect x="12" y="6" width="16" height="15" rx="2" fill="white"/>
      <rect x="2" y="20" width="10" height="14" rx="2" fill="white"/>
      <rect x="28" y="20" width="10" height="14" rx="2" fill="white"/>
      <rect x="2" y="30" width="10" height="8" rx="4" fill="white"/>
      <rect x="28" y="30" width="10" height="8" rx="4" fill="white"/>
      <circle cx="17" cy="12" r="3.5" fill="black"/>
      <circle cx="23" cy="12" r="3.5" fill="black"/>
      <circle cx="17.8" cy="11" r="1.5" fill="white" opacity="0.6"/>
      <circle cx="23.8" cy="11" r="1.5" fill="white" opacity="0.6"/>
      <rect x="14" y="18" width="12" height="2" fill="black" opacity="0.3"/>
      <path d="M15,23 L17,31 L19,25 L21,33" stroke="black" stroke-width="1" fill="none" opacity="0.4"/>
    `,
  },
  {
    id: 'centipede',
    name: 'Tausendfüßler',
    category: 'Monster',
    svg: `
      <circle cx="35" cy="10" r="5" fill="white"/>
      <circle cx="28" cy="15" r="4.5" fill="white"/>
      <circle cx="22" cy="21" r="4.5" fill="white"/>
      <circle cx="17" cy="27" r="4.5" fill="white"/>
      <circle cx="14" cy="34" r="4" fill="white"/>
      <path d="M28,12 L20,6" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M28,18 L21,24" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M22,18 L14,13" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M22,24 L14,29" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M17,25 L9,20" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M17,29 L10,34" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M36,5 L32,0 M36,5 L40,2" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="38" cy="10" r="2" fill="black"/>
    `,
  },

  // ── TIERE ──────────────────────────────────────────────────────────────────
  {
    id: 'wolf',
    name: 'Wolf',
    category: 'Tiere',
    svg: `
      <ellipse cx="18" cy="20" rx="13" ry="12" fill="white"/>
      <polygon points="9,12 5,0 18,12" fill="white"/>
      <polygon points="9.5,12 7,5 17,12" fill="black" opacity="0.3"/>
      <ellipse cx="30" cy="24" rx="9" ry="7" fill="white"/>
      <ellipse cx="37" cy="22" rx="2.5" ry="2" fill="black"/>
      <circle cx="17" cy="16" r="3.5" fill="black"/>
      <circle cx="17.8" cy="15" r="1.5" fill="white" opacity="0.6"/>
      <path d="M23,27 L29,27 L30,33 L26,33 L22,27" fill="white"/>
    `,
  },
  {
    id: 'bear',
    name: 'Bär',
    category: 'Tiere',
    svg: `
      <circle cx="20" cy="23" r="14" fill="white"/>
      <circle cx="10" cy="11" r="7" fill="white"/>
      <circle cx="30" cy="11" r="7" fill="white"/>
      <circle cx="10" cy="11" r="4" fill="black" opacity="0.35"/>
      <circle cx="30" cy="11" r="4" fill="black" opacity="0.35"/>
      <ellipse cx="20" cy="28" rx="8" ry="6" fill="black" opacity="0.25"/>
      <ellipse cx="20" cy="28" rx="6" ry="4" fill="white"/>
      <ellipse cx="20" cy="25" rx="4" ry="3" fill="black"/>
      <circle cx="14" cy="19" r="3.5" fill="black"/>
      <circle cx="26" cy="19" r="3.5" fill="black"/>
      <circle cx="14.8" cy="18" r="1.5" fill="white" opacity="0.6"/>
      <circle cx="26.8" cy="18" r="1.5" fill="white" opacity="0.6"/>
    `,
  },
  {
    id: 'bat',
    name: 'Fledermaus',
    category: 'Tiere',
    svg: `
      <ellipse cx="20" cy="25" rx="5" ry="6" fill="white"/>
      <circle cx="20" cy="15" r="6" fill="white"/>
      <polygon points="14,12 10,2 19,12" fill="white"/>
      <polygon points="26,12 30,2 21,12" fill="white"/>
      <path d="M15,20 Q4,12 0,22 Q4,31 15,27 Z" fill="white"/>
      <path d="M25,20 Q36,12 40,22 Q36,31 25,27 Z" fill="white"/>
      <circle cx="17" cy="14" r="2.5" fill="black"/>
      <circle cx="23" cy="14" r="2.5" fill="black"/>
    `,
  },
  {
    id: 'eagle',
    name: 'Adler/Rabe',
    category: 'Tiere',
    svg: `
      <path d="M20,18 Q8,12 0,18 Q8,25 18,23 Z" fill="white"/>
      <path d="M20,18 Q32,12 40,18 Q32,25 22,23 Z" fill="white"/>
      <ellipse cx="20" cy="24" rx="5" ry="8" fill="white"/>
      <circle cx="20" cy="13" r="7" fill="white"/>
      <path d="M14,13 L9,16 L14,19 L20,16 Z" fill="black" opacity="0.5"/>
      <path d="M14,13 L9,15 L14,18" fill="white" opacity="0.5"/>
      <circle cx="24" cy="11" r="3" fill="black"/>
      <circle cx="24.8" cy="10" r="1.3" fill="white" opacity="0.6"/>
      <path d="M16,30 L18,40 L20,36 L22,40 L24,30" fill="white"/>
    `,
  },
  {
    id: 'rat',
    name: 'Ratte/Schwarm',
    category: 'Tiere',
    svg: `
      <circle cx="11" cy="10" r="8" fill="white"/>
      <circle cx="29" cy="10" r="8" fill="white"/>
      <circle cx="11" cy="10" r="5" fill="black" opacity="0.3"/>
      <circle cx="29" cy="10" r="5" fill="black" opacity="0.3"/>
      <ellipse cx="20" cy="22" rx="12" ry="13" fill="white"/>
      <path d="M13,32 L20,40 L27,32 Z" fill="white"/>
      <ellipse cx="20" cy="39" rx="3" ry="2" fill="black"/>
      <circle cx="15" cy="18" r="3.5" fill="black"/>
      <circle cx="25" cy="18" r="3.5" fill="black"/>
      <circle cx="15.5" cy="17" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="25.5" cy="17" r="1.5" fill="white" opacity="0.7"/>
      <path d="M30,28 Q36,30 40,28" stroke="white" stroke-width="2" fill="none"/>
    `,
  },
  {
    id: 'serpent',
    name: 'Schlange',
    category: 'Tiere',
    svg: `
      <path d="M20,36 Q6,36 6,24 Q6,16 14,14 Q22,12 24,18 Q26,24 18,24 Q14,24 14,20 Q14,16 18,16"
        stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="20" cy="13" rx="7" ry="5" fill="white"/>
      <path d="M19,8 L16,3 M21,8 L24,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="24" cy="12" rx="2.5" ry="2" fill="black"/>
      <circle cx="24.5" cy="11.5" r="1" fill="white" opacity="0.6"/>
    `,
  },

  // ── DÄMONEN ────────────────────────────────────────────────────────────────
  {
    id: 'demon',
    name: 'Dämon',
    category: 'Dämonen',
    svg: `
      <circle cx="20" cy="22" r="14" fill="white"/>
      <path d="M9,14 Q4,4 10,0 Q8,8 14,14 Z" fill="white"/>
      <path d="M31,14 Q36,4 30,0 Q32,8 26,14 Z" fill="white"/>
      <ellipse cx="14" cy="20" rx="5" ry="5" fill="black"/>
      <ellipse cx="26" cy="20" rx="5" ry="5" fill="black"/>
      <circle cx="14" cy="20" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="26" cy="20" r="2.5" fill="white" opacity="0.7"/>
      <path d="M17,27 L18,24 L22,24 L23,27 L20,29 Z" fill="black"/>
      <path d="M10,31 Q20,39 30,31" stroke="black" stroke-width="1" fill="none"/>
      <polygon points="12,31 14,31 13,37" fill="white"/>
      <polygon points="17,32 19,32 18,37" fill="white"/>
      <polygon points="21,32 23,32 22,37" fill="white"/>
      <polygon points="26,31 28,31 27,37" fill="white"/>
    `,
  },
  {
    id: 'gargoyle',
    name: 'Gargoyle',
    category: 'Dämonen',
    svg: `
      <ellipse cx="20" cy="28" rx="10" ry="9" fill="white"/>
      <path d="M12,18 L20,10 L28,18 L26,22 L20,24 L14,22 Z" fill="white"/>
      <path d="M10,20 Q2,13 2,22 Q2,31 10,26" fill="white"/>
      <path d="M30,20 Q38,13 38,22 Q38,31 30,26" fill="white"/>
      <path d="M14,16 L10,7 L17,16 Z" fill="white"/>
      <path d="M26,16 L30,7 L23,16 Z" fill="white"/>
      <circle cx="16" cy="18" r="3.5" fill="black"/>
      <circle cx="24" cy="18" r="3.5" fill="black"/>
      <circle cx="16.8" cy="17" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="24.8" cy="17" r="1.5" fill="white" opacity="0.7"/>
      <path d="M20,36 Q14,40 12,38 Q16,36 20,38 Q24,36 28,38 Q26,40 20,36 Z" fill="white"/>
    `,
  },
  {
    id: 'imp',
    name: 'Imp',
    category: 'Dämonen',
    svg: `
      <ellipse cx="20" cy="25" rx="9" ry="10" fill="white"/>
      <circle cx="20" cy="13" r="8" fill="white"/>
      <path d="M13,10 L8,2 L16,11 Z" fill="white"/>
      <path d="M27,10 L32,2 L24,11 Z" fill="white"/>
      <path d="M12,20 Q3,14 2,22 Q3,28 12,24" fill="white"/>
      <path d="M28,20 Q37,14 38,22 Q37,28 28,24" fill="white"/>
      <circle cx="16" cy="12" r="3.5" fill="black"/>
      <circle cx="24" cy="12" r="3.5" fill="black"/>
      <circle cx="16.8" cy="11" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="24.8" cy="11" r="1.5" fill="white" opacity="0.7"/>
      <path d="M14,18 Q20,22 26,18" stroke="black" stroke-width="1.5" fill="none"/>
      <path d="M20,34 Q16,40 15,38 Q18,36 20,38 Q22,36 25,38 Q24,40 20,34 Z" fill="white"/>
    `,
  },

  // ── HELDEN ─────────────────────────────────────────────────────────────────
  {
    id: 'knight',
    name: 'Ritter',
    category: 'Helden',
    svg: `
      <path d="M8,8 L8,30 Q8,38 20,38 Q32,38 32,30 L32,8 Q32,2 20,2 Q8,2 8,8 Z" fill="white"/>
      <rect x="10" y="15" width="20" height="8" rx="2" fill="black"/>
      <rect x="12" y="16.5" width="7" height="2" rx="1" fill="white" opacity="0.35"/>
      <rect x="21" y="16.5" width="7" height="2" rx="1" fill="white" opacity="0.35"/>
      <rect x="8" y="13" width="24" height="4" fill="white" opacity="0.7"/>
      <rect x="10" y="28" width="20" height="6" rx="2" fill="white" opacity="0.7"/>
      <rect x="13" y="7" width="14" height="4" rx="2" fill="white" opacity="0.5"/>
    `,
  },
  {
    id: 'paladin',
    name: 'Paladin',
    category: 'Helden',
    svg: `
      <path d="M20,2 L36,8 L36,24 Q36,38 20,40 Q4,38 4,24 L4,8 Z" fill="white"/>
      <rect x="17" y="9" width="6" height="22" rx="2" fill="black" opacity="0.45"/>
      <rect x="8" y="18" width="24" height="6" rx="2" fill="black" opacity="0.45"/>
      <circle cx="20" cy="21" r="5.5" fill="white"/>
      <circle cx="20" cy="11" r="2.5" fill="white"/>
      <circle cx="20" cy="31" r="2.5" fill="white"/>
      <circle cx="10" cy="21" r="2.5" fill="white"/>
      <circle cx="30" cy="21" r="2.5" fill="white"/>
    `,
  },
  {
    id: 'archer',
    name: 'Bogenschütze',
    category: 'Helden',
    svg: `
      <path d="M8,4 Q8,36 8,36" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M8,4 Q20,2 30,8 Q22,8 8,36 Q18,24 30,32 Q24,22 8,4 Z" fill="white"/>
      <path d="M28,14 L38,10 L37,22 Z" fill="white"/>
      <path d="M28,14 L38,10" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="20" cy="8" r="3" fill="white"/>
      <circle cx="20" cy="14" r="3" fill="white"/>
    `,
  },

  // ── MAGIE ──────────────────────────────────────────────────────────────────
  {
    id: 'wizard',
    name: 'Zauberer',
    category: 'Magie',
    svg: `
      <path d="M12,22 L10,40 L30,40 L28,22 L24,20 L16,20 Z" fill="white"/>
      <circle cx="20" cy="15" r="7.5" fill="white"/>
      <path d="M13,13 L20,0 L27,13 Z" fill="white"/>
      <ellipse cx="20" cy="13" rx="8" ry="2.5" fill="white"/>
      <polygon points="20,4 21.5,7.5 25,7.5 22,9.5 23,13 20,11 17,13 18,9.5 15,7.5 18.5,7.5" fill="black" opacity="0.5"/>
      <circle cx="17" cy="15" r="2.5" fill="black"/>
      <circle cx="23" cy="15" r="2.5" fill="black"/>
      <rect x="29" y="20" width="3" height="18" rx="1.5" fill="white"/>
      <circle cx="30.5" cy="19" r="4.5" fill="white"/>
      <circle cx="30.5" cy="19" r="2" fill="black" opacity="0.5"/>
    `,
  },
  {
    id: 'necromancer',
    name: 'Nekromant',
    category: 'Magie',
    svg: `
      <path d="M12,22 L9,40 L31,40 L28,22 Z" fill="white"/>
      <circle cx="20" cy="14" r="8" fill="white"/>
      <path d="M12,12 Q14,3 20,2 Q26,3 28,12 Q24,8 20,8 Q16,8 12,12 Z" fill="black" opacity="0.75"/>
      <path d="M12,9 L6,6 M28,9 L34,6" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="15" cy="13" rx="4" ry="4.5" fill="black"/>
      <ellipse cx="25" cy="13" rx="4" ry="4.5" fill="black"/>
      <circle cx="15" cy="13" r="1.8" fill="white" opacity="0.6"/>
      <circle cx="25" cy="13" r="1.8" fill="white" opacity="0.6"/>
      <rect x="28" y="19" width="3" height="19" rx="1.5" fill="white"/>
      <circle cx="29.5" cy="17" r="5" fill="white"/>
      <circle cx="27.5" cy="15.5" r="2.5" fill="black"/>
      <circle cx="31.5" cy="15.5" r="2.5" fill="black"/>
      <rect x="26" y="18" width="7" height="2.5" rx="1" fill="white"/>
    `,
  },
  {
    id: 'fire_elemental',
    name: 'Feuerelementar',
    category: 'Magie',
    svg: `
      <path d="M20,38 Q4,34 4,22 Q4,10 12,6 Q10,14 16,16 Q12,8 18,4 Q16,12 22,12 Q20,6 26,2 Q24,12 28,14 Q36,10 36,22 Q36,34 20,38 Z" fill="white"/>
      <path d="M20,34 Q10,30 10,22 Q10,14 16,12 Q14,18 20,18 Q22,12 26,12 Q24,18 30,20 Q30,30 20,34 Z" fill="black" opacity="0.35"/>
      <circle cx="16" cy="22" r="3.5" fill="black"/>
      <circle cx="24" cy="22" r="3.5" fill="black"/>
      <circle cx="16" cy="22" r="1.5" fill="white" opacity="0.9"/>
      <circle cx="24" cy="22" r="1.5" fill="white" opacity="0.9"/>
      <path d="M14,28 Q20,33 26,28" stroke="black" stroke-width="2" fill="none"/>
    `,
  },
  {
    id: 'crystal',
    name: 'Kristallgolem',
    category: 'Magie',
    svg: `
      <polygon points="20,2 30,12 32,26 20,38 8,26 10,12" fill="white"/>
      <polygon points="20,2 30,12 20,12" fill="black" opacity="0.3"/>
      <polygon points="20,2 10,12 20,12" fill="black" opacity="0.2"/>
      <polygon points="10,12 8,26 20,20" fill="black" opacity="0.15"/>
      <polygon points="30,12 32,26 20,20" fill="black" opacity="0.1"/>
      <polygon points="8,26 20,38 20,28" fill="black" opacity="0.2"/>
      <polygon points="32,26 20,38 20,28" fill="black" opacity="0.15"/>
      <circle cx="20" cy="20" r="4" fill="black" opacity="0.2"/>
      <circle cx="20" cy="20" r="2.5" fill="white" opacity="0.8"/>
    `,
  },

  // ── MENSCHEN ───────────────────────────────────────────────────────────────
  {
    id: 'rogue',
    name: 'Schurke',
    category: 'Menschen',
    svg: `
      <path d="M12,18 L10,40 L30,40 L28,18 Z" fill="white"/>
      <circle cx="20" cy="13" r="7.5" fill="white"/>
      <path d="M13,11 Q15,3 20,3 Q25,3 27,11 Q24,8 20,8 Q16,8 13,11 Z" fill="black" opacity="0.6"/>
      <circle cx="17" cy="13" r="2.5" fill="black"/>
      <circle cx="23" cy="13" r="2.5" fill="black"/>
      <circle cx="17.5" cy="12.5" r="1" fill="white" opacity="0.5"/>
      <circle cx="23.5" cy="12.5" r="1" fill="white" opacity="0.5"/>
      <rect x="24" y="22" width="2.5" height="15" rx="1" fill="white"/>
      <rect x="22" y="21" width="6.5" height="2.5" rx="1" fill="white"/>
      <path d="M24,37 L25,41 L26,37 Z" fill="white"/>
    `,
  },
  {
    id: 'barbarian',
    name: 'Barbar',
    category: 'Menschen',
    svg: `
      <path d="M11,20 L9,40 L31,40 L29,20 L24,18 L16,18 Z" fill="white"/>
      <circle cx="20" cy="11" r="9" fill="white"/>
      <path d="M6,28 L2,36 L6,38 L5,40" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M34,28 L38,36 L34,38 L35,40" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="15" cy="10" r="3" fill="black"/>
      <circle cx="25" cy="10" r="3" fill="black"/>
      <path d="M13,16 Q20,20 27,16" stroke="black" stroke-width="2" fill="none"/>
      <path d="M3,20 L9,14 L9,20 Z" fill="white"/>
      <path d="M3,14 L9,14" stroke="white" stroke-width="2" fill="none"/>
    `,
  },

  // ── KREATUREN ──────────────────────────────────────────────────────────────
  {
    id: 'harpy',
    name: 'Harpie',
    category: 'Kreaturen',
    svg: `
      <path d="M13,20 L11,40 L20,38 L29,40 L27,20 L22,18 L18,18 Z" fill="white"/>
      <circle cx="20" cy="12" r="8" fill="white"/>
      <path d="M13,18 Q3,10 2,20 Q2,28 12,26" fill="white"/>
      <path d="M27,18 Q37,10 38,20 Q38,28 28,26" fill="white"/>
      <polygon points="13,16 9,4 18,16" fill="white"/>
      <polygon points="27,16 31,4 22,16" fill="white"/>
      <circle cx="16" cy="11" r="2.5" fill="black"/>
      <circle cx="24" cy="11" r="2.5" fill="black"/>
      <path d="M15,26 L13,28 M17,27 L16,30 M23,27 L24,30 M25,26 L27,28" stroke="white" stroke-width="2" fill="none"/>
    `,
  },
  {
    id: 'slime',
    name: 'Schleim',
    category: 'Kreaturen',
    svg: `
      <path d="M6,28 Q4,16 12,10 Q20,6 28,10 Q36,16 34,28 Q36,34 32,36 Q28,40 20,38 Q12,40 8,36 Q4,34 6,28 Z" fill="white"/>
      <path d="M6,28 Q10,22 8,16 Q12,10 18,10" stroke="white" stroke-width="2" fill="none" opacity="0.4"/>
      <ellipse cx="15" cy="22" rx="5" ry="5" fill="black"/>
      <ellipse cx="26" cy="22" rx="5" ry="5" fill="black"/>
      <ellipse cx="15" cy="22" rx="2.5" ry="3" fill="white" opacity="0.6"/>
      <ellipse cx="26" cy="22" rx="2.5" ry="3" fill="white" opacity="0.6"/>
      <path d="M13,30 Q20,35 27,30" stroke="black" stroke-width="2" fill="none"/>
      <circle cx="12" cy="10" r="3" fill="white" opacity="0.5"/>
      <circle cx="22" cy="8" r="2.5" fill="white" opacity="0.5"/>
      <circle cx="32" cy="12" r="2" fill="white" opacity="0.5"/>
    `,
  },
]

/** Look up an icon by ID */
export function getTokenIcon(id: string): DarkFantasyIcon | undefined {
  return DARK_FANTASY_ICONS.find(i => i.id === id)
}

/** All categories with their icons */
export function getIconsByCategory(): Record<TokenIconCategory, DarkFantasyIcon[]> {
  const map: Record<TokenIconCategory, DarkFantasyIcon[]> = {
    Untote: [], Drachen: [], Monster: [], Tiere: [],
    Helden: [], Dämonen: [], Magie: [], Menschen: [], Kreaturen: [],
  }
  for (const icon of DARK_FANTASY_ICONS) {
    map[icon.category].push(icon)
  }
  return map
}

/** Whether a token's emoji field is a dark fantasy icon ID */
export function isIconId(value: string): boolean {
  return DARK_FANTASY_ICONS.some(i => i.id === value)
}
