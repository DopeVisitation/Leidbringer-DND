-- ================================================================
-- Schema V12 — DnD Companion: NPCs, Plot Threads, Encounters, Music
-- Führe dieses Script im Supabase SQL Editor aus.
-- ================================================================

-- ── NPCs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npcs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  location              TEXT,
  faction               TEXT,
  status                TEXT NOT NULL DEFAULT 'unknown',
  -- 'alive'|'dead'|'unknown'|'hostile'|'friendly'|'neutral'
  emoji                 TEXT NOT NULL DEFAULT '🧙',
  description           TEXT,
  notes                 TEXT,
  is_visible_to_players BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "npcs_gm_all" ON public.npcs;
CREATE POLICY "npcs_gm_all" ON public.npcs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

DROP POLICY IF EXISTS "npcs_player_select" ON public.npcs;
CREATE POLICY "npcs_player_select" ON public.npcs
  FOR SELECT USING (
    is_visible_to_players = TRUE
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- ── Plot Threads ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plot_threads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  -- 'open'|'in_progress'|'resolved'
  linked_npc_ids   TEXT[] DEFAULT '{}',
  linked_quest_ids TEXT[] DEFAULT '{}',
  location         TEXT,
  is_gm_only       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plot_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plot_threads_gm_all" ON public.plot_threads;
CREATE POLICY "plot_threads_gm_all" ON public.plot_threads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

DROP POLICY IF EXISTS "plot_threads_player_select" ON public.plot_threads;
CREATE POLICY "plot_threads_player_select" ON public.plot_threads
  FOR SELECT USING (
    is_gm_only = FALSE
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- ── Plot Theories ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plot_theories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.plot_threads(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theory    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plot_theories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plot_theories_select" ON public.plot_theories;
CREATE POLICY "plot_theories_select" ON public.plot_theories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "plot_theories_insert" ON public.plot_theories;
CREATE POLICY "plot_theories_insert" ON public.plot_theories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plot_theories_gm_delete" ON public.plot_theories;
CREATE POLICY "plot_theories_gm_delete" ON public.plot_theories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- ── Encounters ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.encounters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  tokens      JSONB NOT NULL DEFAULT '[]',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "encounters_gm_all" ON public.encounters;
CREATE POLICY "encounters_gm_all" ON public.encounters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- ── Music State ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.music_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT,
  title       TEXT,
  is_playing  BOOLEAN NOT NULL DEFAULT FALSE,
  volume      INTEGER NOT NULL DEFAULT 80,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.music_state ENABLE ROW LEVEL SECURITY;

-- Insert the single shared row
INSERT INTO public.music_state (id)
  VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "music_state_select" ON public.music_state;
CREATE POLICY "music_state_select" ON public.music_state
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "music_state_gm_update" ON public.music_state;
CREATE POLICY "music_state_gm_update" ON public.music_state
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- ── Character Links: Class Resources ─────────────────────────────
ALTER TABLE public.character_links
  ADD COLUMN IF NOT EXISTS class_resources JSONB DEFAULT '{}';
-- Format:
-- {
--   "rage": { "label": "Wut", "max": 3, "used": 0, "reset_on": "long_rest" },
--   "bardic_inspiration": { "label": "Bardische Inspiration", "max": 4, "used": 1, "reset_on": "short_rest" }
-- }

-- ── Notes: Linking Columns ────────────────────────────────────────
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS linked_character_id UUID REFERENCES public.character_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_quest_id      UUID REFERENCES public.quests(id)           ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_session_id    UUID REFERENCES public.sessions(id)          ON DELETE SET NULL;

-- ── Realtime ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.npcs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plot_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_state;
