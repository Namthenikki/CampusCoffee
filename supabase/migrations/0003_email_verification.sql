-- Student verification by inbound email.
--
-- Mail *to* the college is filtered into oblivion, but mail *from* it is fine.
-- So we invert the direction: the student emails us from their college account
-- with a one-time code, and we verify the sender domain. This proves control of
-- an @muj.manipal.edu mailbox without asking Microsoft to deliver anything.

alter table profiles
  add column if not exists verified      boolean not null default false,
  add column if not exists verified_at   timestamptz,
  add column if not exists campus_email  text;

-- One account per college mailbox. A second attempt with the same address
-- collides here rather than quietly creating a duplicate student.
create unique index if not exists profiles_campus_email_unique
  on profiles (lower(campus_email))
  where campus_email is not null;

-- One-time verification codes. Short-lived, single-use, unguessable.
create table if not exists verification_codes (
  code       text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  used_at    timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists verification_codes_user_idx
  on verification_codes (user_id, created_at desc);

-- Audit trail of inbound attempts. Useful for spotting abuse; stores no message
-- bodies, only who claimed what and whether it was accepted.
create table if not exists verification_attempts (
  id         uuid primary key default gen_random_uuid(),
  from_email text,
  code       text,
  outcome    text not null,   -- verified | bad_domain | bad_code | expired | duplicate | unauthenticated
  created_at timestamptz not null default now()
);

alter table verification_codes    enable row level security;
alter table verification_attempts enable row level security;
-- Deliberately no client policies: both tables are server-side only. A student
-- can never read another student's pending code.
