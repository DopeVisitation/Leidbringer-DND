-- V4: Multi-Map-Support — map_id für Kartenmarkierungen
-- Ausführen in: Supabase Dashboard → SQL Editor

ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS map_id integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS map_markers_map_id_idx ON map_markers(map_id);

-- map_id Bedeutung:
-- 0 = Faerûn 1372 DR  (bestehende Markierungen bleiben auf map 0)
-- 1 = Faerûn Extended (Roll20)
-- 2 = Sword Coast (High Res)
