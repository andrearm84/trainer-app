import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSaveClient, type Client, type ClientLevel } from "@/hooks/useTrainerData";

const schema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(100),
  goal: z.string().trim().max(200),
  level: z.enum(["Principiante", "Intermedio", "Avanzato"]),
  started_at: z.string().min(1, "Data richiesta"),
  notes: z.string().trim().max(1000).nullable(),
  email: z.string().trim().email("Email non valida").max(255).nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client?: Client | null;
}

const ClientFormDialog = ({ open, onOpenChange, client }: Props) => {
  const isEdit = !!client;
  const save = useSaveClient();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<ClientLevel>("Principiante");
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (client) {
      setName(client.name);
      setGoal(client.goal ?? "");
      setLevel(client.level);
      setStartedAt(client.started_at);
      setNotes(client.notes ?? "");
      setEmail(client.email ?? "");
    } else {
      setName(""); setGoal(""); setLevel("Principiante");
      setStartedAt(new Date().toISOString().slice(0, 10));
      setNotes(""); setEmail("");
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      goal,
      level,
      started_at: startedAt,
      notes: notes.trim() ? notes : null,
      email: email.trim() ? email : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      await save.mutateAsync({
        ...(isEdit ? { id: client!.id } : {}),
        name: parsed.data.name,
        goal: parsed.data.goal,
        level: parsed.data.level,
        started_at: parsed.data.started_at,
        notes: parsed.data.notes,
        email: parsed.data.email,
        trainer_id: user.id,
      });
      toast.success(isEdit ? "Cliente aggiornato" : "Cliente creato");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">
            {isEdit ? "Modifica cliente" : "Nuovo cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Nome
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Obiettivo
            </label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Es. Ipertrofia, dimagrimento, forza..."
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                Livello
              </label>
              <Select value={level} onValueChange={(v) => setLevel(v as ClientLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Principiante">Principiante</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzato">Avanzato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                Iniziato
              </label>
              <Input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Email cliente (per accesso alla sua scheda)
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@example.com"
              maxLength={255}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Il cliente dovrà registrarsi su /auth con questa stessa email per vedere la propria scheda.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Note
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Infortuni, preferenze, vincoli..."
              maxLength={1000}
              rows={3}
            />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {isEdit ? "Salva modifiche" : "Crea cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;
