-- V7: Settings (profiles extension), Battle Maps, dice_favorites update
-- Run this in Supabase SQL Editor

-- ─────────────────────────────────────────────────
-- 1. Extend profiles table
-- ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name  TEXT,
  ADD COLUMN IF NOT EXISTS avatar_emoji  TEXT    DEFAULT '🎲',
  ADD COLUMN IF NOT EXISTS theme         TEXT    DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS accent_color  TEXT    DEFAULT 'amber';

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────
-- 2. Upgrade dice_favorites to support multi-dice
-- ─────────────────────────────────────────────────
-- Add new JSONB column for multi-dice config
ALTER TABLE public.dice_favorites
  ADD COLUMN IF NOT EXISTS dice_config JSONB;

-- Migrate existing rows: damage_dice + damage_type → dice_config
UPDATE public.dice_favorites
  SET dice_config = jsonb_build_array(
    jsonb_build_object(
      'type',       SPLIT_PART(damage_dice, 'd', 2)::TEXT,
      'count',      SPLIT_PART(damage_dice, 'd', 1)::INTEGER,
      'damageType', damage_type
    )
  )
  WHERE dice_config IS NULL AND damage_dice IS NOT NULL;

-- ─────────────────────────────────────────────────
-- 3. battle_maps table
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.battle_maps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  image_url   TEXT,
  grid_cols   INTEGER NOT NULL DEFAULT 24,
  grid_rows   INTEGER NOT NULL DEFAULT 16,
  cell_size   INTEGER NOT NULL DEFAULT 50,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.battle_maps ENABLE ROW LEVEL SECURITY;

-- Everyone can read active maps; only GM can write
CREATE POLICY "maps_select" ON public.battle_maps
  FOR SELECT USING (true);

CREATE POLICY "maps_insert" ON public.battle_maps
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

CREATE POLICY "maps_update" ON public.battle_maps
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

CREATE POLICY "maps_delete" ON public.battle_maps
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_maps;

-- ─────────────────────────────────────────────────
-- 4. battle_tokens table
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.battle_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id       UUID NOT NULL REFERENCES public.battle_maps(id) ON DELETE CASCADE,
  token_type   TEXT NOT NULL CHECK (token_type IN ('player','monster','npc')),
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT '🧙',
  col          INTEGER NOT NULL DEFAULT 0,
  row          INTEGER NOT NULL DEFAULT 0,
  max_hp       INTEGER,
  current_hp   INTEGER,
  armor_class  INTEGER,
  speed        INTEGER DEFAULT 30,
  initiative   INTEGER DEFAULT 0,
  challenge_rating TEXT,
  conditions   TEXT[] DEFAULT '{}',
  notes        TEXT,
  stats        JSONB,     -- {str,dex,con,int,wis,cha}
  is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,  -- GM-only hidden tokens
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.battle_tokens ENABLE ROW LEVEL SECURITY;

-- Players see non-hidden tokens; GM sees all
CREATE POLICY "tokens_select" ON public.battle_tokens
  FOR SELECT USING (
    is_hidden = FALSE
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

CREATE POLICY "tokens_all_gm" ON public.battle_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_tokens;
