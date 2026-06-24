import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dumbbell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const passwordSchema = z.string().min(8, "Minimo 8 caratteri").max(72);

// Raggiunta solo tramite il link di recupero email: Supabase rileva il
// token nell'URL e crea una sessione temporanea, usata qui per impostare
// la nuova password con updateUser.
const ResetPassword = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h2 className="font-display text-2xl uppercase mb-2">Link non valido</h2>
          <p className="text-muted-foreground mb-6">
            Il link di recupero password non è valido o è scaduto. Richiedine uno nuovo dalla pagina di login.
          </p>
          <Button variant="hero" onClick={() => navigate("/auth")}>Torna al login</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const pwdParsed = passwordSchema.safeParse(password);
      if (!pwdParsed.success) throw new Error(pwdParsed.error.issues[0].message);
      if (password !== confirm) throw new Error("Le password non coincidono");
      const { error } = await supabase.auth.updateUser({ password: pwdParsed.data });
      if (error) throw error;
      toast.success("Password aggiornata!");
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Dumbbell className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl tracking-wider">FORGE</h1>
        </div>

        <h2 className="font-display text-3xl uppercase mb-2 text-center">Nuova password</h2>
        <p className="text-muted-foreground mb-8 text-center">
          Imposta la nuova password per il tuo account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Nuova password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={72}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Conferma password
            </label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              maxLength={72}
              required
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Salva nuova password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
