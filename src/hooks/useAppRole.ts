import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Determina se l'utente loggato è un trainer o un cliente collegato.
 * - "trainer": ha clienti propri OR non è collegato come cliente
 * - "client": ha un record clients con client_user_id = sua id
 */
export type AppRole = "admin" | "trainer" | "client" | "loading";

export const useAppRole = (): AppRole => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const [role, setRole] = useState<AppRole>("loading");

  useEffect(() => {
    if (loading || loadingAdmin) return;
    if (!user) { setRole("loading"); return; }
    if (isAdmin) { setRole("admin"); return; }

    let cancelled = false;
    (async () => {
      // È cliente collegato?
      const { data: asClient } = await supabase
        .from("clients").select("id").eq("client_user_id", user.id).maybeSingle();

      if (cancelled) return;

      if (asClient) {
        // È collegato come cliente; ma se ha anche clienti propri (è trainer), preferisci trainer
        const { data: ownClients } = await supabase
          .from("clients").select("id").eq("trainer_id", user.id).limit(1);
        if (cancelled) return;
        setRole(ownClients && ownClients.length > 0 ? "trainer" : "client");
      } else {
        setRole("trainer");
      }
    })();

    return () => { cancelled = true; };
  }, [user, loading, isAdmin, loadingAdmin]);

  return role;
};
