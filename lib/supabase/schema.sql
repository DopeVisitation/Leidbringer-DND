-- DnD Companion App - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS (extends auth.users) ──────────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique not null,
  role        text not null check (role in ('gm', 'player')) default 'player',
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'player')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── SESSIONS ────────────────────────────────────────────────────────────────
create table public.sessions (
  id            uuid default uuid_generate_v4() primary key,
  title         text not null default 'DnD Session',
  description   text,
  start_date    timestamptz not null,
  end_date      timestamptz not null,
  session_type  text not null check (session_type in ('online', 'presence', 'hybrid')),
  location      text,
  discord_link  text,
  created_by    uuid references public.profiles(id) on delete cascade not null,
  created_at    timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "Sessions viewable by all authenticated users" on public.sessions
  for select using (auth.role() = 'authenticated');

create policy "Only GM can create sessions" on public.sessions
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'gm'
    )
  );

create policy "Only GM can update sessions" on public.sessions
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'gm'
    )
  );

create policy "Only GM can delete sessions" on public.sessions
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'gm'
    )
  );

-- ─── SESSION RESPONSES ───────────────────────────────────────────────────────
create table public.session_responses (
  id              uuid default uuid_generate_v4() primary key,
  session_id      uuid references public.sessions(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  status          text not null check (status in ('accepted', 'maybe', 'declined')),
  attendance_type text check (attendance_type in ('online', 'presence', 'both')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (session_id, user_id)
);

alter table public.session_responses enable row level security;

create policy "Responses viewable by all authenticated users" on public.session_responses
  for select using (auth.role() = 'authenticated');

create policy "Users can manage own responses" on public.session_responses
  for all using (auth.uid() = user_id);

-- ─── NOTES ───────────────────────────────────────────────────────────────────
create table public.notes (
  id          uuid default uuid_generate_v4() primary key,
  owner_id    uuid references public.profiles(id) on delete cascade not null,
  title       text not null default 'New Note',
  content     text not null default '',
  category    text not null check (category in ('general', 'session', 'character', 'loot', 'npc')) default 'general',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.notes enable row level security;

create policy "Users can only see own notes" on public.notes
  for select using (auth.uid() = owner_id);

create policy "Users can manage own notes" on public.notes
  for all using (auth.uid() = owner_id);

-- ─── GM PRIVATE MESSAGES ─────────────────────────────────────────────────────
create table public.gm_private_messages (
  id           uuid default uuid_generate_v4() primary key,
  player_id    uuid references public.profiles(id) on delete cascade not null,
  gm_id        uuid references public.profiles(id) on delete cascade not null,
  sender_role  text not null check (sender_role in ('gm', 'player')),
  message      text not null,
  created_at   timestamptz default now()
);

alter table public.gm_private_messages enable row level security;

create policy "Players see own messages" on public.gm_private_messages
  for select using (
    auth.uid() = player_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'gm'
    )
  );

create policy "Players and GM can send messages" on public.gm_private_messages
  for insert with check (
    auth.uid() = player_id or auth.uid() = gm_id
  );

-- ─── CHARACTER LINKS ─────────────────────────────────────────────────────────
create table public.character_links (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null unique,
  dnd_beyond_url   text not null,
  character_name   text not null,
  class_name       text not null,
  level            integer not null check (level between 1 and 20),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.character_links enable row level security;

create policy "Character links viewable by all authenticated users" on public.character_links
  for select using (auth.role() = 'authenticated');

create policy "Users can manage own character link" on public.character_links
  for all using (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_responses;
alter publication supabase_realtime add table public.gm_private_messages;
