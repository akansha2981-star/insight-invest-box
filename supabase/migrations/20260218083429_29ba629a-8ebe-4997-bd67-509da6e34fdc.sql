
-- Auto-grant admin role to the very first user who signs up
-- (only fires when no admins exist yet)
CREATE OR REPLACE FUNCTION public.auto_grant_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only promote if there are currently zero admins
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (fires after each new user insert)
DROP TRIGGER IF EXISTS trg_auto_grant_first_admin ON auth.users;
CREATE TRIGGER trg_auto_grant_first_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_first_admin();
