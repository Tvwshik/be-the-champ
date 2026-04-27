-- =========================================
-- ROLES (separate table to prevent privilege escalation)
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users update own profile basic fields" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Staff manage profiles" ON public.profiles
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Prevent members from editing their own wallet_balance via UPDATE (only staff/edge functions can)
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
     AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Members cannot modify wallet balance directly';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_wallet_balance_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_balance();

-- Auto-create profile + member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- STATIONS (PCs, consoles, rooms)
-- =========================================
CREATE TYPE public.station_type AS ENUM ('pc_standard','pc_vip','console','room');

CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type station_type NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active stations" ON public.stations FOR SELECT USING (true);
CREATE POLICY "Staff manage stations" ON public.stations
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- BOOKINGS
-- =========================================
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','checked_in','completed','cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_station_time ON public.bookings(station_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);

CREATE POLICY "Users view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own pending bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff manage bookings" ON public.bookings
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- MENU
-- =========================================
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Staff manage categories" ON public.menu_categories
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Staff manage items" ON public.menu_items
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- ORDERS
-- =========================================
CREATE TYPE public.order_status AS ENUM ('received','preparing','delivered','cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.stations(id),
  seat_label TEXT,
  total NUMERIC(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'received',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage orders" ON public.orders
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid())))
  );
CREATE POLICY "Staff manage order items" ON public.order_items
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- WALLET TRANSACTIONS
-- =========================================
CREATE TYPE public.txn_type AS ENUM ('topup_cash','topup_online','booking','order','adjustment','refund');

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  type txn_type NOT NULL,
  description TEXT,
  reference_id UUID,
  balance_after NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own txns" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage txns" ON public.wallet_transactions
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- TOP-UP REQUESTS (cash)
-- =========================================
CREATE TYPE public.topup_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status topup_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own topups" ON public.topup_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users create own topups" ON public.topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Staff manage topups" ON public.topup_requests
  FOR ALL USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- =========================================
-- SEED DATA
-- =========================================
-- Stations
INSERT INTO public.stations (name, type, hourly_rate, capacity, description) VALUES
  ('PC-01','pc_standard',3.00,1,'Standard gaming PC'),('PC-02','pc_standard',3.00,1,'Standard gaming PC'),
  ('PC-03','pc_standard',3.00,1,'Standard gaming PC'),('PC-04','pc_standard',3.00,1,'Standard gaming PC'),
  ('PC-05','pc_standard',3.00,1,'Standard gaming PC'),('PC-06','pc_standard',3.00,1,'Standard gaming PC'),
  ('PC-07','pc_standard',3.00,1,'Standard gaming PC'),('PC-08','pc_standard',3.00,1,'Standard gaming PC'),
  ('PC-09','pc_standard',3.00,1,'Standard gaming PC'),('PC-10','pc_standard',3.00,1,'Standard gaming PC'),
  ('PC-11','pc_standard',3.00,1,'Standard gaming PC'),('PC-12','pc_standard',3.00,1,'Standard gaming PC'),
  ('VIP-01','pc_vip',6.00,1,'High-end RTX rig with premium peripherals'),
  ('VIP-02','pc_vip',6.00,1,'High-end RTX rig with premium peripherals'),
  ('VIP-03','pc_vip',6.00,1,'High-end RTX rig with premium peripherals'),
  ('VIP-04','pc_vip',6.00,1,'High-end RTX rig with premium peripherals'),
  ('PS5-01','console',5.00,2,'PlayStation 5 with two controllers'),
  ('PS5-02','console',5.00,2,'PlayStation 5 with two controllers'),
  ('SWITCH-01','console',4.00,4,'Nintendo Switch on big screen'),
  ('SWITCH-02','console',4.00,4,'Nintendo Switch on big screen'),
  ('ROOM-A','room',20.00,6,'Private room — 6 PCs, sound proofed'),
  ('ROOM-B','room',20.00,6,'Private room — 6 PCs, sound proofed'),
  ('ROOM-VIP','room',35.00,8,'VIP lounge — 8 PCs, leather seats, mini fridge');

-- Menu
INSERT INTO public.menu_categories (name, sort_order) VALUES
  ('Ramen', 1), ('Food', 2), ('Drinks', 3), ('Snacks', 4);

INSERT INTO public.menu_items (category_id, name, description, price)
SELECT id, x.name, x.description, x.price FROM public.menu_categories c
JOIN (VALUES
  ('Ramen','Tonkotsu Ramen','Rich pork bone broth, chashu, soft egg',12.50),
  ('Ramen','Spicy Miso Ramen','Fiery miso broth with ground pork',12.50),
  ('Ramen','Shoyu Ramen','Classic soy-based broth',11.00),
  ('Ramen','Veggie Ramen','Mushroom dashi with seasonal vegetables',11.00),
  ('Food','Chicken Karaage','Crispy Japanese fried chicken',8.00),
  ('Food','Gyoza (6pc)','Pan-fried pork dumplings',6.50),
  ('Food','Beef Curry Rice','Japanese curry over rice',10.00),
  ('Food','Champ Burger','Double patty, cheddar, special sauce',11.50),
  ('Food','Loaded Fries','Fries, cheese, bacon, jalapeños',7.50),
  ('Drinks','Coca-Cola','330ml can',2.50),
  ('Drinks','Iced Lemon Tea','Refreshing house brew',3.00),
  ('Drinks','Energy Drink','Stay sharp',4.50),
  ('Drinks','Iced Matcha Latte','Premium ceremonial matcha',5.00),
  ('Drinks','Bubble Milk Tea','With tapioca pearls',5.50),
  ('Snacks','Pocky','Chocolate biscuit sticks',2.00),
  ('Snacks','Onigiri (2pc)','Salmon & tuna mayo',5.00),
  ('Snacks','Edamame','Steamed soy beans, sea salt',4.00)
) AS x(cat, name, description, price) ON c.name = x.cat;