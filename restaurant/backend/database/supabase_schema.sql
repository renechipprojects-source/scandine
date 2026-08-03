-- ==============================================================================
-- RESTAURANT ERP - SUPABASE POSTGRESQL SCHEMA & RLS SETUP
-- Contains strictly the 5 active project tables:
-- 1. sd_employees
-- 2. sd_menu_items
-- 3. sd_notifications
-- 4. sd_orders
-- 5. sd_purchase_orders
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-initializing
DROP TABLE IF EXISTS sd_purchase_orders CASCADE;
DROP TABLE IF EXISTS sd_notifications CASCADE;
DROP TABLE IF EXISTS sd_orders CASCADE;
DROP TABLE IF EXISTS sd_menu_items CASCADE;
DROP TABLE IF EXISTS sd_employees CASCADE;

-- ------------------------------------------------------------------------------
-- TABLE: sd_employees
-- ------------------------------------------------------------------------------
CREATE TABLE sd_employees (
  id TEXT PRIMARY KEY DEFAULT 'emp_' || gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'receptionist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: sd_menu_items
-- ------------------------------------------------------------------------------
CREATE TABLE sd_menu_items (
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

-- ------------------------------------------------------------------------------
-- TABLE: sd_orders
-- ------------------------------------------------------------------------------
CREATE TABLE sd_orders (
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

-- ------------------------------------------------------------------------------
-- TABLE: sd_notifications
-- ------------------------------------------------------------------------------
CREATE TABLE sd_notifications (
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

-- ------------------------------------------------------------------------------
-- TABLE: sd_purchase_orders
-- ------------------------------------------------------------------------------
CREATE TABLE sd_purchase_orders (
  id TEXT PRIMARY KEY DEFAULT 'po_' || gen_random_uuid(),
  supplier TEXT NOT NULL,
  items INT NOT NULL DEFAULT 1,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  date TEXT DEFAULT 'Today',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE sd_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read sd_employees" ON sd_employees FOR SELECT USING (true);
CREATE POLICY "Allow public write sd_employees" ON sd_employees FOR ALL USING (true);

CREATE POLICY "Allow public read sd_menu_items" ON sd_menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public write sd_menu_items" ON sd_menu_items FOR ALL USING (true);

CREATE POLICY "Allow public read sd_orders" ON sd_orders FOR SELECT USING (true);
CREATE POLICY "Allow public write sd_orders" ON sd_orders FOR ALL USING (true);

CREATE POLICY "Allow public read sd_notifications" ON sd_notifications FOR SELECT USING (true);
CREATE POLICY "Allow public write sd_notifications" ON sd_notifications FOR ALL USING (true);

CREATE POLICY "Allow public read sd_purchase_orders" ON sd_purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow public write sd_purchase_orders" ON sd_purchase_orders FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- SUPABASE REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE sd_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sd_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE sd_purchase_orders;

-- ------------------------------------------------------------------------------
-- SEED INITIAL DATA
-- ------------------------------------------------------------------------------

INSERT INTO sd_employees (id, name, email, phone, role, address) VALUES
  ('emp_1', 'Elena Rostova', 'elena@savory.com', '+1 415 555 0101', 'owner', '123 Main St, San Francisco, CA'),
  ('emp_2', 'Marcus Vance', 'marcus@savory.com', '+1 415 555 0102', 'manager', '456 Market St, San Francisco, CA'),
  ('emp_3', 'Sophia Lin', 'sophia@savory.com', '+1 415 555 0103', 'cashier', '789 Mission St, San Francisco, CA'),
  ('emp_4', 'Chef Antoine Dubois', 'antoine@savory.com', '+1 415 555 0104', 'kitchen_staff', '101 Howard St, San Francisco, CA'),
  ('emp_5', 'Carlos Gomez', 'carlos@savory.com', '+1 415 555 0105', 'waiter', '202 Folsom St, San Francisco, CA');

INSERT INTO sd_menu_items (id, category_id, name, description, image, image_url, price, available, preparation_time) VALUES
  ('item_1', 'cat_1', 'Truffle Arancini', 'Crispy risotto balls with black truffle and mozzarella', 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop', 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop', 16.50, true, 12),
  ('item_2', 'cat_2', 'Pan-Seared Salmon', 'Atlantic salmon with asparagus and lemon butter sauce', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop', 34.00, true, 20),
  ('item_3', 'cat_2', 'Wagyu Ribeye Steak', '10oz Wagyu with garlic butter and rosemary fries', 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop', 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop', 58.00, true, 25),
  ('item_4', 'cat_3', 'Chocolate Lava Cake', 'Warm molten chocolate cake with vanilla bean ice cream', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop', 14.00, true, 15);

INSERT INTO sd_orders (id, order_id, customer, table_number, item, total, status, payment, order_time) VALUES
  ('ord_101', 'ORD-101', 'Amelia Chen', 3, '[{"name": "Wagyu Ribeye Steak", "qty": 2, "price": 58.0}, {"name": "Chocolate Lava Cake", "qty": 1, "price": 14.0}]'::jsonb, 130.00, 'preparing', 'unpaid', NOW() - INTERVAL '15 minutes'),
  ('ord_102', 'ORD-102', 'Jonah Patel', 1, '[{"name": "Pan-Seared Salmon", "qty": 1, "price": 34.0}, {"name": "Truffle Arancini", "qty": 1, "price": 16.5}]'::jsonb, 50.50, 'ready', 'unpaid', NOW() - INTERVAL '25 minutes'),
  ('ord_103', 'ORD-103', 'Priya Sharma', 5, '[{"name": "Truffle Arancini", "qty": 2, "price": 16.5}]'::jsonb, 33.00, 'completed', 'paid', NOW() - INTERVAL '45 minutes');

INSERT INTO sd_notifications (id, title, message, type, read) VALUES
  ('notif_1', 'Low Stock Alert', 'Truffle Butter is below threshold (5 units remaining).', 'warning', false),
  ('notif_2', 'Order Ready', 'Table 1 (ORD-102) is ready for pickup.', 'info', false);

INSERT INTO sd_purchase_orders (id, supplier, items, total, date, status) VALUES
  ('po_1', 'Golden Gate Produce Co.', 12, 450.00, 'Today', 'pending'),
  ('po_2', 'Pacific Seafood Distributors', 5, 820.00, 'Yesterday', 'completed');
