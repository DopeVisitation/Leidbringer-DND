-- DnD Companion App - Schema V3
-- Run this in your Supabase SQL editor (after schema_v2.sql)

-- ─── ICON COLUMN FOR LOOT ────────────────────────────────────────────────────
alter table public.loot_items add column if not exists icon text not null default '📦';

-- ─── MAP MARKERS ─────────────────────────────────────────────────────────────
create table if not exists public.map_markers (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  x           float not null,
  y           float not null,
  color       text not null default '#f59e0b',
  icon        text not null default '📍',
  created_by  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now()
);

alter table public.map_markers enable row level security;

create policy "Map markers viewable by all authenticated" on public.map_markers
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can add markers" on public.map_markers
  for insert with check (auth.uid() = created_by);

create policy "Creator or GM can delete markers" on public.map_markers
  for delete using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.map_markers;
