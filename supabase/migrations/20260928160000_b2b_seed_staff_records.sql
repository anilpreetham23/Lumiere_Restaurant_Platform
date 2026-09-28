begin;

-- 1. Grant public read access to active employee records for public website Team section
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employee_records'
      and policyname = 'public_read_active_employee_records'
  ) then
    create policy "public_read_active_employee_records" on public.employee_records
      for select to anon, authenticated
      using (status = 'active');
  end if;
end $$;

-- 2. Seed realistic Lumière staff and workforce records
insert into public.employee_records (
  restaurant_id, employee_code, full_name, phone, email, department, designation, employment_type, joining_date, status, notes
) values
  -- CULINARY LEADERSHIP & CHEFS
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1001', 'Antoine Laurent', '+44 20 7946 0101', 'antoine.laurent@lumiere.com', 'Kitchen', 'Master Chef & Executive Culinary Director', 'full_time', '2015-04-15', 'active', '3-Star Michelin trained master chef leading global haute cuisine brigade.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1002', 'Alice Moreau', '+44 20 7946 0102', 'alice.moreau@lumiere.com', 'Kitchen', 'Head Chef / Chef de Cuisine', 'full_time', '2018-06-01', 'active', 'French classicist overseeing daily kitchen operations & pass line.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1003', 'Marco Bianchi', '+44 20 7946 0103', 'marco.bianchi@lumiere.com', 'Kitchen', 'Sous Chef - Italian & Risotto Specialist', 'full_time', '2019-09-15', 'active', 'Piedmontese pasta and white truffle master.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1004', 'Kenji Tanaka', '+44 20 7946 0104', 'kenji.tanaka@lumiere.com', 'Kitchen', 'Sous Chef - Japanese & Raw Seafood Master', 'full_time', '2020-02-10', 'active', 'Tokyo-trained Edomae sushi and robata specialist.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1005', 'Camille Laurent', '+44 20 7946 0105', 'camille.laurent@lumiere.com', 'Kitchen', 'Head Pâtissier / Executive Pastry Chef', 'full_time', '2021-01-20', 'active', 'Le Cordon Bleu graduate crafting soufflés & artisan chocolate.'),

  -- INVENTORY & STOCK MANAGEMENT
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1006', 'Elena Rostova', '+44 20 7946 0106', 'elena.rostova@lumiere.com', 'Inventory & Operations', 'Head of Inventory & Stock Audit', 'full_time', '2021-08-01', 'active', 'Manages ingredient BOM, daily stock counts, waste tracking, and supplier POs.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1012', 'Marcus Sterling', '+44 20 7946 0112', 'marcus.sterling@lumiere.com', 'Inventory & Operations', 'Stock Procurement & Goods Inspector', 'full_time', '2023-10-01', 'active', 'Inspects supplier deliveries, verifies purchase orders, and logs ingredient batch quality.'),

  -- BEVERAGE & MANAGEMENT
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1007', 'Jean-Luc Dubois', '+44 20 7946 0107', 'jeanluc.dubois@lumiere.com', 'Beverage & Wine', 'Head Sommelier & Cellar Master', 'full_time', '2017-11-12', 'active', 'Manages 400+ fine wine allocations and pairing menus.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1008', 'Sophia Vance', '+44 20 7946 0108', 'sophia.vance@lumiere.com', 'Management', 'General Manager & Maître d''Hotel', 'full_time', '2016-03-01', 'active', 'Oversees front-of-house operations, VIP reservations, and guest experience.'),

  -- SERVICE & WAITERS
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1009', 'Matteo Rossi', '+44 20 7946 0109', 'matteo.rossi@lumiere.com', 'Service & Floor', 'Head Waiter & Floor Captain', 'full_time', '2022-04-18', 'active', 'Main Dining Room floor supervisor and table service captain.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1010', 'Lucas Petit', '+44 20 7946 0110', 'lucas.petit@lumiere.com', 'Service & Floor', 'Senior Waiter - VIP Section', 'full_time', '2023-02-01', 'active', 'Specialist waiter for private dining rooms and VIP guests.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'EMP-1011', 'Priya Sharma', '+44 20 7946 0111', 'priya.sharma@lumiere.com', 'Service & Floor', 'Senior Waiter - Main Dining', 'full_time', '2023-07-15', 'active', 'Front-of-house service staff and table order management.')

on conflict (restaurant_id, employee_code) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  department = excluded.department,
  designation = excluded.designation,
  employment_type = excluded.employment_type,
  joining_date = excluded.joining_date,
  status = excluded.status,
  notes = excluded.notes;

commit;
