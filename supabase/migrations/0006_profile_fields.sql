-- Profile reshape.
--
-- Display name is derived from the college email and is not editable — it's the
-- one piece of identity a student can't quietly change after verifying, which
-- is what makes it worth showing next to their face.
--
-- Full name and bio are theirs to write. Hostel and orientation are no longer
-- collected: we don't need to know where someone sleeps, and the coffee side
-- doesn't ask who you're into.

alter table profiles
  add column if not exists full_name text,
  add column if not exists bio       text;

-- 250 characters, enforced in the database as well as the textarea, since the
-- API is reachable without the form.
alter table profiles
  drop constraint if exists profiles_bio_length;
alter table profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 250);

-- Branch becomes free text so students outside the preset list can type their
-- own; the presets stay as quick options in the UI.
alter table profiles
  alter column branch drop default;

comment on column profiles.name is
  'Display name, derived from the college email at verification. Not user-editable.';
comment on column profiles.full_name is
  'Student-supplied full name. Required during onboarding.';

-- Date of birth. Stored as a date, never shown raw — the UI derives age from it
-- so a student's exact birthday isn't broadcast to people they haven't met.
-- The 16–60 bound rejects typos and obvious nonsense at the database.
alter table profiles
  add column if not exists dob date;

alter table profiles
  drop constraint if exists profiles_dob_sane;
alter table profiles
  add constraint profiles_dob_sane check (
    dob is null or (dob > current_date - interval '60 years' and dob < current_date - interval '16 years')
  );
