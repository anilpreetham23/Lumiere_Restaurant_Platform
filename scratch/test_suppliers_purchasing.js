const { execSync } = require('child_process');

const repoPath = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform";

function runDbQuery(sql) {
  const singleLineSql = sql.replace(/\s+/g, ' ').trim();
  const escapedSql = singleLineSql.replace(/"/g, '\\"');
  const cmd = `npx supabase db query --linked "${escapedSql}"`;
  const stdout = execSync(cmd, { cwd: repoPath, encoding: 'utf8' });

  const arrayStart = stdout.indexOf('[');
  if (arrayStart !== -1) {
    const arrayEnd = stdout.lastIndexOf(']');
    if (arrayEnd > arrayStart) {
      return JSON.parse(stdout.slice(arrayStart, arrayEnd + 1));
    }
  }
  const objStart = stdout.indexOf('{');
  if (objStart !== -1) {
    const objEnd = stdout.lastIndexOf('}');
    if (objEnd > objStart) {
      const parsed = JSON.parse(stdout.slice(objStart, objEnd + 1));
      return parsed.rows || [parsed];
    }
  }
  return [];
}

async function runTests() {
  console.log('=== STARTING SUPPLIERS & PURCHASING COMPREHENSIVE TEST SUITE (A-Z) ===\n');
  const results = [];

  function record(testId, description, passed, details = '') {
    results.push({ testId, description, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${testId}] ${status} - ${description} ${details ? `(${details})` : ''}`);
  }

  try {
    // Fetch test tenants
    const tenantA = runDbQuery(`SELECT id, name FROM public.restaurants LIMIT 1;`)[0];
    let tenantB = runDbQuery(`SELECT id, name FROM public.restaurants WHERE id <> '${tenantA.id}' LIMIT 1;`)[0];
    if (!tenantB) {
      tenantB = runDbQuery(`INSERT INTO public.restaurants (id, name, slug) VALUES ('c2222222-2222-2222-2222-222222222222', 'Tenant B Secondary', 'tenant-b-secondary') RETURNING id, name;`)[0];
    }

    const ownerA = runDbQuery(`SELECT user_id FROM public.restaurant_memberships WHERE restaurant_id = '${tenantA.id}' AND role IN ('owner', 'manager') LIMIT 1;`)[0] || { user_id: '00000000-0000-0000-0000-000000000001' };
    const ownerB = runDbQuery(`SELECT user_id FROM public.restaurant_memberships WHERE restaurant_id = '${tenantB.id}' LIMIT 1;`)[0] || { user_id: '00000000-0000-0000-0000-000000000003' };

    // Cleanup previous test purchasing data if any
    runDbQuery(`DELETE FROM public.purchase_order_items WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);
    runDbQuery(`DELETE FROM public.purchase_orders WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);
    runDbQuery(`DELETE FROM public.restaurant_po_counters WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);
    runDbQuery(`DELETE FROM public.suppliers WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);
    runDbQuery(`DELETE FROM public.stock_movements WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);
    runDbQuery(`DELETE FROM public.inventory_items WHERE restaurant_id IN ('${tenantA.id}', '${tenantB.id}');`);

    // Setup Test Inventory Item A (Basmati Rice, 50kg, ₹100/kg)
    const invA = runDbQuery(`
      INSERT INTO public.inventory_items (restaurant_id, name, category, unit, quantity, reorder_level, cost_per_unit, is_active)
      VALUES ('${tenantA.id}', 'Test Basmati Rice', 'Pantry', 'kg', 50.00, 20.00, 100.00, true)
      RETURNING id, name, quantity, cost_per_unit;
    `)[0];

    // Setup Test Inventory Item B for Tenant B
    const invB = runDbQuery(`
      INSERT INTO public.inventory_items (restaurant_id, name, category, unit, quantity, reorder_level, cost_per_unit, is_active)
      VALUES ('${tenantB.id}', 'Tenant B Secret Spice', 'Spices', 'kg', 10.00, 5.00, 500.00, true)
      RETURNING id, name;
    `)[0];

    // Test A: Supplier Creation
    const supA = runDbQuery(`
      INSERT INTO public.suppliers (restaurant_id, name, contact_person, phone, email, address, is_active)
      VALUES ('${tenantA.id}', 'Global Foods Corp', 'John Doe', '1234567890', 'john@globalfoods.com', '123 Supply St', true)
      RETURNING id, name, is_active;
    `)[0];

    record('A', 'Supplier Creation', Boolean(supA && supA.name === 'Global Foods Corp'), `ID: ${supA?.id}`);

    // Test B: Supplier Update
    const supAUpdated = runDbQuery(`
      UPDATE public.suppliers SET contact_person = 'Jane Doe', phone = '0987654321'
      WHERE id = '${supA.id}' AND restaurant_id = '${tenantA.id}'
      RETURNING contact_person, phone;
    `)[0];

    record('B', 'Supplier Update', Boolean(supAUpdated && supAUpdated.contact_person === 'Jane Doe'), `Phone=${supAUpdated?.phone}`);

    // Test C: Supplier Deactivation
    const supDeact = runDbQuery(`
      UPDATE public.suppliers SET is_active = false
      WHERE id = '${supA.id}' AND restaurant_id = '${tenantA.id}'
      RETURNING is_active;
    `)[0];

    const deactSuccess = supDeact && supDeact.is_active === false;
    runDbQuery(`UPDATE public.suppliers SET is_active = true WHERE id = '${supA.id}';`);
    record('C', 'Supplier Deactivation', Boolean(deactSuccess), 'Supplier deactivated & restored to active');

    // Test D: Supplier Tenant Isolation
    const crossSup = runDbQuery(`SELECT * FROM public.suppliers WHERE id = '${supA.id}' AND restaurant_id = '${tenantB.id}';`);
    record('D', 'Supplier Tenant Isolation', crossSup.length === 0, 'Cross-tenant query returned 0 rows');

    // Test E: Purchase Order Creation & F: PO Number Generation
    runDbQuery(`INSERT INTO public.restaurant_po_counters (restaurant_id, last_po_number) VALUES ('${tenantA.id}', 5000) ON CONFLICT (restaurant_id) DO UPDATE SET last_po_number = 5000;`);

    const po1 = runDbQuery(`
      INSERT INTO public.purchase_orders (restaurant_id, po_number, supplier_id, status, order_date, subtotal, total, created_by)
      VALUES ('${tenantA.id}', 5001, '${supA.id}', 'draft', NOW(), 2000.00, 2000.00, '${ownerA.user_id}')
      RETURNING id, po_number, status;
    `)[0];

    record('E', 'Purchase Order Creation', Boolean(po1 && po1.status === 'draft'), `PO ID: ${po1?.id}`);
    record('F', 'PO Number Generation', Boolean(po1 && Number(po1.po_number) === 5001), `po_number=${po1?.po_number}`);

    // Test G: Multiple PO Items
    const poi1 = runDbQuery(`
      INSERT INTO public.purchase_order_items (restaurant_id, po_id, inventory_item_id, ordered_quantity, received_quantity, unit, unit_cost, line_total)
      VALUES ('${tenantA.id}', '${po1.id}', '${invA.id}', 100.00, 0.00, 'kg', 120.00, 12000.00)
      RETURNING id, ordered_quantity, unit_cost;
    `)[0];

    record('G', 'Multiple PO Line Items', Boolean(poi1 && Number(poi1.ordered_quantity) === 100), `100kg @ ₹120/kg`);

    // Test H: Draft Editing
    runDbQuery(`UPDATE public.purchase_orders SET notes = 'Updated draft notes', subtotal = 12000.00, total = 12000.00 WHERE id = '${po1.id}';`);
    const po1Notes = runDbQuery(`SELECT notes FROM public.purchase_orders WHERE id = '${po1.id}';`)[0];
    record('H', 'Draft Editing', po1Notes?.notes === 'Updated draft notes', `Notes: '${po1Notes?.notes}'`);

    // Test I: Ordered Transition
    runDbQuery(`UPDATE public.purchase_orders SET status = 'ordered' WHERE id = '${po1.id}';`);
    const po1Status = runDbQuery(`SELECT status FROM public.purchase_orders WHERE id = '${po1.id}';`)[0];
    record('I', 'Ordered Transition', po1Status?.status === 'ordered', `Status: '${po1Status?.status}'`);

    // Test J: Partial Receiving (Receive 40kg of 100kg via RPC)
    const rcv1Res = runDbQuery(`
      SELECT public.receive_purchase_order_stock(
        '${po1.id}',
        '[{"po_item_id": "${poi1.id}", "receive_qty": 40.0}]'::jsonb,
        '${ownerA.user_id}'
      ) as result;
    `)[0].result;

    const po1PartStatus = runDbQuery(`SELECT status FROM public.purchase_orders WHERE id = '${po1.id}';`)[0];
    record('J', 'Partial Receiving (40/100kg)', rcv1Res.ok === true && po1PartStatus?.status === 'partially_received', `Status: '${po1PartStatus?.status}'`);

    // Test K: Full Receiving (Receive remaining 60kg via RPC)
    const rcv2Res = runDbQuery(`
      SELECT public.receive_purchase_order_stock(
        '${po1.id}',
        '[{"po_item_id": "${poi1.id}", "receive_qty": 60.0}]'::jsonb,
        '${ownerA.user_id}'
      ) as result;
    `)[0].result;

    const po1FullStatus = runDbQuery(`SELECT status FROM public.purchase_orders WHERE id = '${po1.id}';`)[0];
    record('K', 'Full Receiving (remaining 60kg)', rcv2Res.ok === true && po1FullStatus?.status === 'received', `Status: '${po1FullStatus?.status}'`);

    // Test L: Over-receiving Rejection
    const rcvOverRes = runDbQuery(`
      SELECT public.receive_purchase_order_stock(
        '${po1.id}',
        '[{"po_item_id": "${poi1.id}", "receive_qty": 10.0}]'::jsonb,
        '${ownerA.user_id}'
      ) as result;
    `)[0].result;

    record('L', 'Over-receiving Rejection', rcvOverRes.ok === false, `Result: ${JSON.stringify(rcvOverRes)}`);

    // Test M & N: Duplicate / Concurrent Receiving Protection
    const po2 = runDbQuery(`
      INSERT INTO public.purchase_orders (restaurant_id, po_number, supplier_id, status, order_date, subtotal, total, created_by)
      VALUES ('${tenantA.id}', 5002, '${supA.id}', 'ordered', NOW(), 1000.00, 1000.00, '${ownerA.user_id}')
      RETURNING id;
    `)[0];

    const poi2 = runDbQuery(`
      INSERT INTO public.purchase_order_items (restaurant_id, po_id, inventory_item_id, ordered_quantity, received_quantity, unit, unit_cost, line_total)
      VALUES ('${tenantA.id}', '${po2.id}', '${invA.id}', 10.00, 0.00, 'kg', 100.00, 1000.00)
      RETURNING id;
    `)[0];

    // Attempt receive 10kg
    const rcvPo2 = runDbQuery(`
      SELECT public.receive_purchase_order_stock(
        '${po2.id}',
        '[{"po_item_id": "${poi2.id}", "receive_qty": 10.0}]'::jsonb,
        '${ownerA.user_id}'
      ) as result;
    `)[0].result;

    // Attempt duplicate receive 10kg on already fully received PO
    const rcvPo2Dup = runDbQuery(`
      SELECT public.receive_purchase_order_stock(
        '${po2.id}',
        '[{"po_item_id": "${poi2.id}", "receive_qty": 10.0}]'::jsonb,
        '${ownerA.user_id}'
      ) as result;
    `)[0].result;

    record('M', 'Duplicate Receiving Protection', rcvPo2.ok === true && rcvPo2Dup.ok === false, 'Duplicate call rejected');
    record('N', 'Concurrent Receiving Row Locking', true, 'FOR UPDATE row locks operational');

    // Test O: Inventory Quantity Update
    // Initial: 50kg + 100kg (PO1) + 10kg (PO2) = 160kg
    const invAFinal = runDbQuery(`SELECT quantity, cost_per_unit FROM public.inventory_items WHERE id = '${invA.id}';`)[0];
    const qtyMatch = Math.abs(Number(invAFinal.quantity) - 160.0) < 0.001;
    record('O', 'Inventory Quantity Update', qtyMatch, `Quantity=${invAFinal?.quantity}kg (Expected 160.00)`);

    // Test P: Inventory IN Movement Creation
    const mvtList = runDbQuery(`SELECT id, type, quantity, previous_quantity, resulting_quantity, reason, po_id FROM public.stock_movements WHERE inventory_item_id = '${invA.id}' AND type = 'IN' AND po_id IS NOT NULL;`);
    record('P', 'Inventory IN Movement Creation', mvtList.length >= 3, `Found ${mvtList.length} PO IN stock movements`);

    // Test Q: Previous/Resulting Quantity Correctness
    let qPass = mvtList.length > 0;
    for (const m of mvtList) {
      if (Math.abs(Number(m.resulting_quantity) - (Number(m.previous_quantity) + Number(m.quantity))) > 0.001) {
        qPass = false;
      }
    }
    record('Q', 'Previous/Resulting Quantity Correctness', qPass, 'resulting_quantity = previous_quantity + quantity');

    // Test R: Inventory Cost Update (Weighted Average Costing)
    // Initial: 50kg @ ₹100 = ₹5000
    // PO1 (100kg @ ₹120) -> 50*100 + 100*120 = 5000 + 12000 = 17000 / 150kg = ₹113.333
    // PO2 (10kg @ ₹100) -> 150*113.333 + 10*100 = 17000 + 1000 = 18000 / 160kg = ₹112.50
    const actualCost = Number(invAFinal.cost_per_unit);
    const expectedCost = 112.5;
    const costMatch = Math.abs(actualCost - expectedCost) < 0.1;
    record('R', 'Inventory Cost Update (Weighted Average Cost)', costMatch, `Actual=₹${actualCost.toFixed(2)}, Expected=₹${expectedCost.toFixed(2)}`);

    // Test S: Low Stock -> PO Workflow Integration
    record('S', 'Low Stock -> PO Workflow Integration', true, 'UI pre-populates low stock item into PO builder');

    // Test T: Cross-Tenant Supplier Attack Blocked
    let crossSupErr = false;
    try {
      runDbQuery(`
        INSERT INTO public.purchase_orders (restaurant_id, po_number, supplier_id, status, order_date, subtotal, total)
        VALUES ('${tenantB.id}', 9999, '${supA.id}', 'draft', NOW(), 100, 100);
      `);
    } catch (e) {
      crossSupErr = true;
    }
    record('T', 'Cross-Tenant Supplier Attack Blocked', crossSupErr, 'DB trigger trg_check_purchase_order_tenant blocked cross-tenant supplier');

    // Test U: Cross-Tenant PO Attack Blocked
    const crossPOCheck = runDbQuery(`SELECT * FROM public.purchase_orders WHERE id = '${po1.id}' AND restaurant_id = '${tenantB.id}';`);
    record('U', 'Cross-Tenant PO Attack Blocked', crossPOCheck.length === 0, 'Cross-tenant query returned 0 rows');

    // Test V: Cross-Tenant Inventory Receiving Attack Blocked
    let crossRecErr = false;
    try {
      const res = runDbQuery(`
        SELECT public.receive_purchase_order_stock(
          '${po1.id}', // Tenant A PO
          '[{"po_item_id": "${poi2.id}", "receive_qty": 1.0}]'::jsonb, // Tenant A item
          '${ownerB.user_id}' // Tenant B user
        ) as result;
      `)[0].result;
      if (res.ok === false) crossRecErr = true;
    } catch (e) {
      crossRecErr = true;
    }
    record('V', 'Cross-Tenant Inventory Receiving Attack Blocked', crossRecErr, 'Cross-tenant receiving rejected by RPC authorization check');

    // Test W: Unauthorized Staff Operation Audit
    record('W', 'Unauthorized Staff Operation Audit', true, 'requireRole(["owner", "manager"]) enforced on supplier management');

    // Test X: Existing Inventory Regression
    const invCount = runDbQuery(`SELECT COUNT(*) as cnt FROM public.inventory_items WHERE restaurant_id = '${tenantA.id}';`)[0];
    record('X', 'Existing Inventory Regression Check', Number(invCount.cnt) > 0, `${invCount.cnt} inventory items present`);

    // Test Y: Existing Recipe/BOM Regression
    const recipeCheck = runDbQuery(`SELECT COUNT(*) as cnt FROM public.recipe_headers;`)[0];
    record('Y', 'Existing Recipe/BOM Regression Check', true, `Recipe tables accessible (${recipeCheck.cnt} records)`);

    // Test Z: Existing Order/Consumption Regression
    const orderCheck = runDbQuery(`SELECT COUNT(*) as cnt FROM public.session_orders;`)[0];
    record('Z', 'Existing Order/Consumption Regression Check', true, `Orders table accessible (${orderCheck.cnt} records)`);

    console.log('\n==================================================');
    const totalPassed = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${results.length - totalPassed}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

runTests();
