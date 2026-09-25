-- ============================================================================
-- Lumière B2B — Staff & Employees Management System Migration
-- Migration: 20260925100000_b2b_phase_employee_records.sql
-- ============================================================================

-- 1. Create public.employee_records table
CREATE TABLE IF NOT EXISTS public.employee_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date,
  gender text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department text NOT NULL,
  designation text NOT NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_records_restaurant_code_key UNIQUE (restaurant_id, employee_code)
);

-- 2. Indexes for tenant-scoped query optimization
CREATE INDEX IF NOT EXISTS idx_employee_records_restaurant
  ON public.employee_records(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_employee_records_status
  ON public.employee_records(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_records_department
  ON public.employee_records(restaurant_id, department);

CREATE INDEX IF NOT EXISTS idx_employee_records_designation
  ON public.employee_records(restaurant_id, designation);

CREATE INDEX IF NOT EXISTS idx_employee_records_joining_date
  ON public.employee_records(restaurant_id, joining_date);

CREATE INDEX IF NOT EXISTS idx_employee_records_phone
  ON public.employee_records(restaurant_id, phone);

CREATE INDEX IF NOT EXISTS idx_employee_records_code
  ON public.employee_records(restaurant_id, employee_code);

CREATE INDEX IF NOT EXISTS idx_employee_records_user
  ON public.employee_records(restaurant_id, user_id);

-- 3. Row Level Security Policies
ALTER TABLE public.employee_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manager_read_employee_records" ON public.employee_records;
CREATE POLICY "owner_manager_read_employee_records" ON public.employee_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = employee_records.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.status = 'active'
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "owner_manager_insert_employee_records" ON public.employee_records;
CREATE POLICY "owner_manager_insert_employee_records" ON public.employee_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = employee_records.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.status = 'active'
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "owner_manager_update_employee_records" ON public.employee_records;
CREATE POLICY "owner_manager_update_employee_records" ON public.employee_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = employee_records.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.status = 'active'
        AND rm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "owner_delete_employee_records" ON public.employee_records;
CREATE POLICY "owner_delete_employee_records" ON public.employee_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm
      WHERE rm.restaurant_id = employee_records.restaurant_id
        AND rm.user_id = auth.uid()
        AND rm.status = 'active'
        AND rm.role = 'owner'
    )
  );
