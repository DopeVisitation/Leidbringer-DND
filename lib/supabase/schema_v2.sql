-- DnD Companion App - Schema V2
-- Run this in your Supabase SQL editor (after schema.sql)

-- ─── SESSION SUMMARIES (GM-Zusammenfassung) ───────────────────────────────────
create table if not exists public.session_summaries (
  id          uuid default uuid_generate_v4() primary key,
  session_id  uuid references public.sessions(id) on delete cascade not null unique,
  gm_summary  text not null default '',
  created_by  uuid references public.profiles(id) on delete cascade not null,
  updated_at  timestamptz default now()
);

alter table public.session_summaries enable row level security;

create policy "Summaries viewable by all authenticated" on public.session_summaries
  for select using (auth.role() = 'authenticated');

create policy "Only GM can manage summaries" on public.session_summaries
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

-- ─── SESSION PLAYER FEEDBACK ─────────────────────────────────────────────────
create table if not exists public.session_player_feedback (
  id                 uuid default uuid_generate_v4() primary key,
  session_id         uuid references public.sessions(id) on delete cascade not null,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  feedback_text      text not null default '',
  character_liked    text,
  character_disliked text,
  updated_at         timestamptz default now(),
  unique(session_id, user_id)
);

alter table public.session_player_feedback enable row level security;

create policy "Feedback viewable by all authenticated" on public.session_player_feedback
  for select using (auth.role() = 'authenticated');

create policy "Users manage own feedback" on public.session_player_feedback
  for all using (auth.uid() = user_id);

-- ─── DICE ROLLS ──────────────────────────────────────────────────────────────
create table if not exists public.dice_rolls (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  dice_config jsonb not null,
  results     jsonb not null,
  total       integer not null,
  label       text,
  created_at  timestamptz default now()
);

alter table public.dice_rolls enable row level security;

create policy "Dice rolls viewable by all authenticated" on public.dice_rolls
  for select using (auth.role() = 'authenticated');

create policy "Users can insert own dice rolls" on public.dice_rolls
  for insert with check (auth.uid() = user_id);

-- ─── LOOT ITEMS ──────────────────────────────────────────────────────────────
create table if not exists public.loot_items (
  id           uuid default uuid_generate_v4() primary key,
  name         text not null,
  description  text,
  quantity     integer not null default 1,
  rarity       text check (rarity in ('common', 'uncommon', 'rare', 'very_rare', 'legendary')) default 'common',
  session_id   uuid references public.sessions(id) on delete set null,
  assigned_to  uuid references public.profiles(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default now()
);

alter table public.loot_items enable row level security;

create policy "Loot viewable by all authenticated" on public.loot_items
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can add loot" on public.loot_items
  for insert with check (auth.uid() = created_by);

create policy "Creator or GM can update loot" on public.loot_items
  for update using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

create policy "Creator or GM can delete loot" on public.loot_items
  for delete using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

-- ─── QUESTS ──────────────────────────────────────────────────────────────────
create table if not exists public.quests (
  id          uuid default uuid_generate_v4() primary key,
  title       text not null,
  description text,
  type        text not null check (type in ('main', 'side')) default 'side',
  status      text not null check (status in ('active', 'completed', 'failed')) default 'active',
  created_by  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.quests enable row level security;

create policy "Quests viewable by all authenticated" on public.quests
  for select using (auth.role() = 'authenticated');

create policy "GM can create main quests, players create side quests" on public.quests
  for insert with check (
    auth.uid() = created_by and (
      type = 'side'
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
    )
  );

create policy "GM can update any quest, creator can update own side quest" on public.quests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
    or (auth.uid() = created_by and type = 'side')
  );

create policy "GM can delete any quest, creator can delete own side quest" on public.quests
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
    or (auth.uid() = created_by and type = 'side')
  );

-- ─── QUEST RATINGS ───────────────────────────────────────────────────────────
create table if not exists public.quest_ratings (
  id                 uuid default uuid_generate_v4() primary key,
  quest_id           uuid references public.quests(id) on delete cascade not null,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  player_interest    integer not null check (player_interest between 1 and 5),
  character_interest integer not null check (character_interest between 1 and 5),
  updated_at         timestamptz default now(),
  unique(quest_id, user_id)
);

alter table public.quest_ratings enable row level security;

create policy "Quest ratings viewable by all authenticated" on public.quest_ratings
  for select using (auth.role() = 'authenticated');

create policy "Users manage own quest ratings" on public.quest_ratings
  for all using (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.dice_rolls;
alter publication supabase_realtime add table public.loot_items;
alter publication supabase_realtime add table public.quests;
alter publication supabase_realtime add table public.quest_ratings;
alter publication supabase_realtime add table public.session_summaries;
alter publication supabase_realtime add table public.session_player_feedback;
