-- ============================================================
-- Invoice System Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Extend clients table with contact + billing fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms   INTEGER DEFAULT 30;

-- 2. Company settings (single-row table)
CREATE TABLE IF NOT EXISTS company_settings (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT        NOT NULL DEFAULT '',
  email                  TEXT        DEFAULT '',
  phone                  TEXT        DEFAULT '',
  address_line1          TEXT        DEFAULT '',
  address_line2          TEXT        DEFAULT '',
  city                   TEXT        DEFAULT '',
  state                  TEXT        DEFAULT '',
  zip                    TEXT        DEFAULT '',
  country                TEXT        DEFAULT 'US',
  tax_id                 TEXT        DEFAULT '',
  currency               TEXT        DEFAULT 'USD',
  default_payment_terms  INTEGER     DEFAULT 30,
  invoice_prefix         TEXT        DEFAULT 'INV',
  next_invoice_number    INTEGER     DEFAULT 1,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_settings' AND policyname = 'Authenticated users read settings'
  ) THEN
    CREATE POLICY "Authenticated users read settings"
      ON company_settings FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_settings' AND policyname = 'Authenticated users insert settings'
  ) THEN
    CREATE POLICY "Authenticated users insert settings"
      ON company_settings FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_settings' AND policyname = 'Authenticated users update settings'
  ) THEN
    CREATE POLICY "Authenticated users update settings"
      ON company_settings FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- 3. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   TEXT        NOT NULL UNIQUE,
  invoice_seq      INTEGER     NOT NULL DEFAULT 1,
  client_id        UUID        NOT NULL REFERENCES clients(id),
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','sent','viewed','paid','void')),
  issue_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE        NOT NULL,
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  terms            TEXT,
  created_by       UUID        REFERENCES auth.users(id),
  sent_at          TIMESTAMPTZ,
  viewed_at        TIMESTAMPTZ,
  void_reason      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'Authenticated users read invoices'
  ) THEN
    CREATE POLICY "Authenticated users read invoices"
      ON invoices FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'Authenticated users insert invoices'
  ) THEN
    CREATE POLICY "Authenticated users insert invoices"
      ON invoices FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'Authenticated users update invoices'
  ) THEN
    CREATE POLICY "Authenticated users update invoices"
      ON invoices FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices' AND policyname = 'Authenticated users delete invoices'
  ) THEN
    CREATE POLICY "Authenticated users delete invoices"
      ON invoices FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 4. Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT          NOT NULL,
  quantity      NUMERIC(10,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate      NUMERIC(6,4)  NOT NULL DEFAULT 0,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoice_line_items' AND policyname = 'Authenticated users manage line items'
  ) THEN
    CREATE POLICY "Authenticated users manage line items"
      ON invoice_line_items FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  method         TEXT          NOT NULL DEFAULT 'bank_transfer'
                               CHECK (method IN ('bank_transfer','check','cash','stripe','paypal','other')),
  reference      TEXT,
  notes          TEXT,
  recorded_by    UUID          REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Authenticated users manage payments'
  ) THEN
    CREATE POLICY "Authenticated users manage payments"
      ON payments FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_client_id     ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status        ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date      ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_seq   ON invoices(invoice_seq DESC);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id  ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id    ON payments(invoice_id);
