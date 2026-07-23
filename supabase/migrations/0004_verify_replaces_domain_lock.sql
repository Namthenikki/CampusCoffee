-- Retire the signup-time campus domain lock.
--
-- 0002 required every account's email to be @muj.manipal.edu. That made sense
-- when the college address WAS the login. It isn't any more: MUJ silently drops
-- our mail, so students now sign in with a personal account and prove they're
-- students by emailing us FROM their college address (migration 0003).
--
-- Keeping the old trigger would block exactly the signups the new flow depends
-- on. Student status is now carried by profiles.verified, not by the login
-- address — enforced at read time by the matching queries, not at signup.

drop trigger if exists on_auth_user_domain_check on auth.users;
drop function if exists enforce_campus_domain();
