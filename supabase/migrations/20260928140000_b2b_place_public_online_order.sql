begin;

create or replace function public.place_public_online_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_sess_id uuid;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_qty int;
  v_price numeric(10,2);
  v_order_number int;
  v_lines jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  -- 1. Calculate total & format lines
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_price := coalesce((v_item->>'price')::numeric, 0);
    v_total := v_total + (v_price * v_qty);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_item->>'id',
      'title', v_item->>'title',
      'price', v_price,
      'qty', v_qty
    ));
  end loop;

  -- Fix jsonb array concatenation if nested
  if jsonb_typeof(v_lines) = 'array' and jsonb_array_length(v_lines) > 0 then
    -- Flatten array if wrapped
    v_lines := p_items;
  end if;

  -- 2. Insert into public.orders table
  insert into public.orders (
    restaurant_id, customer_name, email, phone, notes, items, total, status
  ) values (
    p_restaurant_id, p_customer_name, p_email, p_phone, nullif(trim(p_notes), ''), v_lines, v_total, 'placed'
  ) returning id into v_order_id;

  -- 3. Create takeaway dining session for admin tracking
  insert into public.dining_sessions (
    restaurant_id, customer_name, phone, status
  ) values (
    p_restaurant_id, p_customer_name, p_phone, 'open'
  ) returning id into v_sess_id;

  -- 4. Get next order number atomically
  insert into public.restaurant_order_counters (restaurant_id, last_order_number)
  values (p_restaurant_id, 1001)
  on conflict (restaurant_id)
  do update set last_order_number = public.restaurant_order_counters.last_order_number + 1,
                updated_at = now()
  returning last_order_number into v_order_number;

  -- 5. Insert into session_orders for Admin Dashboard & Realtime sync & KDS
  insert into public.session_orders (
    restaurant_id, session_id, items, amount, subtotal, discount, tax, service_charge, total,
    notes, kind, source, status, order_number
  ) values (
    p_restaurant_id, v_sess_id, v_lines, v_total, v_total, 0, 0, 0, v_total,
    nullif(trim(p_notes), ''), 'takeaway', 'takeaway', 'placed', v_order_number
  );

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_number', v_order_number);
end $$;

grant execute on function public.place_public_online_order(uuid, text, text, text, text, jsonb) to anon, authenticated;

commit;
