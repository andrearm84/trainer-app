import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Target, Calendar, FileText, Search, Loader2, Pencil, PlayCircle,
  ListChecks, Power, Archive, AlertTriangle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useClient, useExercises, useDeleteClient,
  useClientWorkouts, useCreateWorkout, useActivateWorkout, useDeleteWorkout, useDuplicateWorkout,
  useWorkoutItems, useAddWorkoutItem, useUpdateWorkoutItem, useDeleteWorkoutItem,
  type Exercise, type Workout,
} from "@/hooks/useTrainerData";
import ClientFormDialog from "@/components/ClientFormDialog";
import ExerciseMedia from "@/components/ExerciseMedia";
import { Copy } from "lucide-react";

const expiryStatus = (w: Workout): { label: string; tone: "ok" | "warn" | "expired" } => {
  if (!w.expires_at) return { label: "—", tone: "ok" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(w.expires_at);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Scaduta da ${-diffDays}g`, tone: "expired" };
  if (diffDays <= 7) return { label: `Scade in ${diffDays}g`, tone: "warn" };
  return { label: `Scade ${exp.toLocaleDateString("it-IT")}`, tone: "ok" };
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: exercises = [] } = useExercises();
  const { data: workouts = [], isLoading: workoutsLoading } = useClientWorkouts(id);

  const activeWorkout = workouts.find((w) => w.is_active) ?? workouts[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentWorkoutId = selectedId ?? activeWorkout?.id;

  const { data: items = [] } = useWorkoutItems(currentWorkoutId);

  const addItem = useAddWorkoutItem();
  const updateItem = useUpdateWorkoutItem();
  const deleteItem = useDeleteWorkoutItem();
  const deleteClient = useDeleteClient();
  const createWorkout = useCreateWorkout();
  const activateWorkout = useActivateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const duplicateWorkout = useDuplicateWorkout();

  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newWorkoutOpen, setNewWorkoutOpen] = useState(false);

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const currentWorkout = workouts.find((w) => w.id === currentWorkoutId);

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground mb-4">Cliente non trovato.</p>
        <Link to="/" className="text-primary hover:underline">Torna ai clienti</Link>
      </div>
    );
  }

  const filteredLib = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (ex: Exercise) => {
    if (!currentWorkout) return;
    try {
      await addItem.mutateAsync({
        workout_id: currentWorkout.id,
        client_id: client.id,
        exercise_id: ex.id,
        position: items.length,
      });
      setPickerOpen(false);
      setSearch("");
      toast.success(`${ex.name} aggiunto`);
    } catch {
      toast.error("Errore nell'aggiunta");
    }
  };

  const handleDeleteClient = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      toast.success("Cliente eliminato");
      navigate("/");
    } catch {
      toast.error("Errore");
    }
  };

  const status = currentWorkout ? expiryStatus(currentWorkout) : null;

  return (
    <div className="px-6 md:px-12 py-8 max-w-5xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-smooth"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti i clienti
      </Link>

      {/* HEADER CLIENTE */}
      <div className="bg-gradient-card border border-border rounded-2xl p-6 md:p-8 shadow-card mb-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-display text-3xl text-primary shrink-0">
              {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl md:text-4xl uppercase leading-tight truncate">
                {client.name}
              </h1>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mt-1">
                {client.level}
                {client.client_user_id && (
                  <span className="ml-2 text-accent">• Account collegato</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} aria-label="Modifica">
              <Pencil />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="hover:!border-destructive hover:!text-destructive" aria-label="Elimina">
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare {client.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Verranno eliminate anche tutte le sue schede. Operazione irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {client.goal && (
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Obiettivo</p>
                <p className="text-foreground">{client.goal}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Iniziato</p>
              <p className="text-foreground">{new Date(client.started_at).toLocaleDateString("it-IT")}</p>
            </div>
          </div>
          {client.email && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Email</p>
                <p className="text-foreground">{client.email}</p>
                {!client.client_user_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Il cliente deve registrarsi su <span className="text-primary">/auth</span> con questa email per vedere la sua scheda.
                  </p>
                )}
              </div>
            </div>
          )}
          {client.notes && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Note</p>
                <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BANNER ALERT SCADENZA */}
      {status && status.tone !== "ok" && currentWorkout?.is_active && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
          status.tone === "expired"
            ? "bg-destructive/10 border-destructive/40 text-destructive"
            : "bg-accent/10 border-accent/40 text-accent"
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold uppercase text-sm tracking-wider">
              {status.tone === "expired" ? "Scheda scaduta" : "Scheda in scadenza"}
            </p>
            <p className="text-sm opacity-90">
              {status.label}. Crea una nuova scheda per {client.name}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setNewWorkoutOpen(true)}>
            <Plus /> Nuova
          </Button>
        </div>
      )}

      {/* TABS SCHEDE */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl uppercase">Schede</h2>
          <p className="text-muted-foreground text-sm">
            {workouts.length} {workouts.length === 1 ? "scheda" : "schede"} • storico mantenuto
          </p>
        </div>
        <Button variant="hero" onClick={() => setNewWorkoutOpen(true)}>
          <Plus /> Nuova scheda
        </Button>
      </div>

      {workoutsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-5">Nessuna scheda ancora.</p>
          <Button variant="hero" onClick={() => setNewWorkoutOpen(true)}>
            <Plus /> Crea prima scheda
          </Button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
            {workouts.map((w) => {
              const isCurrent = w.id === currentWorkoutId;
              const st = expiryStatus(w);
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`px-4 py-2.5 rounded-lg border text-left whitespace-nowrap transition-smooth shrink-0 ${
                    isCurrent
                      ? "bg-primary/10 border-primary text-foreground shadow-glow"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display uppercase text-sm">{w.name}</span>
                    {w.is_active ? (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">
                        Attiva
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Storico
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider mt-0.5 flex items-center gap-1 ${
                    st.tone === "expired" ? "text-destructive" : st.tone === "warn" ? "text-accent" : "text-muted-foreground"
                  }`}>
                    <Clock className="h-2.5 w-2.5" /> {st.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Header scheda corrente */}
          {currentWorkout && (
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {new Date(currentWorkout.start_date).toLocaleDateString("it-IT")} →{" "}
                  {currentWorkout.expires_at && new Date(currentWorkout.expires_at).toLocaleDateString("it-IT")}
                  {" • "}{currentWorkout.duration_weeks} settimane
                </p>
                <p className="font-display text-xl uppercase mt-1">{currentWorkout.name}</p>
              </div>
              <div className="flex gap-2">
                {!currentWorkout.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      activateWorkout.mutateAsync({ id: currentWorkout.id, client_id: client.id })
                        .then(() => toast.success("Scheda attivata"))
                    }
                  >
                    <Power /> Attiva
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const w = await duplicateWorkout.mutateAsync({
                        sourceWorkoutId: currentWorkout.id,
                        client_id: client.id,
                        name: `${currentWorkout.name} (copia)`,
                        duration_weeks: currentWorkout.duration_weeks,
                        start_date: new Date().toISOString().slice(0, 10),
                        activate: true,
                      });
                      setSelectedId(w.id);
                      toast.success("Scheda duplicata e attivata");
                    } catch (e) {
                      toast.error("Errore duplicazione");
                    }
                  }}
                  disabled={duplicateWorkout.isPending}
                  aria-label="Duplica scheda"
                >
                  <Copy /> Duplica
                </Button>
                <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus /> Esercizio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl uppercase">Libreria esercizi</DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca esercizio o gruppo muscolare..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 -mx-6 px-6">
                      <div className="space-y-1.5">
                        {filteredLib.map((ex) => (
                          <button
                            key={ex.id}
                            onClick={() => handleAdd(ex)}
                            disabled={addItem.isPending}
                            className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-smooth flex items-center justify-between disabled:opacity-50"
                          >
                            <span className="font-medium">{ex.name}</span>
                            <span className="text-[10px] uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                              {ex.muscle_group}
                            </span>
                          </button>
                        ))}
                        {filteredLib.length === 0 && (
                          <p className="text-center text-muted-foreground py-8 text-sm">Nessun esercizio trovato</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="hover:!border-destructive hover:!text-destructive">
                      <Archive />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare la scheda "{currentWorkout.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Verranno eliminati anche tutti gli esercizi e i log di questa scheda.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteWorkout.mutateAsync({ id: currentWorkout.id, client_id: client.id })
                            .then(() => { toast.success("Scheda eliminata"); setSelectedId(null); })
                        }
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Esercizi della scheda */}
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground">Nessun esercizio in questa scheda.</p>
              </div>
            )}

            {items.map((item, idx) => {
              const ex = exMap.get(item.exercise_id);
              const hasMedia = !!(ex && (ex.video_path || ex.video_url || ex.image_path));
              return (
                <div
                  key={item.id}
                  className="bg-gradient-card border border-border rounded-xl p-4 md:p-5 shadow-card hover:border-primary/40 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="font-display text-2xl text-primary/60 leading-none mt-0.5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        {ex ? (
                          <Link
                            to={`/esercizi/${ex.id}`}
                            className="font-display text-lg uppercase tracking-wide leading-tight truncate hover:text-primary transition-smooth block"
                          >
                            {ex.name}
                          </Link>
                        ) : (
                          <h3 className="font-display text-lg uppercase tracking-wide leading-tight truncate">Esercizio</h3>
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ex?.muscle_group ?? ""}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItem.mutate({ id: item.id, workout_id: item.workout_id })}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  {hasMedia && ex && (
                    <details className="mb-4 group">
                      <summary className="cursor-pointer text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5 hover:text-primary/80 transition-smooth list-none">
                        <PlayCircle className="h-4 w-4" />
                        <span className="group-open:hidden">Mostra video</span>
                        <span className="hidden group-open:inline">Nascondi video</span>
                      </summary>
                      <div className="mt-3"><ExerciseMedia exercise={ex} /></div>
                    </details>
                  )}

                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <Field label="Serie" type="number" value={item.sets}
                      onChange={(v) => updateItem.mutate({ id: item.id, workout_id: item.workout_id, sets: Number(v) || 0 })}
                    />
                    <Field label="Reps" value={item.reps}
                      onChange={(v) => updateItem.mutate({ id: item.id, workout_id: item.workout_id, reps: v })}
                    />
                    <Field label="Recupero" value={item.rest}
                      onChange={(v) => updateItem.mutate({ id: item.id, workout_id: item.workout_id, rest: v })}
                    />
                  </div>

                  <Input
                    placeholder="Note (opzionale)"
                    defaultValue={item.notes ?? ""}
                    onBlur={(e) => {
                      if ((e.target.value || null) !== item.notes) {
                        updateItem.mutate({ id: item.id, workout_id: item.workout_id, notes: e.target.value || null });
                      }
                    }}
                    className="mt-3 bg-background/50"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <NewWorkoutDialog
        open={newWorkoutOpen}
        onOpenChange={setNewWorkoutOpen}
        onCreate={async (input) => {
          const w = await createWorkout.mutateAsync({ client_id: client.id, ...input });
          setSelectedId(w.id);
          toast.success("Scheda creata e attivata");
        }}
      />
    </div>
  );
};

interface FieldProps { label: string; value: string | number; type?: string; onChange: (v: string) => void; }
const Field = ({ label, value, type = "text", onChange }: FieldProps) => {
  const [local, setLocal] = useState(String(value));
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{label}</label>
      <Input
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== String(value)) onChange(local); }}
        className="bg-background/50 h-10 font-display text-lg text-center"
      />
    </div>
  );
};

interface NewWorkoutProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: { name: string; duration_weeks: number; start_date: string; notes: string | null }) => Promise<void>;
}
const NewWorkoutDialog = ({ open, onOpenChange, onCreate }: NewWorkoutProps) => {
  const [name, setName] = useState("Nuova scheda");
  const [weeks, setWeeks] = useState(6);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome richiesto");
    if (weeks < 1 || weeks > 104) return toast.error("Durata 1-104 settimane");
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), duration_weeks: weeks, start_date: start, notes: notes.trim() || null });
      onOpenChange(false);
      setName("Nuova scheda"); setWeeks(6); setNotes("");
      setStart(new Date().toISOString().slice(0, 10));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">Nuova scheda</DialogTitle>
          <DialogDescription>La scheda corrente verrà spostata nello storico.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Durata (settimane)</label>
              <Input type="number" min={1} max={104} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Data inizio</label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Note (opzionale)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="hero" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Crea e attiva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetail;
