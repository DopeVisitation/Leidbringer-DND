-- ─── Schema V15 — V21: Companion abilities, dice, HP sync, Model stats ────────
-- Run in Supabase SQL Editor.

-- companion_characters: new columns
ALTER TABLE public.companion_characters
  ADD COLUMN IF NOT EXISTS current_hp INT,
  ADD COLUMN IF NOT EXISTS favorite_dice JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS abilities JSONB DEFAULT '[]'::jsonb;

-- battle_placed_models: add companion link + full stats
ALTER TABLE public.battle_placed_models
  ADD COLUMN IF NOT EXISTS companion_id UUID REFERENCES public.companion_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_hp INT,
  ADD COLUMN IF NOT EXISTS max_hp INT,
  ADD COLUMN IF NOT EXISTS armor_class INT,
  ADD COLUMN IF NOT EXISTS speed INT,
  ADD COLUMN IF NOT EXISTS model_stats JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS favorite_dice JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS abilities JSONB DEFAULT '[]'::jsonb;
