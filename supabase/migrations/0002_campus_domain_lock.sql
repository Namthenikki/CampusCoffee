-- Students-only, enforced by the database.
--
-- The app already appends @muj.manipal.edu client-side, but a client check is
-- only a suggestion — anyone can call the Supabase API directly with any email.
-- This rejects non-campus signups at the source, so the students-only promise
-- holds no matter how the account is created.

create or replace function enforce_campus_domain()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  allowed_domain text := 'muj.manipal.edu';
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) <> allowed_domain then
    raise exception 'Campus Coffee is only open to % students', allowed_domain
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_domain_check on auth.users;
create trigger on_auth_user_domain_check
  before insert on auth.users
  for each row execute function enforce_campus_domain();
