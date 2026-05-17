-- Schema V18: GM Loot Table Editor
-- Run this in the Supabase SQL Editor

create table if not exists loot_table_entries (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  description text,
  category    text not null default 'Arcana',  -- Arcana | Armaments | Implements | Relics | Custom
  rarity      text not null default 'common',  -- common | uncommon | rare | very_rare | legendary
  dice_type   text not null default 'd100',    -- which die to roll for this entry
  min_roll    integer not null default 1,
  max_roll    integer not null default 100,
  prerequisites text,                          -- optional text describing requirements
  is_active   boolean default true,
  created_by  uuid references auth.users(id) on delete cascade,
  created_at  timestamp with time zone default now()
);

-- Row Level Security
alter table loot_table_entries enable row level security;

-- GM can do everything; players can only read active entries
create policy "GM full access to loot_table_entries"
  on loot_table_entries for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'gm'
    )
  );

create policy "Players can read active loot_table_entries"
  on loot_table_entries for select
  using (is_active = true);

-- Add to Realtime
alter publication supabase_realtime add table loot_table_entries;
