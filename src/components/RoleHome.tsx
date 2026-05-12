import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAppRole } from "@/hooks/useAppRole";
import Clients from "@/pages/Clients";

/**
 * Home dinamica: se l'utente è un cliente collegato lo manda su /scheda,
 * altrimenti mostra la dashboard trainer (lista clienti).
 */
const RoleHome = () => {
  const role = useAppRole();

  if (role === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "client") {
    return <Navigate to="/scheda" replace />;
  }

  return <Clients />;
};

export default RoleHome;
