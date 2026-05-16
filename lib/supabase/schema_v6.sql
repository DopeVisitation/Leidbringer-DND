-- V6: Chat messages, item prices, dice favorites
-- Run this in Supabase SQL Editor

-- ─────────────────────────────────────────────────
-- 1. chat_messages
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content            TEXT NOT NULL,
  tags               TEXT[]    DEFAULT '{}',
  pinged_usernames   TEXT[]    DEFAULT '{}',
  created_by         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_select" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "chat_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chat_delete" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ─────────────────────────────────────────────────
-- 2. item_prices
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.item_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  rarity      TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','very_rare','legendary','artifact')),
  price_gp    NUMERIC(12,2) NOT NULL,
  note        TEXT,
  approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.item_prices ENABLE ROW LEVEL SECURITY;

-- Players see only approved; GMs see all
CREATE POLICY "prices_select" ON public.item_prices
  FOR SELECT USING (
    approved = TRUE
    OR auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
  );

CREATE POLICY "prices_insert" ON public.item_prices
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "prices_update" ON public.item_prices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
    OR auth.uid() = created_by
  );

CREATE POLICY "prices_delete" ON public.item_prices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gm')
    OR auth.uid() = created_by
  );

-- ─────────────────────────────────────────────────
-- 3. dice_favorites
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dice_favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  attack_bonus    INTEGER NOT NULL DEFAULT 0,
  damage_dice     TEXT NOT NULL,          -- e.g. "2d6"
  damage_bonus    INTEGER NOT NULL DEFAULT 0,
  damage_type     TEXT,                   -- e.g. "slashing"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dice_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select" ON public.dice_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert" ON public.dice_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete" ON public.dice_favorites
  FOR DELETE USING (auth.uid() = user_id);
