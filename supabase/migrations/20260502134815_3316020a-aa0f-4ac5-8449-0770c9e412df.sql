CREATE POLICY "Clients: client can view own"
  ON public.clients
  FOR SELECT
  USING (client_user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_client_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of(uuid) FROM PUBLIC, anon, authenticated;