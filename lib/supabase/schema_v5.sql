-- V5: Custom Locations, Galerie, Summary-Kommentare, Character Full Data
-- Ausführen in: Supabase Dashboard → SQL Editor

-- ─── CUSTOM LOCATIONS auf Karten ────────────────────────────────────────────
-- Erlaubt Spielern und GMs, eigene Orte hinzuzufügen, die wie eingebaute Orte
-- in der Suche auftauchen und mit dem Such-Pin angesprungen werden können.
create table if not exists public.custom_locations (
  id          uuid default uuid_generate_v4() primary key,
  map_id      integer not null default 0,
  name        text not null,
  x           double precision not null,
  y           double precision not null,
  created_by  uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now()
);

create index if not exists custom_locations_map_id_idx on public.custom_locations(map_id);

alter table public.custom_locations enable row level security;

create policy "Custom locations viewable by all authenticated"
  on public.custom_locations for select using (auth.role() = 'authenticated');

create policy "Authenticated users can add custom locations"
  on public.custom_locations for insert with check (auth.uid() = created_by);

create policy "Creator or GM can delete custom locations"
  on public.custom_locations for delete using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

-- ─── BILDER-GALERIE ─────────────────────────────────────────────────────────
-- Bilder werden in den Supabase-Storage-Bucket 'gallery' hochgeladen
-- (öffentlich lesbar; Schreibrechte nur für authentifizierte User).
-- Diese Tabelle hält die Metadaten / das Log.
create table if not exists public.gallery_images (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  image_url   text not null,
  storage_path text,
  caption     text,
  created_at  timestamptz default now()
);

create index if not exists gallery_images_created_at_idx on public.gallery_images(created_at desc);

alter table public.gallery_images enable row level security;

create policy "Gallery viewable by all authenticated"
  on public.gallery_images for select using (auth.role() = 'authenticated');

create policy "Authenticated users can post images"
  on public.gallery_images for insert with check (auth.uid() = user_id);

create policy "Uploader or GM can delete images"
  on public.gallery_images for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
  );

-- ─── SESSION SUMMARY-KOMMENTARE ─────────────────────────────────────────────
-- Spieler können Kommentare zu einer GM-Zusammenfassung hinterlassen.
-- comment_type sortiert die vorgefertigten Templates wie "Charakter mochte ..."
-- und "Charakter gefiel garnicht".
create table if not exists public.session_summary_comments (
  id           uuid default uuid_generate_v4() primary key,
  session_id   uuid references public.sessions(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  comment_type text not null default 'comment'
    check (comment_type in ('comment', 'liked', 'disliked', 'highlight', 'question')),
  body         text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists session_summary_comments_session_idx
  on public.session_summary_comments(session_id, created_at desc);

alter table public.session_summary_comments enable row level security;

create policy "Summary comments viewable by all authenticated"
  on public.session_summary_comments for select using (auth.role() = 'authenticated');

create policy "Users manage own summary comments"
  on public.session_summary_comments for all using (auth.uid() = user_id);

-- ─── CHARACTER FULL DATA ────────────────────────────────────────────────────
-- Cache für die kompletten DnD-Beyond Daten (Skills, Inventar, Sprachen, …)
-- damit Würfel-Vorschläge auch ohne erneuten API-Call funktionieren.
alter table public.character_links
  add column if not exists full_data jsonb;

-- ─── REALTIME ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.custom_locations;
alter publication supabase_realtime add table public.gallery_images;
alter publication supabase_realtime add table public.session_summary_comments;

-- ─── STORAGE BUCKET ─────────────────────────────────────────────────────────
-- Diesen Block separat im SQL Editor laufen lassen, falls der Bucket noch
-- nicht existiert. Anschließend im Supabase Dashboard → Storage → 'gallery'
-- die Bucket-Settings auf "Public bucket" stellen.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- RLS-Policies für den Bucket
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gallery_public_read'
  ) then
    create policy "gallery_public_read" on storage.objects for select
      using (bucket_id = 'gallery');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gallery_authenticated_upload'
  ) then
    create policy "gallery_authenticated_upload" on storage.objects for insert
      with check (bucket_id = 'gallery' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gallery_owner_delete'
  ) then
    create policy "gallery_owner_delete" on storage.objects for delete
      using (
        bucket_id = 'gallery'
        and (
          owner = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'gm')
        )
      );
  end if;
end $$;
