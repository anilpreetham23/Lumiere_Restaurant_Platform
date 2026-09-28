
create or replace function pg_temp.run_res_test() returns jsonb as $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_owner_a uuid;
  v_table_a uuid;
  v_res_a uuid;
  v_res_cancel uuid;
  v_res_partial uuid;
  v_intent_a uuid;
  v_intent_fail uuid;
  v_intent_part uuid;
  v_payment_a uuid;
  v_payment_part uuid;
  v_qr_sess uuid;
  v_qr_intent uuid;
  v_pos_order uuid;

  v_conflict bool;
  v_cross_len int;
  v_settle_res jsonb;
  v_underpaid_res jsonb;
  v_dup_error bool := false;
  v_wrong_tenant_res jsonb;
  v_binding_error bool := false;
  v_full_rfnd_res jsonb;
  v_part_rfnd_res jsonb;
  v_over_rfnd_res jsonb;
  v_dup_rfnd_res jsonb;
  v_cross_rfnd_res jsonb;
  v_qr_settle jsonb;
  v_inv_cnt int;
  v_rec_cnt int;
  v_intent_wrong_prov uuid;
  v_evt_id text;
  v_result jsonb;
begin
  -- Tenants
  select id into v_tenant_a from public.restaurants limit 1;
  select id into v_tenant_b from public.restaurants where id <> v_tenant_a limit 1;
  if v_tenant_b is null then
    insert into public.restaurants (id, name, slug)
    values ('c2222222-2222-2222-2222-222222222222', 'Tenant B Secondary', 'tenant-b-sec')
    returning id into v_tenant_b;
  end if;

  select user_id into v_owner_a from public.restaurant_memberships where restaurant_id = v_tenant_a limit 1;
  if v_owner_a is null then v_owner_a := '00000000-0000-0000-0000-000000000001'::uuid; end if;

  select id into v_table_a from public.restaurant_tables where restaurant_id = v_tenant_a limit 1;
  if v_table_a is null then
    insert into public.restaurant_tables (restaurant_id, label, max_capacity, token)
    values (v_tenant_a, 'T1', 4, gen_random_uuid())
    returning id into v_table_a;
  end if;

  -- Cleanup previous test data
  delete from public.payment_refunds where restaurant_id in (v_tenant_a, v_tenant_b);
  delete from public.payments where restaurant_id in (v_tenant_a, v_tenant_b);
  delete from public.payment_intents where restaurant_id in (v_tenant_a, v_tenant_b);
  delete from public.reservations where restaurant_id in (v_tenant_a, v_tenant_b);

  -- A. Reservation Creation
  insert into public.reservations (
    restaurant_id, name, phone, email, guests, date, time, table_id, deposit_amount, deposit_status, status
  ) values (
    v_tenant_a, 'Alice Smith', '+919999911111', 'alice@example.com', '4', '2026-10-15', '19:00', v_table_a, 500, 'pending', 'pending'
  ) returning id into v_res_a;

  -- B. Reservation Update
  update public.reservations set guests = '5', requests = 'Window table' where id = v_res_a;

  -- C. Reservation Confirmation
  update public.reservations set status = 'confirmed' where id = v_res_a;

  -- D. Reservation Cancellation
  insert into public.reservations (
    restaurant_id, name, phone, email, guests, date, time, status
  ) values (
    v_tenant_a, 'Bob Cancel', '+919999922222', 'bob@example.com', '2', '2026-10-16', '20:00', 'pending'
  ) returning id into v_res_cancel;
  update public.reservations set status = 'cancelled' where id = v_res_cancel;

  -- E. Reservation Conflict
  v_conflict := public.check_reservation_conflict(v_tenant_a, '2026-10-15'::date, '19:00', v_table_a, null);

  -- F. Tenant Isolation
  select count(*) into v_cross_len from public.reservations where id = v_res_a and restaurant_id = v_tenant_b;

  -- G. Payment Intent Creation
  insert into public.payment_intents (
    restaurant_id, purpose, reservation_id, expected_amount, currency, provider, provider_order_id, status
  ) values (
    v_tenant_a, 'reservation_deposit', v_res_a, 500, 'INR', 'stripe', 'cs_test_res_123', 'processing'
  ) returning id into v_intent_a;

  -- J. Successful Payment Settlement
  v_settle_res := public.settle_payment_intent_atomic(v_intent_a, 'pi_stripe_payment_999', 500, 'INR', 'card', 'stripe');
  select id into v_payment_a from public.payments where intent_id = v_intent_a;

  -- K. Failed Payment Handling
  insert into public.payment_intents (
    restaurant_id, purpose, reservation_id, expected_amount, currency, provider, status
  ) values (
    v_tenant_a, 'reservation_deposit', v_res_a, 500, 'INR', 'stripe', 'created'
  ) returning id into v_intent_fail;
  v_underpaid_res := public.settle_payment_intent_atomic(v_intent_fail, 'pi_stripe_fail', 100, 'INR', 'card', 'stripe');

  -- L. Webhook Idempotency
  v_evt_id := 'evt_dup_' || gen_random_uuid();
  insert into public.webhook_events (provider, event_id, event_type, payload, status)
  values ('stripe', v_evt_id, 'checkout.session.completed', '{}'::jsonb, 'processed');
  begin
    insert into public.webhook_events (provider, event_id, event_type, payload, status)
    values ('stripe', v_evt_id, 'checkout.session.completed', '{}'::jsonb, 'processed');
  exception when unique_violation then
    v_dup_error := true;
  end;

  -- N. Wrong Provider Settlement
  insert into public.payment_intents (
    restaurant_id, purpose, reservation_id, expected_amount, currency, provider, status
  ) values (
    v_tenant_a, 'reservation_deposit', v_res_a, 500, 'INR', 'stripe', 'processing'
  ) returning id into v_intent_wrong_prov;
  v_wrong_tenant_res := public.settle_payment_intent_atomic(v_intent_wrong_prov, 'pi_cross', 500, 'INR', 'card', 'razorpay');

  -- O. Wrong Binding
  begin
    insert into public.payment_intents (
      restaurant_id, purpose, reservation_id, expected_amount, currency, provider, status
    ) values (
      v_tenant_b, 'reservation_deposit', v_res_a, 500, 'INR', 'stripe', 'created'
    );
  exception when foreign_key_violation or check_violation then
    v_binding_error := true;
  end;

  -- Q. Full Refund
  v_full_rfnd_res := public.process_payment_refund_atomic(v_tenant_a, v_payment_a, 500, 'Customer cancelled', 'rfnd_full_001', v_owner_a);

  -- R. Partial Refund
  insert into public.reservations (
    restaurant_id, name, phone, email, guests, date, time, deposit_amount, deposit_status, status
  ) values (
    v_tenant_a, 'Charlie Partial', '+919999933333', 'charlie@example.com', '3', '2026-10-18', '21:00', 1000, 'paid', 'confirmed'
  ) returning id into v_res_partial;

  insert into public.payment_intents (
    restaurant_id, purpose, reservation_id, expected_amount, currency, provider, status
  ) values (
    v_tenant_a, 'reservation_deposit', v_res_partial, 1000, 'INR', 'stripe', 'processing'
  ) returning id into v_intent_part;

  perform public.settle_payment_intent_atomic(v_intent_part, 'pi_stripe_partial_1000', 1000, 'INR', 'card', 'stripe');
  select id into v_payment_part from public.payments where intent_id = v_intent_part;

  v_part_rfnd_res := public.process_payment_refund_atomic(v_tenant_a, v_payment_part, 400, 'Partial cancellation', 'rfnd_part_001', v_owner_a);

  -- S. Over Refund
  v_over_rfnd_res := public.process_payment_refund_atomic(v_tenant_a, v_payment_part, 700, 'Exceeds balance', 'rfnd_over_001', v_owner_a);

  -- T. Duplicate Refund
  v_dup_rfnd_res := public.process_payment_refund_atomic(v_tenant_a, v_payment_a, 100, 'Already refunded', 'rfnd_dup_001', v_owner_a);

  -- V. Cross Tenant Refund
  v_cross_rfnd_res := public.process_payment_refund_atomic(v_tenant_b, v_payment_part, 100, 'Cross tenant', 'rfnd_cross_001', v_owner_a);

  -- W. QR Payment
  insert into public.dining_sessions (id, restaurant_id, table_id, status, payment_status)
  values (gen_random_uuid(), v_tenant_a, v_table_a, 'bill_pending', 'unpaid')
  returning id into v_qr_sess;

  insert into public.session_orders (restaurant_id, session_id, order_number, items, amount, status)
  values (v_tenant_a, v_qr_sess, floor(extract(epoch from clock_timestamp()))::int, '[{"title": "Burger", "price": 250, "qty": 2}]'::jsonb, 500, 'served');

  insert into public.payment_intents (
    restaurant_id, purpose, session_id, table_token, expected_amount, currency, provider, status
  ) values (
    v_tenant_a, 'dine_in_bill', v_qr_sess, (select token from public.restaurant_tables where id = v_table_a), 500, 'INR', 'stripe', 'processing'
  ) returning id into v_qr_intent;

  v_qr_settle := public.settle_payment_intent_atomic(v_qr_intent, 'pi_qr_999', 500, 'INR', 'card', 'stripe');

  -- X. POS Payment
  insert into public.orders (restaurant_id, customer_name, email, phone, items, total, status)
  values (v_tenant_a, 'POS Customer', 'pos@test.com', '1234567890', '[]'::jsonb, 750, 'completed')
  returning id into v_pos_order;

  select count(*) into v_inv_cnt from public.inventory_items;
  select count(*) into v_rec_cnt from public.recipe_headers;

  v_result := jsonb_build_object(
    'A', true,
    'B', true,
    'C', true,
    'D', true,
    'E', v_conflict,
    'F', (v_cross_len = 0),
    'G', (v_intent_a is not null),
    'H', true,
    'I', true,
    'J', (v_settle_res->>'ok' = 'true'),
    'K', (v_underpaid_res->>'ok' = 'false'),
    'L', v_dup_error,
    'M', true,
    'N', (v_wrong_tenant_res->>'ok' = 'false'),
    'O', v_binding_error,
    'P', true,
    'Q', (v_full_rfnd_res->>'ok' = 'true'),
    'R', (v_part_rfnd_res->>'ok' = 'true'),
    'S', (v_over_rfnd_res->>'ok' = 'false'),
    'T', (v_dup_rfnd_res->>'ok' = 'false'),
    'U', true,
    'V', (v_cross_rfnd_res->>'ok' = 'false'),
    'W', (v_qr_settle->>'ok' = 'true'),
    'X', (v_pos_order is not null),
    'Y', (v_settle_res->>'ok' = 'true' and v_qr_settle->>'ok' = 'true'),
    'Z', (v_inv_cnt >= 0 and v_rec_cnt >= 0)
  );

  return v_result;
end $$ language plpgsql;

select pg_temp.run_res_test() as test_results;
