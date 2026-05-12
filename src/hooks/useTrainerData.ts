import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutInsert = Database["public"]["Tables"]["workouts"]["Insert"];
export type WorkoutItem = Database["public"]["Tables"]["workout_items"]["Row"];
export type WorkoutLog = Database["public"]["Tables"]["workout_logs"]["Row"];
export type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
export type ClientLevel = Database["public"]["Enums"]["client_level"];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti", "Gambe", "Glutei", "Core", "Cardio",
];

// --------- CLIENTS (trainer view) ---------
export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useClient = (id: string | undefined) =>
  useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useSaveClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string } & Omit<ClientInsert, "id">) => {
      const { id, ...rest } = input;
      if (id) {
        const { data, error } = await supabase
          .from("clients").update(rest as ClientUpdate).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("clients").insert(rest as ClientInsert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", data.id] });
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

// --------- CLIENT (cliente loggato vede i propri) ---------
export const useMyClientProfile = () =>
  useQuery({
    queryKey: ["my-client-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("client_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

// --------- EXERCISES ---------
export const useExercises = () =>
  useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

export const useExercise = (id: string | undefined) =>
  useQuery({
    queryKey: ["exercise", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type ExerciseInput = {
  name: string;
  muscle_group: MuscleGroup;
  description?: string | null;
  video_url?: string | null;
  video_path?: string | null;
  image_path?: string | null;
};

export const useCreateExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExerciseInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("exercises").insert({ ...input, trainer_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
};

export const useUpdateExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ExerciseInput>) => {
      const { data, error } = await supabase
        .from("exercises").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["exercise", data.id] });
    },
  });
};

// --------- WORKOUTS (schede) ---------
export const useClientWorkouts = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["workouts", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("client_id", clientId!)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useWorkoutById = (workoutId: string | undefined) =>
  useQuery({
    queryKey: ["workout", workoutId],
    enabled: !!workoutId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts").select("*").eq("id", workoutId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateWorkout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      name: string;
      duration_weeks: number;
      start_date: string;
      notes?: string | null;
      activate?: boolean;
    }) => {
      const { activate = true, ...rest } = input;

      // Se la nuova scheda deve essere attiva, disattiva le altre
      if (activate) {
        const { error: deactErr } = await supabase
          .from("workouts")
          .update({ is_active: false })
          .eq("client_id", input.client_id)
          .eq("is_active", true);
        if (deactErr) throw deactErr;
      }

      const { data, error } = await supabase
        .from("workouts")
        .insert({ ...rest, is_active: activate })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["workouts", d.client_id] }),
  });
};

export const useUpdateWorkout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id, ...patch }: { id: string; client_id: string } & Partial<Workout>) => {
      const { data, error } = await supabase
        .from("workouts").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["workouts", d.client_id] });
      qc.invalidateQueries({ queryKey: ["workout", d.id] });
    },
  });
};

export const useActivateWorkout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      // disattiva tutte le altre
      const { error: e1 } = await supabase
        .from("workouts").update({ is_active: false })
        .eq("client_id", client_id).neq("id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("workouts").update({ is_active: true }).eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["workouts", vars.client_id] }),
  });
};

export const useDeleteWorkout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["workouts", vars.client_id] }),
  });
};

export const useDuplicateWorkout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sourceWorkoutId: string;
      client_id: string;
      name: string;
      duration_weeks: number;
      start_date: string;
      activate?: boolean;
    }) => {
      const { sourceWorkoutId, activate = true, ...rest } = input;

      // Carica items della scheda sorgente
      const { data: srcItems, error: e0 } = await supabase
        .from("workout_items")
        .select("exercise_id, sets, reps, rest, notes, position")
        .eq("workout_id", sourceWorkoutId)
        .order("position", { ascending: true });
      if (e0) throw e0;

      // Disattiva precedenti se richiesto
      if (activate) {
        const { error: deactErr } = await supabase
          .from("workouts").update({ is_active: false })
          .eq("client_id", input.client_id).eq("is_active", true);
        if (deactErr) throw deactErr;
      }

      // Crea nuova scheda
      const { data: newW, error: e1 } = await supabase
        .from("workouts")
        .insert({ ...rest, is_active: activate })
        .select().single();
      if (e1) throw e1;

      // Copia items
      if (srcItems && srcItems.length > 0) {
        const payload = srcItems.map((it) => ({
          ...it,
          workout_id: newW.id,
          client_id: input.client_id,
        }));
        const { error: e2 } = await supabase.from("workout_items").insert(payload);
        if (e2) throw e2;
      }
      return newW;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["workouts", d.client_id] }),
  });
};

// --------- WORKOUT ITEMS (esercizi nella scheda) ---------
export const useWorkoutItems = (workoutId: string | undefined) =>
  useQuery({
    queryKey: ["workout-items", workoutId],
    enabled: !!workoutId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_items")
        .select("*")
        .eq("workout_id", workoutId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const useAddWorkoutItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workout_id: string; client_id: string; exercise_id: string; position: number }) => {
      const { data, error } = await supabase
        .from("workout_items")
        .insert(input)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["workout-items", d.workout_id] }),
  });
};

export const useUpdateWorkoutItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workout_id, ...patch }: { id: string; workout_id: string } & Partial<WorkoutItem>) => {
      const { data, error } = await supabase
        .from("workout_items").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["workout-items", d.workout_id] }),
  });
};

export const useDeleteWorkoutItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workout_id }: { id: string; workout_id: string }) => {
      const { error } = await supabase.from("workout_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["workout-items", vars.workout_id] }),
  });
};

// --------- WORKOUT LOGS (tracking del cliente) ---------
export const useWorkoutLogs = (workoutId: string | undefined) =>
  useQuery({
    queryKey: ["workout-logs", workoutId],
    enabled: !!workoutId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("workout_logs.*, workout_items!inner(workout_id)")
        .eq("workout_items.workout_id", workoutId!);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

export const useUpsertWorkoutLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workout_item_id: string;
      client_id: string;
      workout_id: string;
      completed?: boolean;
      weight?: string | null;
      notes?: string | null;
      log_date?: string;
    }) => {
      const log_date = input.log_date ?? new Date().toISOString().slice(0, 10);
      const { workout_id: _w, ...payload } = input;
      const { data, error } = await supabase
        .from("workout_logs")
        .upsert({ ...payload, log_date }, { onConflict: "workout_item_id,log_date" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["workout-logs", vars.workout_id] }),
  });
};
