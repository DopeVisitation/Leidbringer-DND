-- Schema V19: Bonus Aktionen + Würfelboni
-- Run this in the Supabase SQL Editor

-- Bonus-Aktionen für Begleiter/NPCs
alter table companion_characters
  add column if not exists bonus_actions jsonb default '[]'::jsonb;

-- Würfelboni für Charaktere
alter table character_links
  add column if not exists roll_bonuses jsonb default '[]'::jsonb;
