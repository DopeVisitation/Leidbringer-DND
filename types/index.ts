export type UserRole = 'gm' | 'player'

export type SessionType = 'online' | 'presence' | 'hybrid'

export type ResponseStatus = 'accepted' | 'maybe' | 'declined'

export type AttendanceType = 'online' | 'presence' | 'both'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Session {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  session_type: SessionType
  location?: string
  discord_link?: string
  created_by: string
  created_at: string
  responses?: SessionResponse[]
}

export interface SessionResponse {
  id: string
  session_id: string
  user_id: string
  status: ResponseStatus
  attendance_type?: AttendanceType
  created_at: string
  updated_at: string
  user?: User
}

export interface Note {
  id: string
  owner_id: string
  title: string
  content: string
  category: NoteCategory
  created_at: string
  updated_at: string
}

export type NoteCategory =
  | 'general'
  | 'session'
  | 'character'
  | 'loot'
  | 'npc'

export interface GMPrivateMessage {
  id: string
  player_id: string
  gm_id: string
  sender_role: UserRole
  message: string
  created_at: string
}

export interface CharacterLink {
  id: string
  user_id: string
  dnd_beyond_url: string
  character_name: string
  class_name: string
  level: number
  created_at: string
  updated_at: string
}

export interface DnDRule {
  id: string
  title: string
  category: RuleCategory
  content: string
  keywords: string[]
}

export type RuleCategory =
  | 'conditions'
  | 'combat'
  | 'spellcasting'
  | 'actions'
  | 'resting'
  | 'equipment'
