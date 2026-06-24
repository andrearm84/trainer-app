import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dumbbell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-gym.jpg";

const emailSchema = z.string().trim().email("Email non valida").max(255);
const passwordSchema = z.string().min(8, "Minimo 8 caratteri").max(72);
const nameSchema = z.string().trim().min(1, "Nome richiesto").max(100);

const Auth = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const emailParsed = emailSchema.safeParse(email);
      const pwdParsed = passwordSchema.safeParse(password);
      if (!emailParsed.success) throw new Error(emailParsed.error.issues[0].message);
      if (!pwdParsed.success) throw new Error(pwdParsed.error.issues[0].message);

      if (mode === "signup") {
        const nameParsed = nameSchema.safeParse(fullName);
        if (!nameParsed.success) throw new Error(nameParsed.error.issues[0].message);

        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: pwdParsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: nameParsed.data },
          },
        });
        if (error) throw error;
        toast.success("Account creato! Benvenuto.");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: pwdParsed.data,
        });
        if (error) throw error;
        toast.success("Bentornato!");
        navigate("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg.includes("Invalid login") ? "Credenziali non valide" : msg);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const emailParsed = emailSchema.safeParse(email);
      if (!emailParsed.success) throw new Error(emailParsed.error.issues[0].message);
      const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Errore Google sign-in");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden lg:block">
        <img
          src={heroImg}
          alt="Palestra dark"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/90" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Dumbbell className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl tracking-wider">FORGE</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Trainer Suite</p>
            </div>
          </div>
          <div>
            <h2 className="font-display text-5xl uppercase leading-[0.95] mb-4">
              Forgia <span className="text-gradient-primary">campioni</span>.
            </h2>
            <p className="text-muted-foreground max-w-md">
              Crea, organizza e condividi le schede dei tuoi atleti. Tutto in un posto.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Dumbbell className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-2xl tracking-wider">FORGE</h1>
          </div>

          <h2 className="font-display text-3xl uppercase mb-2">
            {mode === "signin" ? "Bentornato" : mode === "signup" ? "Crea account" : "Recupera password"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Accedi al tuo workspace da personal trainer."
              : mode === "signup"
                ? "Inizia subito a gestire i tuoi clienti."
                : "Ti mandiamo un link per impostare una nuova password."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full mb-6"
                onClick={handleGoogle}
                disabled={busy}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                </svg>
                Continua con Google
              </Button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">oppure</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {mode === "forgot" ? (
            resetSent ? (
              <p className="text-sm text-muted-foreground">
                Controlla la tua casella email: ti abbiamo mandato un link per impostare una nuova password.
              </p>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trainer@example.com"
                    maxLength={255}
                    required
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  Invia link di recupero
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                    Nome completo
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Mario Rossi"
                    maxLength={100}
                    required
                  />
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trainer@example.com"
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setResetSent(false); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Password dimenticata?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  maxLength={72}
                  required
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {mode === "signin" ? "Accedi" : "Crea account"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => { setMode("signin"); setResetSent(false); }}
                className="text-primary font-semibold hover:underline"
              >
                Torna al login
              </button>
            ) : (
              <>
                {mode === "signin" ? "Non hai un account?" : "Hai già un account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === "signin" ? "Registrati" : "Accedi"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
