begin;

-- Grant public read access on active restaurants for public landing & reservation pages
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurants'
      and policyname = 'public read active restaurants'
  ) then
    create policy "public read active restaurants" on public.restaurants
      for select to anon, authenticated
      using (status = 'active');
  end if;
end $$;

-- Grant public read access on restaurant branding for public tenant pages
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_branding'
      and policyname = 'public read branding'
  ) then
    create policy "public read branding" on public.restaurant_branding
      for select to anon, authenticated
      using (true);
  end if;
end $$;

commit;
