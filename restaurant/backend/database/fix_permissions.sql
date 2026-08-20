-- ==============================================================================
-- 1-CLICK COMPLETE SETUP & PERMISSION FIX FOR SUPABASE (FAILSAFE)
-- Copy and paste this ENTIRE script into Supabase Dashboard -> SQL Editor and click RUN
-- Contains strictly the 5 active project tables:
-- 1. sd_employees
-- 2. sd_menu_items
-- 3. sd_notifications
-- 4. sd_orders
-- 5. sd_purchase_orders
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure all 5 project tables exist (CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS sd_employees (
  id TEXT PRIMARY KEY DEFAULT 'emp_' || gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'receptionist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sd_menu_items (
  id TEXT PRIMARY KEY DEFAULT 'item_' || gen_random_uuid(),
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  image_url TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  preparation_time INT DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sd_orders (
  id TEXT PRIMARY KEY DEFAULT 'ord_' || gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer TEXT NOT NULL,
  table_number INT,
  item JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  payment TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment IN ('paid', 'unpaid', 'refunded', 'pending')),
  order_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sd_notifications (
  id TEXT PRIMARY KEY DEFAULT 'notif_' || gen_random_uuid(),
  table_number TEXT,
  request_type TEXT,
  status TEXT DEFAULT 'Pending',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sd_notifications ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE sd_notifications ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE sd_notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS sd_purchase_orders (
  id TEXT PRIMARY KEY DEFAULT 'po_' || gen_random_uuid(),
  supplier TEXT NOT NULL,
  items INT NOT NULL DEFAULT 1,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  date TEXT DEFAULT 'Today',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  entry_type TEXT DEFAULT 'Direct Restock' CHECK (entry_type IN ('Direct Restock', 'Kitchen Raw Ingredients', 'Beverages & Dairy', 'Packaging & Consumables', 'Equipment & Maintenance')),
  payment_terms TEXT DEFAULT 'Prepaid' CHECK (payment_terms IN ('Prepaid', 'Pay on Delivery (POD)')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sd_purchase_orders DROP CONSTRAINT IF EXISTS sd_purchase_orders_entry_type_check;
ALTER TABLE public.sd_purchase_orders ADD CONSTRAINT sd_purchase_orders_entry_type_check CHECK (entry_type IN ('Direct Restock', 'Kitchen Raw Ingredients', 'Beverages & Dairy', 'Packaging & Consumables', 'Equipment & Maintenance'));


-- 3. Grant full table, sequence, and function privileges to public roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE sd_orders ADD COLUMN IF NOT EXISTS payment_category TEXT;

-- 4. Enable RLS & Drop existing policies to prevent conflicts
ALTER TABLE sd_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on sd_employees" ON sd_employees;
DROP POLICY IF EXISTS "Allow anon all on sd_menu_items" ON sd_menu_items;
DROP POLICY IF EXISTS "Allow anon all on sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow public read sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow public write sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow anon all on sd_notifications" ON sd_notifications;
DROP POLICY IF EXISTS "Allow anon all on sd_purchase_orders" ON sd_purchase_orders;

-- 5. Create policies for project tables
CREATE POLICY "Allow anon all on sd_employees" ON sd_employees FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on sd_menu_items" ON sd_menu_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on sd_notifications" ON sd_notifications FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on sd_purchase_orders" ON sd_purchase_orders FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Strict Customer Order Isolation RLS Policy for sd_orders
DROP POLICY IF EXISTS "Allow anon insert on sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow staff all access on sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow session customer read sd_orders" ON sd_orders;
DROP POLICY IF EXISTS "Allow anon customer session read sd_orders" ON sd_orders;

-- Allows anonymous insertion (customers placing orders)
CREATE POLICY "Allow anon insert on sd_orders" ON sd_orders FOR INSERT TO public WITH CHECK (true);

-- Allows staff / admin / backend service role full access to all orders
CREATE POLICY "Allow staff all access on sd_orders" ON sd_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Scopes SELECT access so customers can ONLY read orders matching their active x-session-id header
CREATE POLICY "Allow anon customer session read sd_orders" ON sd_orders FOR SELECT TO public USING (
  session_id = (current_setting('request.headers', true)::json->>'x-session-id')
);

