-- Set search_path on protect_wallet_balance & handle_new_user (already SECURITY DEFINER; ensure search_path)
ALTER FUNCTION public.protect_wallet_balance() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Revoke public/authenticated EXECUTE on internal SECURITY DEFINER fns; keep RLS-callable ones for authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_wallet_balance() FROM PUBLIC, anon, authenticated;
-- has_role/is_staff_or_admin are referenced inside RLS policies; restrict direct calls but keep usable in policies
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;