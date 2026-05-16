-- ================================================================
-- Schema V11 — DnD Companion V17
-- Führe dieses Script im Supabase SQL Editor aus.
-- ================================================================

-- ── Battle Tokens: Staging-Bereich ───────────────────────────────
ALTER TABLE public.battle_tokens
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Character Links: Aktuelle HP (GM-Tracking) ───────────────────
ALTER TABLE public.character_links
  ADD COLUMN IF NOT EXISTS current_hp INTEGER;

-- ── Combat Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.combat_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id        UUID REFERENCES public.battle_maps(id) ON DELETE CASCADE,
  actor_name    TEXT NOT NULL,
  action_type   TEXT NOT NULL DEFAULT 'action', -- 'move'|'hp'|'action'|'gm'|'roll'|'note'
  description   TEXT NOT NULL,
  is_gm_action  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.combat_log ENABLE ROW LEVEL SECURITY;

-- Players see non-GM entries; GM sees all
DROP POLICY IF EXISTS "log_select" ON public.combat_log;
CREATE POLICY "log_select" ON public.combat_log
  FOR SELECT USING (
    is_gm_action = FALSE OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

DROP POLICY IF EXISTS "log_insert" ON public.combat_log;
CREATE POLICY "log_insert" ON public.combat_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "log_delete" ON public.combat_log;
CREATE POLICY "log_delete" ON public.combat_log
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.combat_log;
