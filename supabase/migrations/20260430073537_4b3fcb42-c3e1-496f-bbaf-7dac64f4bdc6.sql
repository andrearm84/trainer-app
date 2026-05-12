-- Ruoli
CREATE TYPE public.app_role AS ENUM ('admin', 'trainer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies su user_roles: ognuno vede i propri ruoli; solo admin gestisce
CREATE POLICY "user_roles: self can view"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles: admin can view all"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles: admin can insert"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles: admin can delete"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggiorna policy exercises: admin può modificare anche i preset
DROP POLICY IF EXISTS "Exercises: trainer can update own" ON public.exercises;
DROP POLICY IF EXISTS "Exercises: trainer can delete own" ON public.exercises;

CREATE POLICY "Exercises: update own or admin presets"
  ON public.exercises FOR UPDATE
  USING (
    auth.uid() = trainer_id
    OR (trainer_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Exercises: delete own or admin presets"
  ON public.exercises FOR DELETE
  USING (
    auth.uid() = trainer_id
    OR (trainer_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- Admin può anche inserire nuovi preset (trainer_id NULL)
CREATE POLICY "Exercises: admin can insert presets"
  ON public.exercises FOR INSERT
  WITH CHECK (
    (trainer_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- Storage: consenti agli admin di gestire i media dei preset (qualunque cartella)
CREATE POLICY "exercise-images: admin manage all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercise-videos: admin manage all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'exercise-videos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'exercise-videos' AND public.has_role(auth.uid(), 'admin'));