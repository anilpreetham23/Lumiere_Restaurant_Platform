begin;

-- ============================================================
-- 1. AUTHENTICATED MENU ISOLATION FIX
-- ============================================================
-- Drop the legacy combined policy that granted default tenant menu access to both anon and authenticated users.
drop policy if exists "public read default menu" on public.menu_items;

-- Anonymous public visitors can read the menu of the default Lumière restaurant.
create policy "anon read default menu" on public.menu_items
  for select to anon
  using (restaurant_id = public.default_restaurant_id());

-- Authenticated restaurant members can ONLY read menu items for restaurants where they hold active membership.
create policy "member read menu" on public.menu_items
  for select to authenticated
  using (public.is_restaurant_member(restaurant_id));

-- ============================================================
-- 2. PAYMENT TENANT FOREIGN KEY FIX
-- ============================================================
-- Ensure unique constraints exist on (restaurant_id, id) for target tables to support composite foreign keys.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_dining_sessions_restaurant_id'
  ) then
    alter table public.dining_sessions
      add constraint uq_dining_sessions_restaurant_id unique (restaurant_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'uq_reservations_restaurant_id'
  ) then
    alter table public.reservations
      add constraint uq_reservations_restaurant_id unique (restaurant_id, id);
  end if;
end $$;

-- Upgrade single-column session_id / reservation_id foreign keys to tenant-aware composite foreign keys on payment_intents.
alter table public.payment_intents
  drop constraint if exists payment_intents_session_id_fkey,
  drop constraint if exists payment_intents_reservation_id_fkey;

alter table public.payment_intents
  add constraint payment_intents_session_id_fkey
    foreign key (restaurant_id, session_id)
    references public.dining_sessions(restaurant_id, id)
    on delete restrict,
  add constraint payment_intents_reservation_id_fkey
    foreign key (restaurant_id, reservation_id)
    references public.reservations(restaurant_id, id)
    on delete restrict;

-- Upgrade payments and payment_refunds to composite foreign keys for tenant consistency.
alter table public.payments
  drop constraint if exists payments_session_id_fkey,
  drop constraint if exists payments_reservation_id_fkey;

alter table public.payments
  add constraint payments_session_id_fkey
    foreign key (restaurant_id, session_id)
    references public.dining_sessions(restaurant_id, id)
    on delete set null,
  add constraint payments_reservation_id_fkey
    foreign key (restaurant_id, reservation_id)
    references public.reservations(restaurant_id, id)
    on delete set null;

alter table public.payment_refunds
  drop constraint if exists payment_refunds_session_id_fkey,
  drop constraint if exists payment_refunds_reservation_id_fkey;

alter table public.payment_refunds
  add constraint payment_refunds_session_id_fkey
    foreign key (restaurant_id, session_id)
    references public.dining_sessions(restaurant_id, id)
    on delete set null,
  add constraint payment_refunds_reservation_id_fkey
    foreign key (restaurant_id, reservation_id)
    references public.reservations(restaurant_id, id)
    on delete set null;

commit;
