CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.imported_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  wallet_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT,
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage imported members"
ON public.imported_members FOR ALL
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_imported_members_updated_at
BEFORE UPDATE ON public.imported_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_imported_members_phone ON public.imported_members(phone);
CREATE INDEX idx_imported_members_claimed ON public.imported_members(claimed_by_user_id);