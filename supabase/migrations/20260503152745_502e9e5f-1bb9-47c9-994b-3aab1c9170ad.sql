GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of(uuid) TO authenticated;