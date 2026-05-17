-- Schema V17: Quest approval, Session confirmation, NPC image, Token flying
-- Run in Supabase SQL Editor

-- 1. Quest approval (player-created side quests need GM approval)
alter table quests add column if not exists is_approved boolean default true;
-- Player-created quests will be inserted with is_approved = false
-- existing quests stay approved (default true)

-- 2. Session confirmation ("Findet Statt" button)
alter table sessions add column if not exists is_confirmed boolean default false;
-- Sessions appear in summaries only when is_confirmed = true

-- 3. NPC image URL
alter table npcs add column if not exists image_url text;

-- 4. Token flying flag
alter table battle_tokens add column if not exists is_flying boolean default false;

-- 5. Token abilities (spells/abilities with charges, like companion_characters)
alter table battle_tokens add column if not exists abilities jsonb default '[]'::jsonb;
