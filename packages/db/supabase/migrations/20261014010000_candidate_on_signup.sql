-- Every new sign-in gets its candidate record automatically (D-25).
-- Runs as the table owner because the signing-in user has no rights yet.
create or replace function public.create_candidate_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.candidates (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_candidate_for_new_user() from public, anon, authenticated;

create trigger create_candidate_after_signup
  after insert on auth.users
  for each row execute function public.create_candidate_for_new_user();
