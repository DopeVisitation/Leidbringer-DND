-- ─────────────────────────────────────────────────────────────────────────────
-- V13 Schema Migrations
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix dice_favorites: drop NOT NULL on damage_dice, add dice_config JSONB
ALTER TABLE public.dice_favorites
  ALTER COLUMN damage_dice DROP NOT NULL;

ALTER TABLE public.dice_favorites
  ADD COLUMN IF NOT EXISTS dice_config JSONB DEFAULT '[]';

-- Back-fill existing rows (convert old damage_dice to dice_config)
UPDATE public.dice_favorites
SET dice_config = '[]'::jsonb
WHERE dice_config IS NULL;

-- 2. Sessions: unlock flag for summaries
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_unlocked_for_summary BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. dice_rolls: visibility flag (default visible to all)
ALTER TABLE public.dice_rolls
  ADD COLUMN IF NOT EXISTS visible_to_players BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. battle_maps: grid calibration columns
ALTER TABLE public.battle_maps
  ADD COLUMN IF NOT EXISTS grid_opacity FLOAT NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS grid_offset_x INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grid_offset_y INTEGER NOT NULL DEFAULT 0;

-- 5. battle_tokens: favorite actions per token + player ownership
ALTER TABLE public.battle_tokens
  ADD COLUMN IF NOT EXISTS favorite_actions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS player_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Add UPDATE policy for dice_favorites (missing in v6)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dice_favorites' AND policyname = 'favorites_update'
  ) THEN
    EXECUTE 'CREATE POLICY "favorites_update" ON public.dice_favorites
      FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 7. Allow players to UPDATE their own battle token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_tokens' AND policyname = 'tokens_player_update'
  ) THEN
    EXECUTE 'CREATE POLICY "tokens_player_update" ON public.battle_tokens
      FOR UPDATE USING (player_user_id = auth.uid())';
  END IF;
END $$;

-- 8. Allow players to INSERT their own player token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_tokens' AND policyname = 'tokens_player_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "tokens_player_insert" ON public.battle_tokens
      FOR INSERT WITH CHECK (
        player_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''gm'')
      )';
  END IF;
END $$;
