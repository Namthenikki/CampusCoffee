-- Profile media: up to 5 photos, one short reel, one selfie for face matching.
--
-- Only keys and metadata live here; the bytes live in object storage. Keeping
-- the row small means listing a profile never drags image data through Postgres.

create table if not exists profile_media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('photo', 'reel', 'selfie')),
  storage_key text not null,
  position    int  not null default 0,     -- display order; 0 is the main photo
  has_face    boolean not null default false,
  width       int,
  height      int,
  duration_ms int,                          -- reels only
  bytes       int,
  created_at  timestamptz not null default now()
);

create index if not exists profile_media_user_idx on profile_media (user_id, kind, position);

-- One reel and one selfie per student. Photos are capped in application code
-- (five), since a partial index can't express "at most N".
create unique index if not exists profile_media_one_reel
  on profile_media (user_id) where kind = 'reel';
create unique index if not exists profile_media_one_selfie
  on profile_media (user_id) where kind = 'selfie';

alter table profiles
  -- Whether the selfie matched the uploaded photos. Separate from `verified`
  -- (student status) because they answer different questions: one proves they
  -- belong to the college, this one proves the photos are of them.
  add column if not exists photos_verified    boolean not null default false,
  add column if not exists photos_verified_at timestamptz,
  add column if not exists face_match_score   real;

alter table profile_media enable row level security;

-- A student manages their own media. Everyone else's photos reach the client
-- only through server endpoints that decide what a viewer is allowed to see —
-- blind matches must not leak a face before the reveal.
create policy "own media: read"   on profile_media for select using (auth.uid() = user_id);
create policy "own media: insert" on profile_media for insert with check (auth.uid() = user_id);
create policy "own media: update" on profile_media for update using (auth.uid() = user_id);
create policy "own media: delete" on profile_media for delete using (auth.uid() = user_id);
