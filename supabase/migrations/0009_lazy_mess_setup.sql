-- Mess preferences move out of first-run onboarding.
--
-- Diet, meal slot and meal frequency only matter to someone actually looking
-- for a mess partner, so they're collected the first time a student opens the
-- Mess pool rather than demanded upfront from everyone. This flag records that
-- they've done that setup — and it doubles as the "is a mess-goer" filter, so
-- people who never touch Mess never surface as someone's mess candidate.

alter table profiles
  add column if not exists mess_ready boolean not null default false;
