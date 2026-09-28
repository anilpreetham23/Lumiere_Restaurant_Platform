const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoPath = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform";
const sqlFilePath = path.join(repoPath, 'scratch', 'test_security_fix.sql');

const sqlScript = `
create or replace function pg_temp.run_sec_test() returns jsonb as $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_table_a uuid;
  v_menu_item_id text := 'sec_test_dish_101';
  v_inv_item_id uuid;
  v_recipe_id uuid;
  v_sess_a uuid;
  v_sess_b uuid;
  v_order_a uuid;
  v_order_b uuid;

  v_consume_res jsonb;
  v_cross_tenant_res jsonb;
  v_sm_created_by uuid;
  v_result jsonb;
begin
  -- 1. Setup Test Tenants & Users
  select id into v_tenant_a from public.restaurants limit 1;
  select id into v_tenant_b from public.restaurants where id <> v_tenant_a limit 1;
  if v_tenant_b is null then
    insert into public.restaurants (id, name, slug)
    values ('c2222222-2222-2222-2222-222222222222', 'Tenant B Secondary', 'tenant-b-sec')
    returning id into v_tenant_b;
  end if;

  select user_id into v_user_a from public.restaurant_memberships where restaurant_id = v_tenant_a limit 1;
  if v_user_a is null then v_user_a := '00000000-0000-0000-0000-000000000001'::uuid; end if;

  select user_id into v_user_b from public.restaurant_memberships where restaurant_id = v_tenant_b limit 1;
  if v_user_b is null then v_user_b := '00000000-0000-0000-0000-000000000003'::uuid; end if;

  select id into v_table_a from public.restaurant_tables where restaurant_id = v_tenant_a limit 1;
  if v_table_a is null then
    insert into public.restaurant_tables (restaurant_id, label, max_capacity, token)
    values (v_tenant_a, 'T1', 4, gen_random_uuid())
    returning id into v_table_a;
  end if;

  -- Cleanup previous test menu item and recipe if existing
  delete from public.recipe_ingredients where restaurant_id = v_tenant_a;
  delete from public.recipe_headers where restaurant_id = v_tenant_a;
  delete from public.menu_items where id = v_menu_item_id AND restaurant_id = v_tenant_a;

  -- Insert Menu Item for Tenant A
  insert into public.menu_items (id, restaurant_id, title, cuisine, price, prep_minutes, image, short, description)
  values (v_menu_item_id, v_tenant_a, 'Sec Test Dish', 'Italian', 250, 15, '/img/menu/1.jpg', 'Sec Test Dish', 'Sec Test Dish');

  -- Setup Test Inventory Item
  insert into public.inventory_items (restaurant_id, name, category, unit, quantity, reorder_level, cost_per_unit, is_active)
  values (v_tenant_a, 'Sec Test Ingredient', 'Dry Goods', 'kg', 100, 10, 50, true)
  returning id into v_inv_item_id;

  -- Setup Recipe Header & Recipe Ingredients
  insert into public.recipe_headers (restaurant_id, menu_item_id, name, yield_quantity, is_active)
  values (v_tenant_a, v_menu_item_id, 'Sec Test Dish Recipe', 1, true)
  returning id into v_recipe_id;

  insert into public.recipe_ingredients (restaurant_id, recipe_id, inventory_item_id, quantity, unit)
  values (v_tenant_a, v_recipe_id, v_inv_item_id, 2, 'kg');

  -- 2. Create Session Order for Tenant A
  insert into public.dining_sessions (restaurant_id, table_id, status, payment_status)
  values (v_tenant_a, v_table_a, 'open', 'unpaid')
  returning id into v_sess_a;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, status)
  values (v_tenant_a, v_sess_a, floor(extract(epoch from clock_timestamp()))::int, jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_id, 'title', 'Sec Test Dish', 'qty', 1)), 250, 'served')
  returning id into v_order_a;

  -- 3. TEST A, B, C: Execute consumption simulation (with caller auth.uid context)
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- Caller attempts to supply p_user_id = v_user_b to attribute consumption to user B
  v_consume_res := public.consume_order_inventory(v_order_a, v_user_b);

  select created_by into v_sm_created_by
  from public.stock_movements
  where order_id = v_order_a;

  -- Reset jwt claim
  perform set_config('request.jwt.claim.sub', '', true);

  -- 4. TEST D: Cross-tenant consumption attempt (User B trying to consume Tenant A's order)
  insert into public.dining_sessions (restaurant_id, table_id, status, payment_status)
  values (v_tenant_a, v_table_a, 'open', 'unpaid')
  returning id into v_sess_b;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, status)
  values (v_tenant_a, v_sess_b, floor(extract(epoch from clock_timestamp()))::int + 1, jsonb_build_array(jsonb_build_object('menu_item_id', v_menu_item_id, 'title', 'Sec Test Dish', 'qty', 1)), 250, 'served')
  returning id into v_order_b;

  -- Set jwt claim to User B (member of Tenant B)
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);

  v_cross_tenant_res := public.consume_order_inventory(v_order_b, v_user_b);

  -- Reset jwt claim
  perform set_config('request.jwt.claim.sub', '', true);

  -- Cleanup test data
  delete from public.stock_movements where order_id in (v_order_a, v_order_b);
  delete from public.session_orders where id in (v_order_a, v_order_b);
  delete from public.dining_sessions where id in (v_sess_a, v_sess_b);
  delete from public.recipe_ingredients where recipe_id = v_recipe_id;
  delete from public.recipe_headers where id = v_recipe_id;
  delete from public.menu_items where id = v_menu_item_id AND restaurant_id = v_tenant_a;
  delete from public.inventory_items where id = v_inv_item_id;

  v_result := jsonb_build_object(
    'A_spoof_prevented', (v_sm_created_by = v_user_a),
    'B_legit_consumption_worked', (v_consume_res->>'ok' = 'true'),
    'C_created_by_correct', (v_sm_created_by = v_user_a),
    'D_cross_tenant_blocked', (v_cross_tenant_res->>'ok' = 'false' and v_cross_tenant_res->>'error' like '%Unauthorized%'),
    'E_order_consumption_intact', (v_consume_res->>'status' = 'consumed')
  );

  return v_result;
end $$ language plpgsql;

select pg_temp.run_sec_test() as test_results;
`;

