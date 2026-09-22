begin;

-- Phase 2.1C-A: Add missing UPDATE policy on public.restaurants for owner/manager roles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurants'
      and policyname = 'member manage restaurants'
  ) then
    create policy "member manage restaurants" on public.restaurants
      for update to authenticated
      using (public.has_restaurant_role(id, array['owner', 'manager']))
      with check (public.has_restaurant_role(id, array['owner', 'manager']));
  end if;
end $$;

commit;
