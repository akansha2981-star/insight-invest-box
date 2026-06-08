
-- 1. Storage: banners — admin/editor only for write
DROP POLICY IF EXISTS "Authenticated upload on banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update on banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete on banners" ON storage.objects;

CREATE POLICY "Admins can upload banners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins can update banners" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins can delete banners" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- 2. Storage: real-estate — admin/editor only for write
DROP POLICY IF EXISTS "Auth upload on real-estate" ON storage.objects;
DROP POLICY IF EXISTS "Auth update on real-estate" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete on real-estate" ON storage.objects;

CREATE POLICY "Admins can upload real-estate" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'real-estate' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins can update real-estate" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'real-estate' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

CREATE POLICY "Admins can delete real-estate" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'real-estate' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- 3. Newsletter: tighten public insert with validation
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with valid email"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 255
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- 4. auth_events: allow users to read their own login history
CREATE POLICY "Users can read their own auth events"
  ON public.auth_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Revoke EXECUTE on SECURITY DEFINER helpers from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.auto_grant_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
-- has_role must remain callable by authenticated users so RLS policies referencing it can evaluate
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
