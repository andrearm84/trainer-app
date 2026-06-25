import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Star, Trash2, Loader2, ArrowUp, ArrowDown, PlayCircle, Tv, Dumbbell, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useRoutines, useCreateRoutine, useUpdateRoutine, useDeleteRoutine,
  useRoutineItems, useAddRoutineItem, useUpdateRoutineItem, useDeleteRoutineItem, useSwapRoutineItems,
  useFavoriteExercises, useSaveFavoriteExercise, useDeleteFavoriteExercise,
  useCreateSession, type TabataRoutineItem,
} from "@/hooks/useTabataData";

const TabataRoutines = () => {
  const navigate = useNavigate();
  const { data: routines = [], isLoading } = useRoutines();
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const createSession = useCreateSession();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentId = selectedId ?? routines[0]?.id;
  const current = routines.find((r) => r.id === currentId);

  const { data: items = [] } = useRoutineItems(currentId);
  const addItem = useAddRoutineItem();
  const updateItem = useUpdateRoutineItem();
  const deleteItem = useDeleteRoutineItem();
  const swapItems = useSwapRoutineItems();

  const { data: favorites = [] } = useFavoriteExercises();
  const saveFavorite = useSaveFavoriteExercise();
  const deleteFavorite = useDeleteFavoriteExercise();

  const [newName, setNewName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemWork, setItemWork] = useState(20);
  const [itemRest, setItemRest] = useState(10);
  const [saveAsFav, setSaveAsFav] = useState(false);
  const [starting, setStarting] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items]
  );

  const handleCreateRoutine = async () => {
    const name = newName.trim() || "Lezione Tabata";
    try {
      const r = await createRoutine.mutateAsync(name);
      setNewName("");
      setSelectedId(r.id);
    } catch {
      toast.error("Errore nella creazione della lezione");
    }
  };

  const handleAddItem = async () => {
    if (!current || !itemName.trim()) return;
    try {
      await addItem.mutateAsync({
        routine_id: current.id,
        name: itemName.trim(),
        work_seconds: itemWork,
        rest_seconds: itemRest,
        position: sortedItems.length,
      });
      if (saveAsFav) {
        await saveFavorite.mutateAsync({ name: itemName.trim(), work_seconds: itemWork, rest_seconds: itemRest });
      }
      setItemName("");
    } catch {
      toast.error("Errore nell'aggiunta dell'esercizio");
    }
  };

  const addFromFavorite = async (fav: { name: string; work_seconds: number; rest_seconds: number }) => {
    if (!current) return;
    try {
      await addItem.mutateAsync({
        routine_id: current.id,
        name: fav.name,
        work_seconds: fav.work_seconds,
        rest_seconds: fav.rest_seconds,
        position: sortedItems.length,
      });
    } catch {
      toast.error("Errore nell'aggiunta dell'esercizio");
    }
  };

  const move = (item: TabataRoutineItem, dir: -1 | 1) => {
    const idx = sortedItems.findIndex((i) => i.id === item.id);
    const target = sortedItems[idx + dir];
    if (!target || !current) return;
    swapItems.mutate({ routine_id: current.id, a: item, b: target });
  };

  const handleStart = async () => {
    if (!current || sortedItems.length === 0) return;
    setStarting(true);
    try {
      const session = await createSession.mutateAsync(current.id);
      navigate(`/tabata/controller/${session.id}`);
    } catch {
      toast.error("Errore nell'avvio della lezione");
      setStarting(false);
    }
  };

  const copyTvLink = async (routineId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/tv/${routineId}`);
    toast.success("Link TV copiato: resta fisso, puoi salvarlo come preferito");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="px-6 md:px-12 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl uppercase leading-none">
            Lezioni <span className="text-gradient-primary">Tabata</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Componi la sequenza, salva i preferiti, avvia la lezione in streaming sulle TV.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* LISTA SEQUENZE */}
        <div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nome nuova lezione"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoutine()}
            />
            <Button size="icon" variant="outline" onClick={handleCreateRoutine} aria-label="Crea lezione">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {routines.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-smooth flex items-center justify-between gap-2 ${
                  r.id === currentId
                    ? "bg-primary/10 border-primary shadow-glow"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <span className="font-display text-sm uppercase truncate">{r.name}</span>
                <Star
                  className={`h-4 w-4 shrink-0 cursor-pointer ${r.is_favorite ? "fill-accent text-accent" : "text-muted-foreground"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateRoutine.mutate({ id: r.id, is_favorite: !r.is_favorite });
                  }}
                />
              </button>
            ))}
            {routines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nessuna lezione ancora.</p>
            )}
          </div>
        </div>

        {/* EDITOR SEQUENZA */}
        <div>
          {!current ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
              Crea o seleziona una lezione per iniziare.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="font-display text-2xl uppercase">{current.name}</h2>
                <div className="flex gap-2">
                  <Button variant="hero" disabled={sortedItems.length === 0 || starting} onClick={handleStart}>
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                    Avvia lezione
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyTvLink(current.id)} aria-label="Copia link TV">
                    <Tv className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="hover:!border-destructive hover:!text-destructive" aria-label="Elimina lezione">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare "{current.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>Verranno eliminati anche tutti gli esercizi della sequenza.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => { deleteRoutine.mutate(current.id); setSelectedId(null); }}
                        >
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Lista esercizi */}
              <div className="space-y-2 mb-6">
                {sortedItems.map((item, idx) => (
                  <div key={item.id} className="bg-gradient-card border border-border rounded-xl p-3 flex items-center gap-3">
                    <span className="font-display text-lg text-primary w-7 text-center shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Lavoro {item.work_seconds}s · Recupero {item.rest_seconds}s
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => move(item, -1)} aria-label="Sposta su">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={idx === sortedItems.length - 1} onClick={() => move(item, 1)} aria-label="Sposta giù">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => deleteItem.mutate({ id: item.id, routine_id: current.id })}
                        aria-label="Rimuovi"
                        className="hover:!text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {sortedItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                    Aggiungi il primo esercizio qui sotto.
                  </p>
                )}
              </div>

              {/* Form aggiunta esercizio */}
              <div className="bg-card border border-border rounded-xl p-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Aggiungi esercizio</p>
                <div className="grid grid-cols-[1fr_90px_90px] gap-2 mb-2">
                  <Input
                    placeholder="Nome esercizio"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Input type="number" min={1} value={itemWork} onChange={(e) => setItemWork(Number(e.target.value) || 1)} aria-label="Secondi lavoro" />
                  <Input type="number" min={0} value={itemRest} onChange={(e) => setItemRest(Number(e.target.value) || 0)} aria-label="Secondi recupero" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={saveAsFav} onChange={(e) => setSaveAsFav(e.target.checked)} />
                    Salva anche tra i preferiti
                  </label>
                  <Button onClick={handleAddItem} disabled={!itemName.trim()}>
                    <Plus className="h-4 w-4" /> Aggiungi
                  </Button>
                </div>
              </div>

              {/* Preferiti rapidi */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" /> Esercizi preferiti
                </p>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((f) => (
                    <span
                      key={f.id}
                      className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs border border-border bg-card hover:border-primary/50 transition-smooth"
                    >
                      <button onClick={() => addFromFavorite(f)} className="flex items-center gap-1.5">
                        <Dumbbell className="h-3 w-3 text-primary" />
                        {f.name}
                        <span className="text-muted-foreground">{f.work_seconds}s/{f.rest_seconds}s</span>
                      </button>
                      <button
                        onClick={() => deleteFavorite.mutate(f.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth"
                        aria-label={`Rimuovi ${f.name} dai preferiti`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {favorites.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nessun preferito. Spunta "Salva anche tra i preferiti" quando aggiungi un esercizio.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Tv className="h-3.5 w-3.5" /> Il link TV di questa lezione è fisso: copialo e salvalo come preferito, niente login richiesto.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabataRoutines;
