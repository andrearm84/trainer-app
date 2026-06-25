-- Permette di ripetere lo stesso esercizio per più round prima di passare al
-- successivo (es. "Burpees x3" = lavoro/recupero ripetuti 3 volte), non solo una volta.

ALTER TABLE public.tabata_routine_items
  ADD COLUMN rounds integer NOT NULL DEFAULT 1 CHECK (rounds > 0);

ALTER TABLE public.tabata_favorite_exercises
  ADD COLUMN rounds integer NOT NULL DEFAULT 1 CHECK (rounds > 0);

CREATE OR REPLACE FUNCTION public.get_public_tabata_routine(p_routine_id uuid)
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
    'id', r.id,
    'routine_name', r.name,
    'items', COALESCE((
      SELECT json_agg(json_build_object(
        'position', i.position,
        'name', i.name,
        'work_seconds', i.work_seconds,
        'rest_seconds', i.rest_seconds,
        'rounds', i.rounds
      ) ORDER BY i.position)
      FROM public.tabata_routine_items i
      WHERE i.routine_id = r.id
    ), '[]'::json)
  )
  INTO result
  FROM public.tabata_routines r
  WHERE r.id = p_routine_id;

  RETURN result;
END;
$$;
