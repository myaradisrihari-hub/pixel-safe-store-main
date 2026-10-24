-- Enums
CREATE TYPE public.app_role AS ENUM ('buyer','seller','admin');
CREATE TYPE public.product_status AS ENUM ('pending','published','rejected');
CREATE TYPE public.order_status AS ENUM ('pending','paid','failed','refunded');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  expertise TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can add own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + buyer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer') ON CONFLICT DO NOTHING;
  IF COALESCE(NEW.raw_user_meta_data->>'intended_role', '') = 'seller' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

INSERT INTO public.categories (slug, name, description, icon, sort_order) VALUES
 ('ai-machine-learning','AI & Machine Learning','Training datasets, model research and ML benchmarks','Brain',1),
 ('technology','Technology','Technical research, architecture and engineering insight','Cpu',2),
 ('business','Business','Strategy, operations and business model research','Briefcase',3),
 ('finance','Finance','Financial models, equity and macro research','LineChart',4),
 ('healthcare','Healthcare','Clinical, pharma and health systems research','HeartPulse',5),
 ('agriculture','Agriculture','Crop, agri-tech and supply chain studies','Sprout',6),
 ('education','Education','Curricula, study material and learning research','GraduationCap',7),
 ('marketing','Marketing','Consumer behaviour, campaigns and growth data','Megaphone',8),
 ('research','Research','Academic papers and supporting material','FlaskConical',9),
 ('market-intelligence','Market Intelligence','Market sizing, competitor and industry reports','Radar',10),
 ('datasets','Datasets','Raw and cleaned datasets across domains','Database',11),
 ('technical-resources','Technical Resources','Documentation, templates and toolkits','FileCode',12);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  file_path TEXT,
  file_name TEXT,
  file_format TEXT,
  file_size BIGINT,
  preview_path TEXT,
  preview_name TEXT,
  item_count INT,
  license TEXT NOT NULL DEFAULT 'Personal / Academic Use',
  status public.product_status NOT NULL DEFAULT 'pending',
  purchases_count INT NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_status_idx ON public.products (status);
CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX products_seller_idx ON public.products (seller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published products are viewable by everyone" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "Sellers can view own products" ON public.products FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create own products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(),'seller'));
CREATE POLICY "Sellers can update own products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Phase 1: no admin review queue yet, so submitted products go live immediately.
-- Phase 2 removes this trigger and adds real moderation.
CREATE OR REPLACE FUNCTION public.auto_publish_product()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN NEW.status := 'published'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_auto_publish BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.auto_publish_product();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Cart
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_provider TEXT NOT NULL DEFAULT 'test',
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_buyer_idx ON public.order_items (buyer_id);
CREATE INDEX order_items_seller_idx ON public.order_items (seller_id);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own purchases" ON public.order_items FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers view their sales" ON public.order_items FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Buyers create own purchase rows" ON public.order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE OR REPLACE FUNCTION public.has_purchased(_user_id UUID, _product_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.buyer_id = _user_id AND oi.product_id = _product_id AND o.status = 'paid'
  )
$$;