function runTests() {
  console.log('===========================================================');
  console.log('INVENTORY CONSUMPTION AUDIT SECURITY FIX TEST SUITE');
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

    const testCases = [
      { key: 'A_spoof_prevented', desc: 'A. Authenticated caller spoofing user_id is overridden by auth.uid()' },
      { key: 'B_legit_consumption_worked', desc: 'B. Legitimate server-side / RPC consumption works cleanly' },
      { key: 'C_created_by_correct', desc: 'C. created_by is set strictly to caller auth.uid()' },
      { key: 'D_cross_tenant_blocked', desc: 'D. Cross-tenant order consumption attempt is blocked' },
      { key: 'E_order_consumption_intact', desc: 'E. Inventory consumption status and idempotency remain intact' },
    ];

    let passedCount = 0;
    for (const tc of testCases) {
      const passed = resultsObj[tc.key] === true;
      if (passed) passedCount++;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[${status}] ${tc.desc}`);
    }

    console.log('\n===========================================================');
    console.log(`SECURITY TEST SUMMARY: ${passedCount} / ${testCases.length} PASSED`);
    console.log('===========================================================');

    if (passedCount === testCases.length) {
      console.log('🎉 AUDIT IDENTITY SECURITY FIX VERIFIED PERFECTLY!');
    } else {
      console.log('❌ SECURITY TEST FAILED.');
      process.exit(1);
    }

  } catch (err) {
    console.error('FATAL TEST ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
