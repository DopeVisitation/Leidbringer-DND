-- ─── Schema V16 — V22: companion_id on battle_tokens ──────────────────────────
-- Run in Supabase SQL Editor.

-- Add companion link to battle_tokens for bidirectional sync
ALTER TABLE public.battle_tokens
  ADD COLUMN IF NOT EXISTS companion_id UUID REFERENCES public.companion_characters(id) ON DELETE SET NULL;
