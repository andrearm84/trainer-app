import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, KeyRound, Shield, User } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};
type RoleRow = { user_id: string; role: string };
type ClientRow = { client_user_id: string | null; name: string };

const AdminUsers = () => {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });
    setLoading(false);
    if (error) { toast.error("Errore caricamento"); return; }
    setUsers(data.users ?? []);
    setRoles(data.roles ?? []);
    setClients(data.clients ?? []);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (isLoading) return <div className="p-8">Caricamento…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const userRoles = (id: string) => roles.filter(r => r.user_id === id).map(r => r.role);
  const userClient = (id: string) => clients.find(c => c.client_user_id === id);

  const filtered = users.filter(u =>
    !filter || u.email?.toLowerCase().includes(filter.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", user_id: id },
    });
    if (error) { toast.error("Errore eliminazione"); return; }
    toast.success("Utente eliminato");
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-wider mb-2">GESTIONE UTENTI</h1>
        <p className="text-muted-foreground text-sm">Visualizza, elimina e reimposta le password degli utenti registrati.</p>
      </div>

      <div className="mb-6 flex gap-3 items-center">
        <Input
          placeholder="Cerca per email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Aggiorna
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((u) => {
          const r = userRoles(u.id);
          const c = userClient(u.id);
          const isAdminUser = r.includes("admin");
          return (
            <Card key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{u.email}</span>
                  {isAdminUser && <Badge className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                  {c && <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" /> {c.name}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Registrato: {new Date(u.created_at).toLocaleDateString("it-IT")} ·
                  Ultimo accesso: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("it-IT") : "mai"}
                </div>
              </div>
              <div className="flex gap-2">
                <ResetPasswordDialog userId={u.id} email={u.email ?? ""} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isAdminUser}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare {u.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        L'azione è irreversibile. Verranno eliminati account e dati collegati.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(u.id)}>Elimina</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Nessun utente trovato.</p>
        )}
      </div>
    </div>
  );
};

const ResetPasswordDialog = ({ userId, email }: { userId: string; email: string }) => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 6) { toast.error("Minimo 6 caratteri"); return; }
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "reset_password", user_id: userId, new_password: password },
    });
    setBusy(false);
    if (error) { toast.error("Errore"); return; }
    toast.success("Password aggiornata");
    setPassword("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><KeyRound className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reimposta password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Per: {email}</p>
          <div>
            <Label>Nuova password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caratteri"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsers;
