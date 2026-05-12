import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tutti i log storici di un cliente (per stats e grafici)
export const useClientAllLogs = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["all-logs", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("client_id", clientId!)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

// Storico log per un singolo workout_item (per grafico esercizio)
export const useExerciseHistory = (workoutItemId: string | undefined) =>
  useQuery({
    queryKey: ["exercise-history", workoutItemId],
    enabled: !!workoutItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("log_date, weight, completed, notes")
        .eq("workout_item_id", workoutItemId!)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
