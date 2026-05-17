-- ─── Schema V14 — V20: Models, Assets, Companions, Log, Tab Settings ─────────
-- Run in Supabase SQL Editor.

-- ── battle_placed_models ─────────────────────────────────────────────────────
-- Grid-snapped creature/NPC models on the battlemap (like tokens but image-based)
CREATE TABLE IF NOT EXISTS public.battle_placed_models (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID REFERENCES public.battle_maps(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL,
  col         INT  NOT NULL DEFAULT 0,
  row         INT  NOT NULL DEFAULT 0,
  span        FLOAT NOT NULL DEFAULT 1,     -- grid cells (1=medium, 2=large, etc.)
  rotation    FLOAT NOT NULL DEFAULT 0,     -- degrees 0-359
  is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
  z_index     INT NOT NULL DEFAULT 10,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── battle_placed_assets ─────────────────────────────────────────────────────
-- Free-placement effect/vegetation/prop assets (not grid-restricted)
CREATE TABLE IF NOT EXISTS public.battle_placed_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID REFERENCES public.battle_maps(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL,
  x_pct       FLOAT NOT NULL DEFAULT 50,   -- position as % of map width
  y_pct       FLOAT NOT NULL DEFAULT 50,   -- position as % of map height
  width_cells FLOAT NOT NULL DEFAULT 1,    -- size in grid cells
  height_cells FLOAT NOT NULL DEFAULT 1,
  rotation    FLOAT NOT NULL DEFAULT 0,    -- degrees
  z_index     INT NOT NULL DEFAULT 1,      -- below tokens (tokens are z=10+)
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── companion_characters ─────────────────────────────────────────────────────
-- Pets / Summons / Familiars / NPC companions
CREATE TABLE IF NOT EXISTS public.companion_characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'pet', -- 'pet'|'summon'|'familiar'|'npc'|'mount'
  image_url     TEXT,
  max_hp        INT,
  armor_class   INT,
  speed         INT DEFAULT 30,
  str INT DEFAULT 10, dex INT DEFAULT 10, con INT DEFAULT 10,
  int INT DEFAULT 10, wis INT DEFAULT 10, cha INT DEFAULT 10,
  notes         TEXT,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── profiles: add hidden_tabs ─────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_tabs TEXT[] DEFAULT '{}';

-- ── RLS ───────────────────────────────────────────────────────────────────────

-- battle_placed_models: everyone sees non-hidden; GM sees all; GM writes all
ALTER TABLE public.battle_placed_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "models_select" ON public.battle_placed_models FOR SELECT
  USING (is_hidden = FALSE OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='gm'));
CREATE POLICY "models_gm_write" ON public.battle_placed_models FOR ALL
  USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='gm'));

-- battle_placed_assets: everyone sees; GM writes
ALTER TABLE public.battle_placed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select" ON public.battle_placed_assets FOR SELECT USING (TRUE);
CREATE POLICY "assets_gm_write" ON public.battle_placed_assets FOR ALL
  USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='gm'));

-- companion_characters: everyone reads; owner or GM writes
ALTER TABLE public.companion_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companions_select" ON public.companion_characters FOR SELECT USING (TRUE);
CREATE POLICY "companions_write" ON public.companion_characters FOR ALL
  USING (created_by = auth.uid() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='gm'));

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_placed_models;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_placed_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_characters;
