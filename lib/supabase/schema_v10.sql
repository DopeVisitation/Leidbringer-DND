-- ================================================================
-- Schema V10 — DnD Companion V16
-- Führe dieses Script im Supabase SQL Editor aus.
-- ================================================================

-- 1. battle_maps: Nebelkrieg, Gitterfarbe, Initiative-Tracker-State
ALTER TABLE public.battle_maps
  ADD COLUMN IF NOT EXISTS fog_cells      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS grid_color     TEXT  DEFAULT '#C8B496',
  ADD COLUMN IF NOT EXISTS initiative_data JSONB DEFAULT '{"round":1,"current_turn":0,"timer_seconds":60,"active":false}';

-- 2. character_links: manueller Zauberslot-Tracker
--    Format: {"1":{"max":4,"used":1}, "2":{"max":3,"used":0}, ...}
ALTER TABLE public.character_links
  ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT '{}';

-- 3. whisper_messages – privater Direktchat
CREATE TABLE IF NOT EXISTS public.whisper_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(content) > 0),
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whisper_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whisper_messages' AND policyname='whisper_select') THEN
    EXECUTE 'CREATE POLICY "whisper_select" ON public.whisper_messages
      FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whisper_messages' AND policyname='whisper_insert') THEN
    EXECUTE 'CREATE POLICY "whisper_insert" ON public.whisper_messages
      FOR INSERT WITH CHECK (auth.uid() = from_user_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whisper_messages' AND policyname='whisper_update') THEN
    EXECUTE 'CREATE POLICY "whisper_update" ON public.whisper_messages
      FOR UPDATE USING (auth.uid() = to_user_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whisper_messages' AND policyname='whisper_delete') THEN
    EXECUTE 'CREATE POLICY "whisper_delete" ON public.whisper_messages
      FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)';
  END IF;
END $$;

-- Realtime für Flüsternachrichten
ALTER PUBLICATION supabase_realtime ADD TABLE public.whisper_messages;
