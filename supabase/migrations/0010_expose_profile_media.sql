-- Fix: profile_media exists but the Data API can't see it ("Could not find the
-- table 'public.profile_media' in the schema cache", PGRST205).
--
-- When "Automatically expose new tables" is off, a newly created table gets no
-- privileges granted to the API roles, so PostgREST never loads it. This grants
-- them explicitly, (re)asserts the table and its policies idempotently, and
-- reloads the schema cache. Safe to run repeatedly.

create table if not exists profile_media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('photo', 'reel', 'selfie')),
  storage_key text not null,
  position    int  not null default 0,
  has_face    boolean not null default false,
  width       int,
  height      int,
  duration_ms int,
  bytes       int,
  created_at  timestamptz not null default now()
);

-- The three columns migration 0007 was meant to add to profiles.
alter table profiles
  add column if not exists photos_verified    boolean not null default false,
  add column if not exists photos_verified_at timestamptz,
  add column if not exists face_match_score   real;

-- This is the line that was missing: let the API roles reach the table.
grant all on profile_media to anon, authenticated, service_role;

alter table profile_media enable row level security;

-- Re-declare policies safely, so this whole file can be re-run without error.
drop policy if exists "own media: read"   on profile_media;
drop policy if exists "own media: insert" on profile_media;
drop policy if exists "own media: update" on profile_media;
drop policy if exists "own media: delete" on profile_media;
create policy "own media: read"   on profile_media for select using (auth.uid() = user_id);
create policy "own media: insert" on profile_media for insert with check (auth.uid() = user_id);
create policy "own media: update" on profile_media for update using (auth.uid() = user_id);
create policy "own media: delete" on profile_media for delete using (auth.uid() = user_id);

-- Push the change into PostgREST's cache immediately.
notify pgrst, 'reload schema';
