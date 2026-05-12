-- 1. Aggiunge collegamento utente e email ai clienti
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Tabella workouts (schede)
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Scheda',
  notes text,
  duration_weeks integer NOT NULL DEFAULT 6 CHECK (duration_weeks > 0 AND duration_weeks <= 104),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- expires_at calcolato automaticamente da start_date + duration_weeks (trigger, non CHECK)
CREATE OR REPLACE FUNCTION public.set_workout_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.expires_at := NEW.start_date + (NEW.duration_weeks * 7);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_workout_expiry
BEFORE INSERT OR UPDATE OF start_date, duration_weeks ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.set_workout_expiry();

CREATE TRIGGER trg_workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Solo una scheda attiva per cliente
CREATE UNIQUE INDEX uniq_active_workout_per_client
  ON public.workouts(client_id) WHERE is_active = true;

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Funzione helper: il cliente collegato ad un client_id
CREATE OR REPLACE FUNCTION public.is_client_of(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _client_id AND client_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _client_id AND trainer_id = auth.uid()
  )
$$;

-- Policies workouts
CREATE POLICY "workouts: trainer manages own clients"
  ON public.workouts FOR ALL
  USING (public.is_trainer_of(client_id))
  WITH CHECK (public.is_trainer_of(client_id));

CREATE POLICY "workouts: client can view own"
  ON public.workouts FOR SELECT
  USING (public.is_client_of(client_id));

-- 3. workout_items ora collegato alla scheda
ALTER TABLE public.workout_items
  ADD COLUMN IF NOT EXISTS workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE;

-- Migra i dati esistenti: per ogni cliente con workout_items crea una scheda attiva
INSERT INTO public.workouts (client_id, name, is_active, start_date, duration_weeks)
SELECT DISTINCT client_id, 'Scheda iniziale', true, CURRENT_DATE, 6
FROM public.workout_items
WHERE workout_id IS NULL;

UPDATE public.workout_items wi
SET workout_id = w.id
FROM public.workouts w
WHERE wi.workout_id IS NULL AND w.client_id = wi.client_id AND w.is_active = true;

ALTER TABLE public.workout_items
  ALTER COLUMN workout_id SET NOT NULL;

-- Aggiorna policies workout_items: basate su workout_id
DROP POLICY IF EXISTS "Workout: trainer can view own clients items" ON public.workout_items;
DROP POLICY IF EXISTS "Workout: trainer can insert for own clients" ON public.workout_items;
DROP POLICY IF EXISTS "Workout: trainer can update own clients items" ON public.workout_items;
DROP POLICY IF EXISTS "Workout: trainer can delete own clients items" ON public.workout_items;

CREATE POLICY "workout_items: trainer manages"
  ON public.workout_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_items.workout_id AND public.is_trainer_of(w.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_items.workout_id AND public.is_trainer_of(w.client_id)
  ));

CREATE POLICY "workout_items: client can view"
  ON public.workout_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_items.workout_id AND public.is_client_of(w.client_id)
  ));

-- 4. workout_logs (tracking esecuzione)
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_item_id uuid NOT NULL REFERENCES public.workout_items(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  weight text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_item_id, log_date)
);

CREATE TRIGGER trg_workout_logs_updated_at
BEFORE UPDATE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs: client manages own"
  ON public.workout_logs FOR ALL
  USING (public.is_client_of(client_id))
  WITH CHECK (public.is_client_of(client_id));

CREATE POLICY "logs: trainer can view"
  ON public.workout_logs FOR SELECT
  USING (public.is_trainer_of(client_id));

-- 5. Profili: il cliente che si registra deve poter creare il proprio profilo (già esistente).
-- Aggiungiamo policy per consentire al trainer di vedere i profili dei propri clienti collegati
CREATE POLICY "profiles: trainer can view linked clients"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_user_id = profiles.id AND c.trainer_id = auth.uid()
  ));

-- Indici utili
CREATE INDEX IF NOT EXISTS idx_workouts_client ON public.workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_items_workout ON public.workout_items(workout_id);
CREATE INDEX IF NOT EXISTS idx_logs_client ON public.workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(client_user_id);