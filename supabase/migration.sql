-- ============================================================
-- MARKUS PRO — Supabase Database Schema
-- Run this in Supabase SQL Editor (dashboard.supabase.com)
-- ============================================================

-- ── Products ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id             BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name           TEXT    NOT NULL,
  category       TEXT    NOT NULL CHECK (category IN ('tshirts','pants','sneakers','socks')),
  price          NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  tag            TEXT    CHECK (tag IN ('new','hot','sale') OR tag IS NULL),
  active         BOOLEAN NOT NULL DEFAULT true,
  featured       BOOLEAN NOT NULL DEFAULT false,
  image          TEXT,
  sku            TEXT,
  sizes          JSONB   NOT NULL DEFAULT '[]',
  stock          INTEGER NOT NULL DEFAULT 0,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Profiles (linked to Supabase auth.users) ──────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  provider   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Orders ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,               -- e.g. MP-12345
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name  TEXT,
  customer_email TEXT,
  items          JSONB NOT NULL DEFAULT '[]',
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Settings ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default ticker text
INSERT INTO settings (key, value) VALUES
  ('ticker', '"FREE SHIPPING ON ORDERS OVER €100 • NEW DROP EVERY FRIDAY • USE CODE MARKUS10 FOR 10% OFF • PREMIUM STREETWEAR •"')
ON CONFLICT (key) DO NOTHING;

-- ── Admin log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_log (
  id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  action     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────

ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read active products
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (active = true);

-- Products: service role (admin) can do anything — handled via service key, no policy needed

-- Profiles: users can read and update only their own profile
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Orders: users can read their own orders
CREATE POLICY "orders_own_read" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Orders: authenticated users can insert their own orders
CREATE POLICY "orders_own_insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Settings: anyone can read
CREATE POLICY "settings_public_read" ON settings
  FOR SELECT USING (true);

-- ── Seed default products ─────────────────────────────────

INSERT INTO products (name, category, price, original_price, tag, active, featured, image, sku, sizes, stock, description) VALUES
  ('Markus Core Tee',      'tshirts',  49, NULL,  'new',  true, true,  'https://picsum.photos/seed/101/600/750', 'MP-TS-001', '["XS","S","M","L","XL","2XL"]', 50, 'Essential heavyweight tee in 280gsm cotton.'),
  ('Void Oversized Tee',   'tshirts',  59, NULL,  'hot',  true, false, 'https://picsum.photos/seed/102/600/750', 'MP-TS-002', '["XS","S","M","L","XL","2XL"]', 35, 'Dropped shoulders, boxy cut.'),
  ('Archive Graphic Tee',  'tshirts',  45, 65,    'sale', true, false, 'https://picsum.photos/seed/103/600/750', 'MP-TS-003', '["XS","S","M","L","XL","2XL"]', 20, 'Limited archive print series.'),
  ('Signal Cargo Pants',   'pants',   129, NULL,  'new',  true, true,  'https://picsum.photos/seed/201/600/750', 'MP-PT-001', '["XS","S","M","L","XL","2XL"]', 25, 'Technical ripstop with 8 pockets.'),
  ('Stealth Track Pants',  'pants',    89, 119,   'sale', true, false, 'https://picsum.photos/seed/202/600/750', 'MP-PT-002', '["XS","S","M","L","XL","2XL"]', 15, 'Slim taper with zip ankles.'),
  ('Markus Runner Pro',    'sneakers',179, NULL,  'hot',  true, true,  'https://picsum.photos/seed/301/600/750', 'MP-SN-001', '["38","39","40","41","42","43","44","45","46"]', 30, 'Chunky sole, reflective details.'),
  ('Urban Low Sneaker',    'sneakers',149, 199,   'sale', true, false, 'https://picsum.photos/seed/302/600/750', 'MP-SN-002', '["38","39","40","41","42","43","44","45","46"]', 18, 'Clean canvas silhouette.'),
  ('Crew Socks 3-Pack',    'socks',    29, NULL,  'new',  true, false, 'https://picsum.photos/seed/401/600/750', 'MP-SK-001', '["S (36-39)","M (40-43)","L (44-46)"]', 100, 'Terry loop, logo cuff.')
ON CONFLICT DO NOTHING;
