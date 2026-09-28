-- Allow public table ordering customers (anon & authenticated) to initialize payment intents and execute atomic settlement
grant execute on function public.settle_payment_intent_atomic(uuid, text, numeric, text, text, text) to anon, authenticated, service_role;

-- Allow insert on payment_intents for payment initialization
drop policy if exists "anon insert payment_intents" on public.payment_intents;
create policy "anon insert payment_intents" on public.payment_intents
  for insert to anon, authenticated
  with check (true);

-- Allow select on payment_intents for status verification
drop policy if exists "anon select payment_intents" on public.payment_intents;
create policy "anon select payment_intents" on public.payment_intents
  for select to anon, authenticated
  using (true);

-- Allow update on payment_intents for failure status
drop policy if exists "anon update payment_intents" on public.payment_intents;
create policy "anon update payment_intents" on public.payment_intents
  for update to anon, authenticated
  using (true);
