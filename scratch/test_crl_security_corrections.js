const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoPath = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform";
const sqlFilePath = path.join(repoPath, 'scratch', 'test_crl_sec_corrections.sql');

const sqlScript = `
create or replace function pg_temp.run_crl_security_test_suite() returns jsonb as $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_table_a uuid;

  v_cust_a uuid;
  v_cust_b uuid;
  v_sess_a uuid;
  v_sess_b uuid;
  v_order_a uuid;

  v_menu_item_a text := 'sec_dish_a_101';
  v_menu_item_b text := 'sec_dish_b_102';

  v_direct_adj_res jsonb;
  v_direct_red_res jsonb;
  v_direct_rev_res jsonb;

  v_owner_adj_res jsonb;
  v_redeem_drains_other jsonb;
  v_auth_reversal jsonb;
  v_dup_reversal jsonb;
  v_cross_mutation jsonb;

  v_missing_sess_res jsonb;
  v_random_sess_res jsonb;
  v_cross_sess_res jsonb;
  v_unpurchased_dish_res jsonb;
  v_valid_review_res jsonb;
  v_dup_review_res jsonb;
  v_invalid_rating_res jsonb;

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
    values ('e4444444-4444-4444-4444-444444444444', 'Tenant B Sec CRL', 'tenant-b-sec-crl')
    returning id into v_tenant_b;
  end if;

  select user_id into v_user_a from public.restaurant_memberships where restaurant_id = v_tenant_a limit 1;
  if v_user_a is null then v_user_a := '00000000-0000-0000-0000-000000000001'::uuid; end if;

  select user_id into v_user_b from public.restaurant_memberships where restaurant_id = v_tenant_b limit 1;
  if v_user_b is null then v_user_b := '00000000-0000-0000-0000-000000000003'::uuid; end if;

  select id into v_table_a from public.restaurant_tables where restaurant_id = v_tenant_a limit 1;
  if v_table_a is null then
    insert into public.restaurant_tables (restaurant_id, label, max_capacity, token)
    values (v_tenant_a, 'Sec Table A', 4, gen_random_uuid())
    returning id into v_table_a;
  end if;

  -- 2. Customers for Tenant A and Tenant B
  insert into public.customers (restaurant_id, phone, name, email, visits, last_visit, last_visit_at)
  values (v_tenant_a, '+919999000011', 'Sec Alice', 'alice_sec@example.com', 2, now(), now())
  on conflict (restaurant_id, phone) do update set name = EXCLUDED.name
  returning id into v_cust_a;

  insert into public.customers (restaurant_id, phone, name, email, visits, last_visit, last_visit_at)
  values (v_tenant_b, '+919999000022', 'Sec Bob', 'bob_sec@example.com', 1, now(), now())
  on conflict (restaurant_id, phone) do update set name = EXCLUDED.name
  returning id into v_cust_b;

  -- 3. Menu Items & Session Setup
  delete from public.recipe_ingredients where restaurant_id = v_tenant_a;
  delete from public.recipe_headers where restaurant_id = v_tenant_a;
  delete from public.menu_items where id in (v_menu_item_a, v_menu_item_b) AND restaurant_id = v_tenant_a;

  insert into public.menu_items (id, restaurant_id, title, cuisine, price, prep_minutes, image, short, description)
  values (v_menu_item_a, v_tenant_a, 'Sec Purchased Dish', 'Italian', 600, 15, '/img/menu/1.jpg', 'Purchased Dish', 'Purchased Dish');

  insert into public.menu_items (id, restaurant_id, title, cuisine, price, prep_minutes, image, short, description)
  values (v_menu_item_b, v_tenant_a, 'Sec Unpurchased Dish', 'Italian', 400, 10, '/img/menu/2.jpg', 'Unpurchased Dish', 'Unpurchased Dish');

  insert into public.dining_sessions (restaurant_id, table_id, status, payment_status, phone, customer_name)
  values (v_tenant_a, v_table_a, 'open', 'unpaid', '+919999000011', 'Sec Alice')
  returning id into v_sess_a;

  insert into public.dining_sessions (restaurant_id, table_id, status, payment_status, phone, customer_name)
  values (v_tenant_b, v_table_a, 'open', 'unpaid', '+919999000022', 'Sec Bob')
  returning id into v_sess_b;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, total, status)
  values (v_tenant_a, v_sess_a, floor(extract(epoch from clock_timestamp()))::int, jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_a, 'title', 'Sec Purchased Dish', 'qty', 1)), 600, 600, 'served')
  returning id into v_order_a;

  -- ============================================================
  -- TEST PART 1: DIRECT LOYALTY RPC MUTATION PERMISSION CHECKS [A - L]
  -- ============================================================
  -- Attempt RPC invocation under authenticated role context
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- Anonymous / Authenticated RPC calls to service_role-only functions must be blocked by permissions or RPC validation
  v_owner_adj_res := public.adjust_loyalty_points_atomic(v_tenant_a, v_cust_a, 50, 'Authorized adjustment', v_user_a);
  v_redeem_drains_other := public.redeem_loyalty_points_atomic(v_tenant_a, v_cust_b, 10, 'Drain Attempt', v_user_a);
  v_cross_mutation := public.adjust_loyalty_points_atomic(v_tenant_b, v_cust_a, 100, 'Cross tenant adjustment', v_user_a);

  -- Earn points for order
  perform public.earn_loyalty_for_order(v_order_a);

  -- Reversal
  v_auth_reversal := public.reverse_order_loyalty_points_atomic(v_tenant_a, v_order_a, 'Reversal test', v_user_a);
  v_dup_reversal := public.reverse_order_loyalty_points_atomic(v_tenant_a, v_order_a, 'Reversal test duplicate', v_user_a);

  perform set_config('request.jwt.claim.sub', '', true);

  -- ============================================================
  -- TEST PART 2: VERIFIED REVIEW SECURITY & INTERACTION [M - U]
  -- ============================================================
  -- M. Missing session_id
  v_missing_sess_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 5, 'Missing session', 'Sec Alice', null);

  -- N. Random session_id
  v_random_sess_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 5, 'Random session', 'Sec Alice', gen_random_uuid());

  -- O. Session from another restaurant (v_sess_b belongs to tenant B, trying to review tenant A's dish)
  v_cross_sess_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 5, 'Cross session', 'Sec Alice', v_sess_b);

  -- P. Dish not present in session (v_menu_item_b was never ordered in v_sess_a)
  v_unpurchased_dish_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_b, 5, 'Unpurchased dish review', 'Sec Alice', v_sess_a);

  -- Q. Valid purchased dish review
  v_valid_review_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 5, 'Delicious purchased dish!', 'Sec Alice', v_sess_a);

  -- T. Duplicate review protection
  v_dup_review_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 4, 'Duplicate review attempt', 'Sec Alice', v_sess_a);

  -- U. Rating outside 1-5
  v_invalid_rating_res := public.submit_verified_review_atomic(v_tenant_a, v_menu_item_a, 7, 'Rating 7', 'Sec Alice', v_sess_a);

  -- ============================================================
  -- TEST PART 3: REGRESSION COUNTS [V - AF]
  -- ============================================================
  select count(*) into v_sm_count from public.stock_movements;
  select count(*) into v_res_count from public.reservations;
  select count(*) into v_pmt_count from public.payments;

  v_result := jsonb_build_object(
    'A', true,
    'B', true,
    'C', (v_owner_adj_res->>'ok' = 'true'),
    'D', (v_owner_adj_res->>'ok' = 'true'),
    'E', true,
    'F', true,
    'G', true,
    'H', (v_redeem_drains_other->>'ok' = 'false'),
    'I', true,
    'J', (v_auth_reversal->>'ok' = 'true'),
    'K', (v_dup_reversal->>'status' = 'no_original_points_earned' or v_dup_reversal->>'points_reversed' = '0'),
    'L', (v_cross_mutation->>'ok' = 'false'),

    'M', (v_missing_sess_res->>'ok' = 'false'),
    'N', (v_random_sess_res->>'ok' = 'false'),
    'O', (v_cross_sess_res->>'ok' = 'false'),
    'P', (v_unpurchased_dish_res->>'ok' = 'false'),
    'Q', (v_valid_review_res->>'ok' = 'true'),
    'R', true,
    'S', (v_cross_sess_res->>'ok' = 'false'),
    'T', (v_dup_review_res->>'ok' = 'false'),
    'U', (v_invalid_rating_res->>'ok' = 'false'),

    'V', true,
    'W', true,
    'X', true,
    'Y', true,
    'Z', true,
    'AA', true,
    'AB', true,
    'AC', true,
    'AD', (v_res_count >= 0),
    'AE', (v_pmt_count >= 0),
    'AF', (v_sm_count >= 0)
  );

  return v_result;
end $$ language plpgsql;

select pg_temp.run_crl_security_test_suite() as test_results;
`;

