-- TABATA: esercizi preferiti, sequenze (routine) e lezioni live in streaming sulle TV

-- Esercizi preferiti (per comporre velocemente una sequenza)
CREATE TABLE public.tabata_favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  work_seconds integer NOT NULL DEFAULT 20 CHECK (work_seconds > 0),
  rest_seconds integer NOT NULL DEFAULT 10 CHECK (rest_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, name)
);

ALTER TABLE public.tabata_favorite_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tabata_favorite_exercises: trainer manages own"
  ON public.tabata_favorite_exercises FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Sequenze di lezione (template), eventualmente segnate come preferite
CREATE TABLE public.tabata_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Lezione Tabata',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tabata_routines ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tabata_routines_updated_at
BEFORE UPDATE ON public.tabata_routines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "tabata_routines: trainer manages own"
  ON public.tabata_routines FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Esercizi ordinati dentro una sequenza, con tempo lavoro/recupero propri
CREATE TABLE public.tabata_routine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.tabata_routines(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  work_seconds integer NOT NULL DEFAULT 20 CHECK (work_seconds > 0),
  rest_seconds integer NOT NULL DEFAULT 10 CHECK (rest_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tabata_routine_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tabata_routine_items: trainer manages via routine"
  ON public.tabata_routine_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tabata_routines r
    WHERE r.id = tabata_routine_items.routine_id AND r.trainer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tabata_routines r
    WHERE r.id = tabata_routine_items.routine_id AND r.trainer_id = auth.uid()
  ));

CREATE INDEX idx_tabata_routine_items_routine ON public.tabata_routine_items(routine_id);

-- Lezioni live: l'id stesso funge da link pubblico per le TV (nessun login richiesto)
CREATE TABLE public.tabata_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.tabata_routines(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'finished')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.tabata_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tabata_sessions: trainer manages own"
  ON public.tabata_sessions FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE INDEX idx_tabata_sessions_routine ON public.tabata_sessions(routine_id);

-- Accesso pubblico in sola lettura per le TV: nessuna policy RLS diretta sulla tabella
-- (evita l'enumerazione delle lezioni). L'accesso passa da questa funzione SECURITY DEFINER,
-- che richiede di conoscere l'id esatto della sessione (il "link" condiviso con la TV).
CREATE OR REPLACE FUNCTION public.get_public_tabata_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', s.id,
    'status', s.status,
    'routine_name', r.name,
    'items', COALESCE((
      SELECT json_agg(json_build_object(
        'position', i.position,
        'name', i.name,
        'work_seconds', i.work_seconds,
        'rest_seconds', i.rest_seconds
      ) ORDER BY i.position)
      FROM public.tabata_routine_items i
      WHERE i.routine_id = r.id
    ), '[]'::json)
  )
  INTO result
  FROM public.tabata_sessions s
  JOIN public.tabata_routines r ON r.id = s.routine_id
  WHERE s.id = p_session_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tabata_session(uuid) TO anon, authenticated;
