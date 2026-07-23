-- Campus Coffee — initial schema. Runs on Supabase (Postgres), free tier.
-- Paste the whole file into the Supabase SQL Editor and run once.

-- ============================ Enums ============================
create type diet          as enum ('veg','egg','nonveg');
create type mess_slot     as enum ('early','mid','late');
create type study_style   as enum ('silent','discussion','mixed');
create type match_kind    as enum ('mess','library','blind','open');
create type match_state   as enum ('active','decision','meet_scheduled','met','dissolved','expired');
create type gender        as enum ('male','female','other');
create type interested_in as enum ('male','female','other','everyone');

-- ==================== Profiles (public-ish) ====================
-- One row per real student, keyed to Supabase Auth. Email + OTP identity
-- live in auth.users; this holds only campus/profile data.
create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null,
  reg_no               text,
  gender               gender not null default 'other',
  interested_in        interested_in not null default 'everyone',
  branch               text not null default 'CSE',
  year                 int  not null default 1 check (year between 1 and 5),
  hostel               text not null default 'Block A',
  diet                 diet not null default 'veg',
  mess_slot            mess_slot not null default 'mid',
  meal_freq            int  not null default 14 check (meal_freq between 0 and 21),
  interests            text[] not null default '{}',
  subjects             text[] not null default '{}',
  study_style          study_style not null default 'mixed',
  prompt               jsonb,                       -- { q, a }
  timetable            jsonb not null default '[]', -- boolean[6][14], true = free
  exam_mode            boolean not null default false,
  blind_opt_in         boolean not null default false,
  open_opt_in          boolean not null default false,
  show_branch_in_blind boolean not null default true,
  onboarded            boolean not null default false,
  bot                  boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ============ Private stats — reliability + learned weights ============
-- Deliberately a SEPARATE table with NO client-readable policy. These never
-- leave the server (not even to their owner) — only the service role touches
-- them. This is the "reliability score is never shown, ever" rule, enforced by
-- Postgres itself rather than by hoping every query remembers to omit it.
create table private_stats (
  user_id     uuid primary key references profiles(id) on delete cascade,
  reliability real  not null default 0.85,
  weights     jsonb not null default
              '{"interest":0.45,"proximity":0.2,"prompt":0.2,"reliability":0.15}'
);

-- ============================ Matches ============================
create sequence match_serial_seq;
create table matches (
  id          uuid primary key default gen_random_uuid(),
  serial      text not null default 'CC-' || lpad(nextval('match_serial_seq')::text, 4, '0'),
  kind        match_kind not null,
  user_a      uuid not null references profiles(id) on delete cascade,
  user_b      uuid not null references profiles(id) on delete cascade,
  state       match_state not null default 'active',
  expires_at  timestamptz,                  -- blind: created_at + 48h
  slot        jsonb,                         -- { label, cafe, startsAt, endsAt }
  study_slot  jsonb,                         -- { day, slot }
  decisions   jsonb not null default '{}',
  cancels     jsonb not null default '{}',
  checkin     jsonb not null default '{"accumMs":0,"lastCreditAt":0,"pings":{},"success":false}',
  reveal      jsonb not null default '{"photos":{},"outcome":null,"votes":{}}',
  meal_count  int  not null default 0,
  last_meal_at timestamptz,
  created_at  timestamptz not null default now()
);
create index matches_user_a_idx on matches (user_a);
create index matches_user_b_idx on matches (user_b);

-- ============================ Messages ============================
create table messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  sender     uuid not null references profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);
create index messages_match_idx on messages (match_id, created_at);

-- ===================== Group posts (mess/library) =====================
create table posts (
  id         uuid primary key default gen_random_uuid(),
  kind       match_kind not null,
  author     uuid not null references profiles(id) on delete cascade,
  text       text not null,
  slot_label text not null default 'tonight',
  needed     int  not null default 2,
  joined     uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ===================== Likes (brews sent) =====================
create table likes (
  from_user  uuid not null references profiles(id) on delete cascade,
  to_user    uuid not null references profiles(id) on delete cascade,
  mode       match_kind not null,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, mode)
);

-- ============ Auto-provision profile + stats on signup ============
-- When Supabase Auth creates a user (after OTP), make their profile row and a
-- private_stats row. Name seeds from the email's "firstname" part.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
    values (new.id, initcap(coalesce(new.raw_user_meta_data->>'name',
                                     split_part(new.email, '.', 1))));
  insert into public.private_stats (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================ RLS ============================
-- Everything on. The public anon key can reach only what these policies allow;
-- all privileged reads (matching, reliability, anonymized candidate views) run
-- server-side with the service role, which bypasses RLS.
alter table profiles      enable row level security;
alter table private_stats enable row level security;
alter table matches       enable row level security;
alter table messages      enable row level security;
alter table posts         enable row level security;
alter table likes         enable row level security;

-- Profiles: you read and edit only YOUR OWN row. Everyone else's profile data
-- reaches the client only through server endpoints that anonymize (blind) or
-- whitelist (open) fields — so raw profiles are never dumped to a browser, and
-- blind anonymity can't leak through a direct query.
create policy "own profile: read"   on profiles for select using (auth.uid() = id);
create policy "own profile: update" on profiles for update using (auth.uid() = id);
create policy "own profile: insert" on profiles for insert with check (auth.uid() = id);

-- private_stats: intentionally NO policy → unreadable by any client. Server only.

-- Matches: read matches you're a member of.
create policy "member: read match" on matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Messages: read and send within your own matches (this is what makes Realtime
-- chat safe to subscribe to directly from the client).
create policy "member: read messages" on messages for select
  using (exists (select 1 from matches m
                 where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())));
create policy "member: send messages" on messages for insert
  with check (sender = auth.uid() and exists (
    select 1 from matches m
    where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())));

-- Posts: any signed-in student can read the board and join; you manage your own.
create policy "posts: read"   on posts for select using (auth.role() = 'authenticated');
create policy "posts: create" on posts for insert with check (author = auth.uid());
create policy "posts: join"   on posts for update using (auth.role() = 'authenticated');

-- Likes: manage only your own outgoing brews (who-liked-whom stays private).
create policy "likes: own" on likes for all
  using (from_user = auth.uid()) with check (from_user = auth.uid());

-- Realtime: allow message inserts to broadcast to subscribed members.
alter publication supabase_realtime add table messages;
