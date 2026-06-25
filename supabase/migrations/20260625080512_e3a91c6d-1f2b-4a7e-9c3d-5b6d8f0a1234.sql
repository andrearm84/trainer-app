-- Il link pubblico per le TV passa dalla sessione (rigenerato ad ogni avvio) alla
-- lezione/routine stessa: così l'URL resta fisso e può essere salvato come preferito.

DROP FUNCTION IF EXISTS public.get_public_tabata_session(uuid);

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
        'rest_seconds', i.rest_seconds
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

GRANT EXECUTE ON FUNCTION public.get_public_tabata_routine(uuid) TO anon, authenticated;
