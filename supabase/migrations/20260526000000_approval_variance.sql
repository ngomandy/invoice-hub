-- Add variance reason to billed_amounts
ALTER TABLE public.billed_amounts
  ADD COLUMN IF NOT EXISTS variance_reason TEXT;

-- Add approval workflow columns to revenue_closes
ALTER TABLE public.revenue_closes
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'submitted';

ALTER TABLE public.revenue_closes
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

ALTER TABLE public.revenue_closes
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.revenue_closes
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
