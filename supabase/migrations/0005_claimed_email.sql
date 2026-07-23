-- Bind each verification code to the exact college address the student claimed.
--
-- Without this, any @muj.manipal.edu sender could redeem any outstanding code.
-- With it, the code only works if the email arrives from the precise address the
-- student typed — so a code shoulder-surfed off someone's screen is useless to
-- anyone else.

alter table verification_codes
  add column if not exists claimed_email text;
