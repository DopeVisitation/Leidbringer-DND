-- ================================================================
-- Schema V9 — DnD Companion V14
-- Führe dieses Script im Supabase SQL Editor aus.
-- ================================================================

-- ── Battle Tokens: Größe & Bewegung ──────────────────────────────
ALTER TABLE battle_tokens ADD COLUMN IF NOT EXISTS token_size TEXT DEFAULT 'medium';
ALTER TABLE battle_tokens ADD COLUMN IF NOT EXISTS movement_used INTEGER DEFAULT 0;

-- ── Battle Maps: Gelände, Effekte, Fuß-pro-Feld ──────────────────
ALTER TABLE battle_maps ADD COLUMN IF NOT EXISTS difficult_terrain JSONB DEFAULT '[]';
ALTER TABLE battle_maps ADD COLUMN IF NOT EXISTS map_effects JSONB DEFAULT '[]';
ALTER TABLE battle_maps ADD COLUMN IF NOT EXISTS feet_per_cell INTEGER DEFAULT 5;
ALTER TABLE battle_maps ADD COLUMN IF NOT EXISTS grid_locked BOOLEAN DEFAULT TRUE;

-- ── Profile: Tab-Reihenfolge ──────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tab_order JSONB DEFAULT NULL;

-- ── Approval Requests (Genehmigungen) ────────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  requester_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id     UUID REFERENCES profiles(id), -- NULL = an GM
  request_type  TEXT NOT NULL DEFAULT 'general', -- 'item_price' | 'general'
  title         TEXT NOT NULL,
  content       TEXT,
  status        TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  item_data     JSONB, -- für item_price: {name, rarity, price_gp, note}
  reviewer_id   UUID REFERENCES profiles(id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT
);

-- RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_select" ON approval_requests;
CREATE POLICY "ar_select" ON approval_requests
  FOR SELECT USING (
    requester_id = auth.uid() OR
    target_id    = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gm')
  );

DROP POLICY IF EXISTS "ar_insert" ON approval_requests;
CREATE POLICY "ar_insert" ON approval_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "ar_update" ON approval_requests;
CREATE POLICY "ar_update" ON approval_requests
  FOR UPDATE USING (
    target_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gm')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;
