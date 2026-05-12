CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- crea profilo
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  -- collega l'utente al record cliente corrispondente per email (se esiste e non è già collegato)
  UPDATE public.clients
  SET client_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND client_user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Assicura che il trigger esista (alcune installazioni non lo creano sull'auth schema dal client)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();