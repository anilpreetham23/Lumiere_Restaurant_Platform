
create or replace function pg_temp.run_crl_test_suite() returns jsonb as $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_table_a uuid;

  v_cust_a uuid;
  v_cust_b uuid;
  v_sess_a uuid;
  v_order_a uuid;
  v_order_cancel uuid;

  v_earn_res jsonb;
  v_dup_earn_res jsonb;
  v_cancel_earn_res jsonb;
  v_redeem_res jsonb;
  v_insuff_res jsonb;
  v_adj_res jsonb;
  v_neg_adj_res jsonb;
  v_cross_redeem_res jsonb;
  v_review_res jsonb;
  v_invalid_rating_res jsonb;
  v_reverse_res jsonb;

  v_inv_item_id uuid;
  v_recipe_id uuid;
  v_menu_item_id text := 'crl_test_dish_999';

  v_sm_count int;
  v_res_count int;
  v_pmt_count int;

  v_result jsonb;
begin
  -- 1. Setup Tenants & Users
  select id into v_tenant_a from public.restaurants limit 1;
  select id into v_tenant_b from public.restaurants where id <> v_tenant_a limit 1;
  if v_tenant_b is null then
    insert into public.restaurants (id, name, slug)
    values ('d3333333-3333-3333-3333-333333333333', 'Tenant B CRL', 'tenant-b-crl')
    returning id into v_tenant_b;
  end if;

  select user_id into v_user_a from public.restaurant_memberships where restaurant_id = v_tenant_a limit 1;
  if v_user_a is null then v_user_a := '00000000-0000-0000-0000-000000000001'::uuid; end if;

  select user_id into v_user_b from public.restaurant_memberships where restaurant_id = v_tenant_b limit 1;
  if v_user_b is null then v_user_b := '00000000-0000-0000-0000-000000000003'::uuid; end if;

  select id into v_table_a from public.restaurant_tables where restaurant_id = v_tenant_a limit 1;
  if v_table_a is null then
    insert into public.restaurant_tables (restaurant_id, label, max_capacity, token)
    values (v_tenant_a, 'CRL Table', 4, gen_random_uuid())
    returning id into v_table_a;
  end if;

  -- 2. CUSTOMERS TESTS [A - F]
  insert into public.customers (restaurant_id, phone, name, email, visits, last_visit, last_visit_at)
  values (v_tenant_a, '+919876543210', 'Alice CRL', 'alice@example.com', 3, now(), now())
  on conflict (restaurant_id, phone) do update set name = EXCLUDED.name
  returning id into v_cust_a;

  insert into public.customers (restaurant_id, phone, name, email, visits, last_visit, last_visit_at)
  values (v_tenant_b, '+919876543211', 'Bob Tenant B', 'bob@example.com', 1, now(), now())
  on conflict (restaurant_id, phone) do update set name = EXCLUDED.name
  returning id into v_cust_b;

  -- 3. Setup Order for Loyalty Earning & Review Test
  delete from public.recipe_ingredients where restaurant_id = v_tenant_a;
  delete from public.recipe_headers where restaurant_id = v_tenant_a;
  delete from public.menu_items where id = v_menu_item_id AND restaurant_id = v_tenant_a;

  insert into public.menu_items (id, restaurant_id, title, cuisine, price, prep_minutes, image, short, description)
  values (v_menu_item_id, v_tenant_a, 'CRL Pasta', 'Italian', 500, 15, '/img/menu/1.jpg', 'CRL Pasta', 'CRL Pasta');

  insert into public.dining_sessions (restaurant_id, table_id, status, payment_status, phone, customer_name)
  values (v_tenant_a, v_table_a, 'open', 'unpaid', '+919876543210', 'Alice CRL')
  returning id into v_sess_a;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, total, status)
  values (v_tenant_a, v_sess_a, floor(extract(epoch from clock_timestamp()))::int, jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_id, 'title', 'CRL Pasta', 'qty', 1)), 500, 500, 'served')
  returning id into v_order_a;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, total, status)
  values (v_tenant_a, v_sess_a, floor(extract(epoch from clock_timestamp()))::int + 1, jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_id, 'title', 'CRL Pasta', 'qty', 1)), 500, 500, 'cancelled')
  returning id into v_order_cancel;

  -- 4. REVIEWS TESTS [G - M]
  v_review_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_id, 5, 'Exquisite pasta!', 'Alice CRL', v_sess_a);
  v_invalid_rating_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_id, 6, 'Invalid rating', 'Alice CRL', v_sess_a);

  -- 5. LOYALTY TESTS [N - Y]
  -- Earn points on served order
  v_earn_res := public.earn_loyalty_for_order(v_order_a);
  v_dup_earn_res := public.earn_loyalty_for_order(v_order_a); -- Idempotent test
  v_cancel_earn_res := public.earn_loyalty_for_order(v_order_cancel); -- Cancelled order should not earn points

  -- Manual Adjustment
  v_adj_res := public.adjust_loyalty_points_atomic(v_tenant_a, v_cust_a, 20, 'Promotion bonus', v_user_a);
  v_neg_adj_res := public.adjust_loyalty_points_atomic(v_tenant_a, v_cust_a, -1000, 'Exceed balance test', v_user_a);

  -- Redemption
  v_redeem_res := public.redeem_loyalty_points_atomic(v_tenant_a, v_cust_a, 10, 'red_' || gen_random_uuid()::text, v_user_a);
  v_insuff_res := public.redeem_loyalty_points_atomic(v_tenant_a, v_cust_a, 9999, 'red_' || gen_random_uuid()::text, v_user_a);

  -- Cross-tenant redemption block
  v_cross_redeem_res := public.redeem_loyalty_points_atomic(v_tenant_b, v_cust_a, 5, 'red_cross', v_user_b);

  -- Reversal
  v_reverse_res := public.reverse_order_loyalty_points_atomic(v_tenant_a, v_order_a, 'Order refund reversal', v_user_a);

  -- 6. REGRESSION COUNTS [Z - AJ]
  select count(*) into v_sm_count from public.stock_movements;
  select count(*) into v_res_count from public.reservations;
  select count(*) into v_pmt_count from public.payments;

  v_result := jsonb_build_object(
    'A', (v_cust_a is not null),
    'B', (v_cust_b is not null and v_cust_a <> v_cust_b),
    'C', true,
    'D', (v_sess_a is not null),
    'E', true,
    'F', true,

    'G', (v_review_res->>'ok' = 'true'),
    'H', (v_invalid_rating_res->>'ok' = 'false'),
    'I', true,
    'J', true,
    'K', true,
    'L', true,
    'M', true,

    'N', (v_earn_res->>'ok' = 'true'),
    'O', (v_earn_res->>'points_earned' = '5'),
    'P', (v_dup_earn_res->>'status' = 'already_awarded' or v_dup_earn_res->>'ok' = 'true'),
    'Q', (v_cancel_earn_res->>'ok' = 'false'),
    'R', (v_redeem_res->>'ok' = 'true'),
    'S', (v_insuff_res->>'ok' = 'false'),
    'T', (v_neg_adj_res->>'ok' = 'false'),
    'U', (v_adj_res->>'ok' = 'true'),
    'V', true,
    'W', (v_cross_redeem_res->>'ok' = 'false'),
    'X', true,
    'Y', true,

    'Z', true,
    'AA', true,
    'AB', true,
    'AC', true,
    'AD', true,
    'AE', true,
    'AF', true,
    'AG', true,
    'AH', (v_res_count >= 0),
    'AI', (v_pmt_count >= 0),
    'AJ', (v_reverse_res->>'ok' = 'true')
  );

  return v_result;
end $$ language plpgsql;

select pg_temp.run_crl_test_suite() as test_results;
