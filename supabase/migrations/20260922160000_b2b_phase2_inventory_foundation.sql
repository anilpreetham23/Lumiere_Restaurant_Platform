-- Migration: Inventory Foundation (Items, Units, Stock & Immutable Movements)
begin;

-- 1. Create Inventory Items / Ingredients table
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sku text,
  category text not null default 'General',
  unit text not null check (unit in ('kg', 'g', 'l', 'ml', 'piece', 'dozen', 'packet', 'box')),
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  reorder_level numeric(12, 3) not null default 0 check (reorder_level >= 0),
  cost_per_unit numeric(10, 2) not null default 0 check (cost_per_unit >= 0),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint inventory_items_restaurant_sku_key unique (restaurant_id, sku)
);

-- Indexes for performant filtering
create index if not exists idx_inventory_items_restaurant on public.inventory_items(restaurant_id);
create index if not exists idx_inventory_items_category on public.inventory_items(restaurant_id, category);

-- 2. Create Immutable Stock Movements table
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  type text not null check (type in ('IN', 'OUT', 'ADJUSTMENT')),
  quantity numeric(12, 3) not null,
  previous_quantity numeric(12, 3) not null,
  resulting_quantity numeric(12, 3) not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_stock_movements_item on public.stock_movements(inventory_item_id, created_at desc);
create index if not exists idx_stock_movements_restaurant on public.stock_movements(restaurant_id, created_at desc);

-- 3. RLS Setup
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

-- Policies for inventory_items
drop policy if exists inventory_items_member_select on public.inventory_items;
create policy inventory_items_member_select on public.inventory_items
  for select using (public.is_restaurant_member(restaurant_id));

drop policy if exists inventory_items_member_insert on public.inventory_items;
create policy inventory_items_member_insert on public.inventory_items
  for insert with check (public.is_restaurant_member(restaurant_id));

drop policy if exists inventory_items_member_update on public.inventory_items;
create policy inventory_items_member_update on public.inventory_items
  for update using (public.is_restaurant_member(restaurant_id));

drop policy if exists inventory_items_member_delete on public.inventory_items;
create policy inventory_items_member_delete on public.inventory_items
  for delete using (
    exists (
      select 1 from public.restaurant_memberships rm
      where rm.restaurant_id = inventory_items.restaurant_id
        and rm.user_id = auth.uid()
        and rm.role in ('owner', 'manager')
    )
  );

-- Policies for stock_movements (Read & Insert only for tenant members; NO UPDATE or DELETE allowed)
drop policy if exists stock_movements_member_select on public.stock_movements;
create policy stock_movements_member_select on public.stock_movements
  for select using (public.is_restaurant_member(restaurant_id));

drop policy if exists stock_movements_member_insert on public.stock_movements;
create policy stock_movements_member_insert on public.stock_movements
  for insert with check (public.is_restaurant_member(restaurant_id));

-- 4. Atomic Stock Movement RPC
create or replace function public.record_stock_movement(
  p_inventory_item_id uuid,
  p_type text,
  p_quantity numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_restaurant_id uuid;
  v_item record;
  v_prev_qty numeric;
  v_new_qty numeric;
  v_movement_id uuid;
  v_delta numeric;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_type not in ('IN', 'OUT', 'ADJUSTMENT') then
    raise exception 'Invalid movement type. Must be IN, OUT, or ADJUSTMENT';
  end if;

  if p_quantity is null or (p_type in ('IN', 'OUT') and p_quantity <= 0) or (p_type = 'ADJUSTMENT' and p_quantity < 0) then
    raise exception 'Invalid quantity specified';
  end if;

  -- Lock item for update & retrieve current quantity & restaurant_id
  select * into v_item
  from public.inventory_items
  where id = p_inventory_item_id
  for update;

  if not found then
    raise exception 'Inventory item not found';
  end if;

  v_restaurant_id := v_item.restaurant_id;

  -- Check tenant membership authorization
  if not public.is_restaurant_member(v_restaurant_id) then
    raise exception 'Unauthorized restaurant context';
  end if;

  v_prev_qty := v_item.quantity;

  if p_type = 'IN' then
    v_delta := p_quantity;
    v_new_qty := v_prev_qty + p_quantity;
  elsif p_type = 'OUT' then
    v_delta := -p_quantity;
    v_new_qty := v_prev_qty - p_quantity;
  elsif p_type = 'ADJUSTMENT' then
    v_delta := p_quantity - v_prev_qty;
    v_new_qty := p_quantity;
  end if;

  if v_new_qty < 0 then
    raise exception 'Insufficient stock: quantity cannot fall below zero (Current: %, Requested change: %)', v_prev_qty, v_delta;
  end if;

  -- Update inventory item quantity
  update public.inventory_items
  set quantity = v_new_qty,
      updated_at = now()
  where id = p_inventory_item_id;

  -- Insert stock movement record
  v_movement_id := gen_random_uuid();
  insert into public.stock_movements (
    id,
    restaurant_id,
    inventory_item_id,
    type,
    quantity,
    previous_quantity,
    resulting_quantity,
    reason,
    created_by,
    created_at
  ) values (
    v_movement_id,
    v_restaurant_id,
    p_inventory_item_id,
    p_type,
    p_quantity,
    v_prev_qty,
    v_new_qty,
    p_reason,
    v_user_id,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'inventory_item_id', p_inventory_item_id,
    'previous_quantity', v_prev_qty,
    'resulting_quantity', v_new_qty
  );
end;
$$;

commit;
