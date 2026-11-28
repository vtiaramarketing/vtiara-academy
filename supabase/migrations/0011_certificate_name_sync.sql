-- Keep the name printed on certificates in step with the learner's profile name.
create or replace function public.trg_sync_certificate_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name and btrim(new.full_name) <> '' then
    update public.certificates set learner_name = btrim(new.full_name) where learner_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_sync_cert_name on public.profiles;
create trigger trg_profiles_sync_cert_name after update of full_name on public.profiles
  for each row execute function public.trg_sync_certificate_name();

-- one-off: align existing certificates with current profile names
update public.certificates c set learner_name = btrim(p.full_name)
from public.profiles p where p.id = c.learner_id and btrim(p.full_name) <> '' and c.learner_name is distinct from btrim(p.full_name);