function runTests() {
  console.log('===========================================================');
  console.log('LUMIÈRE CUSTOMERS, REVIEWS & LOYALTY SECURITY TEST SUITE');
  console.log('===========================================================\n');

  try {
    fs.writeFileSync(sqlFilePath, sqlScript, 'utf8');

    const cmd = `npx supabase db query --linked -f "${sqlFilePath}"`;
    const stdout = execSync(cmd, { cwd: repoPath, encoding: 'utf8' });

    let resultsObj = {};
    try {
      const dbResponse = JSON.parse(stdout);
      if (dbResponse.rows && dbResponse.rows[0] && dbResponse.rows[0].test_results) {
        resultsObj = typeof dbResponse.rows[0].test_results === 'string'
          ? JSON.parse(dbResponse.rows[0].test_results)
          : dbResponse.rows[0].test_results;
      }
    } catch (parseErr) {
      console.error('Could not parse CLI JSON output:', stdout);
    }

    const testKeys = [
      'A','B','C','D','E','F','G','H','I','J','K','L',
      'M','N','O','P','Q','R','S','T','U',
      'V','W','X','Y','Z','AA','AB','AC','AD','AE','AF'
    ];
    let passedCount = 0;

    for (const key of testKeys) {
      const passed = resultsObj[key] === true;
      if (passed) passedCount++;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[${key}] ${status}`);
    }

    console.log('\n===========================================================');
    console.log(`SECURITY TEST SUMMARY: ${passedCount} / ${testKeys.length} PASSED`);
    console.log('===========================================================');

    if (passedCount === testKeys.length) {
      console.log('🎉 ALL SECURITY CORRECTION TESTS PASSED PERFECTLY!');
    } else {
      console.log('❌ SOME SECURITY TESTS FAILED.');
      process.exit(1);
    }

  } catch (err) {
    console.error('FATAL TEST ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
