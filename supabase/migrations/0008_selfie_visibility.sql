-- Selfie visibility, driven by the face match.
--
-- The rule the app enforces:
--   selfie matches the photos  -> photos_verified = true,  selfie stays private
--   selfie does NOT match      -> photos_verified = false, selfie shown to
--                                 others so they can judge for themselves
--
-- So the selfie is only ever exposed when the automated check couldn't confirm
-- the photos are of the same person — turning a failed match into transparency
-- rather than a locked door.

alter table profiles
  add column if not exists selfie_public boolean not null default false;
