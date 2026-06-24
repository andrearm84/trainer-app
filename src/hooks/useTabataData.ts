import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TabataFavoriteExercise = Database["public"]["Tables"]["tabata_favorite_exercises"]["Row"];
export type TabataRoutine = Database["public"]["Tables"]["tabata_routines"]["Row"];
export type TabataRoutineItem = Database["public"]["Tables"]["tabata_routine_items"]["Row"];
export type TabataSession = Database["public"]["Tables"]["tabata_sessions"]["Row"];

export const tabataChannelName = (sessionId: string) => `tabata-session-${sessionId}`;

// Stato live trasmesso via Realtime broadcast dal pannello di controllo alle TV.
// phase_ends_at è un timestamp assoluto (epoch ms): ogni TV calcola il countdown
// in locale, così resta corretto anche con latenza di rete o messaggi persi.
export type TabataLiveState = {
  item_index: number;
  phase: "work" | "rest" | "done";
  paused: boolean;
  phase_ends_at: number | null;
  remaining_ms: number | null;
};

// --------- FAVORITE EXERCISES (quick-add) ---------
export const useFavoriteExercises = () =>
  useQuery({
    queryKey: ["tabata-favorite-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabata_favorite_exercises")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

export const useSaveFavoriteExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; work_seconds: number; rest_seconds: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("tabata_favorite_exercises")
        .upsert({ ...input, trainer_id: user.id }, { onConflict: "trainer_id,name" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-favorite-exercises"] }),
  });
};

export const useDeleteFavoriteExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tabata_favorite_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-favorite-exercises"] }),
  });
};

// --------- ROUTINES (sequenze di lezione) ---------
export const useRoutines = () =>
  useQuery({
    queryKey: ["tabata-routines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabata_routines")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useRoutine = (id: string | undefined) =>
  useQuery({
    queryKey: ["tabata-routine", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabata_routines").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateRoutine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("tabata_routines")
        .insert({ name, trainer_id: user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-routines"] }),
  });
};

export const useUpdateRoutine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; is_favorite?: boolean }) => {
      const { data, error } = await supabase
        .from("tabata_routines").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-routines"] }),
  });
};

export const useDeleteRoutine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tabata_routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-routines"] }),
  });
};

// --------- ROUTINE ITEMS (esercizi ordinati nella sequenza) ---------
export const useRoutineItems = (routineId: string | undefined) =>
  useQuery({
    queryKey: ["tabata-routine-items", routineId],
    enabled: !!routineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabata_routine_items")
        .select("*")
        .eq("routine_id", routineId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const useAddRoutineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { routine_id: string; name: string; work_seconds: number; rest_seconds: number; position: number }) => {
      const { data, error } = await supabase
        .from("tabata_routine_items").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["tabata-routine-items", d.routine_id] }),
  });
};

export const useUpdateRoutineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, routine_id, ...patch }: { id: string; routine_id: string } & Partial<TabataRoutineItem>) => {
      const { data, error } = await supabase
        .from("tabata_routine_items").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["tabata-routine-items", d.routine_id] }),
  });
};

export const useDeleteRoutineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, routine_id }: { id: string; routine_id: string }) => {
      const { error } = await supabase.from("tabata_routine_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["tabata-routine-items", vars.routine_id] }),
  });
};

// Scambia la posizione di due item (per i tasti su/giù)
export const useSwapRoutineItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ routine_id, a, b }: { routine_id: string; a: TabataRoutineItem; b: TabataRoutineItem }) => {
      const { error: e1 } = await supabase
        .from("tabata_routine_items").update({ position: b.position }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("tabata_routine_items").update({ position: a.position }).eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["tabata-routine-items", vars.routine_id] }),
  });
};

// --------- SESSIONS (lezione live, l'id è il link pubblico per le TV) ---------
export const useSession = (id: string | undefined) =>
  useQuery({
    queryKey: ["tabata-session", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabata_sessions").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routine_id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("tabata_sessions")
        .insert({ routine_id, trainer_id: user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabata-sessions"] }),
  });
};

export const useEndSession = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tabata_sessions")
        .update({ status: "finished", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
  });
};

// --------- PUBLIC (TV, nessun login) ---------
export type PublicTabataSession = {
  id: string;
  status: string;
  routine_name: string;
  items: { position: number; name: string; work_seconds: number; rest_seconds: number }[];
};

export const fetchPublicTabataSession = async (sessionId: string): Promise<PublicTabataSession | null> => {
  const { data, error } = await supabase.rpc("get_public_tabata_session", { p_session_id: sessionId });
  if (error) throw error;
  return data as unknown as PublicTabataSession | null;
};
