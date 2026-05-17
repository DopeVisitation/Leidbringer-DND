-- ─── Schema V13 — V19 Maps Management ───────────────────────────────────────
-- Run this in the Supabase SQL Editor.

-- ── World Maps table (GM can add/hide maps) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.world_maps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  width       INT  NOT NULL DEFAULT 10200,
  height      INT  NOT NULL DEFAULT 6600,
  init_scale  FLOAT NOT NULL DEFAULT 0.14,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed: fixed UUID for Sword Coast so we can reference it from markers later
INSERT INTO public.world_maps (id, name, url, width, height, init_scale, is_visible, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Sword Coast',
  '/sword-coast.jpg',
  10200, 6600, 0.14, TRUE, 0
) ON CONFLICT (id) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.world_maps ENABLE ROW LEVEL SECURITY;

-- GMs see all; players see only visible maps
CREATE POLICY "world_maps_select" ON public.world_maps
  FOR SELECT USING (
    is_visible = TRUE
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'gm'
    )
  );

-- Only GMs can insert/update/delete
CREATE POLICY "world_maps_gm_write" ON public.world_maps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'gm'
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_maps;
