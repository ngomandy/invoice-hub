-- ============================================================
-- Invoice Reconciliation Hub — Initial Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- PROFILES (mirrors auth.users)
CREATE TABLE public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  full_name  text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read profiles"  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- CLIENTS
CREATE TABLE public.clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  created_by uuid        NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active  boolean     NOT NULL DEFAULT true
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read clients"   ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update clients" ON public.clients FOR UPDATE TO authenticated USING (true);


-- REVENUE CLOSES
CREATE TABLE public.revenue_closes (
  id                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid           NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  close_month            date           NOT NULL,
  version                integer        NOT NULL DEFAULT 1,
  is_current             boolean        NOT NULL DEFAULT true,
  rollover_from_previous numeric(12, 2) NOT NULL DEFAULT 0,
  rollover_to_next       numeric(12, 2) NOT NULL DEFAULT 0,
  discounts              numeric(12, 2) NOT NULL DEFAULT 0,
  net_usage              numeric(12, 2) NOT NULL DEFAULT 0,
  expected_total         numeric(12, 2) GENERATED ALWAYS AS (
    net_usage + rollover_from_previous - rollover_to_next - discounts
  ) STORED,
  submitted_by           uuid           NOT NULL REFERENCES public.profiles(id),
  submitted_at           timestamptz    NOT NULL DEFAULT now(),
  notes                  text,
  CONSTRAINT uq_client_month_version UNIQUE (client_id, close_month, version)
);

ALTER TABLE public.revenue_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read closes"   ON public.revenue_closes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert closes" ON public.revenue_closes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update closes" ON public.revenue_closes FOR UPDATE TO authenticated USING (true);


-- CLOSE CHANGES (audit log)
CREATE TABLE public.close_changes (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_close_id            uuid           NOT NULL REFERENCES public.revenue_closes(id),
  client_id                   uuid           NOT NULL REFERENCES public.clients(id),
  close_month                 date           NOT NULL,
  changed_by                  uuid           NOT NULL REFERENCES public.profiles(id),
  changed_at                  timestamptz    NOT NULL DEFAULT now(),
  prev_rollover_from_previous numeric(12, 2) NOT NULL,
  prev_rollover_to_next       numeric(12, 2) NOT NULL,
  prev_discounts              numeric(12, 2) NOT NULL,
  prev_net_usage              numeric(12, 2) NOT NULL,
  prev_expected_total         numeric(12, 2) NOT NULL,
  new_rollover_from_previous  numeric(12, 2) NOT NULL,
  new_rollover_to_next        numeric(12, 2) NOT NULL,
  new_discounts               numeric(12, 2) NOT NULL,
  new_net_usage               numeric(12, 2) NOT NULL,
  new_expected_total          numeric(12, 2) NOT NULL,
  reason                      text
);

ALTER TABLE public.close_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read changes"   ON public.close_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert changes" ON public.close_changes FOR INSERT TO authenticated WITH CHECK (true);


-- BILLED AMOUNTS
CREATE TABLE public.billed_amounts (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid           NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  close_month  date           NOT NULL,
  billed_total numeric(12, 2) NOT NULL,
  entered_by   uuid           NOT NULL REFERENCES public.profiles(id),
  entered_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_month_billed UNIQUE (client_id, close_month)
);

ALTER TABLE public.billed_amounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read billed"   ON public.billed_amounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert billed" ON public.billed_amounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update billed" ON public.billed_amounts FOR UPDATE TO authenticated USING (true);
