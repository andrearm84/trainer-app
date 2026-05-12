import { useMemo, useState } from "react";
import { Loader2, AlertTriangle, Clock, CheckCircle2, PlayCircle, History, Play, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useMyClientProfile, useClientWorkouts, useWorkoutItems, useExercises,
  useWorkoutLogs, useUpsertWorkoutLog, type Workout,
} from "@/hooks/useTrainerData";
import ExerciseMedia from "@/components/ExerciseMedia";
import ExerciseTimer from "@/components/ExerciseTimer";
import ExerciseProgressChart from "@/components/ExerciseProgressChart";
import ClientStatsCard from "@/components/ClientStatsCard";

const expiryStatus = (w: Workout) => {
  if (!w.expires_at) return { label: "—", tone: "ok" as const };
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(w.expires_at);
  const d = Math.round((exp.getTime() - today.getTime()) / 86400000);
  if (d < 0) return { label: `Scaduta da ${-d}g`, tone: "expired" as const };
  if (d <= 7) return { label: `Scade in ${d}g`, tone: "warn" as const };
  return { label: `Scade ${exp.toLocaleDateString("it-IT")}`, tone: "ok" as const };
};

const today = () => new Date().toISOString().slice(0, 10);

const MyWorkout = () => {
  const { data: client, isLoading: loadingClient } = useMyClientProfile();
  const { data: workouts = [], isLoading: loadingW } = useClientWorkouts(client?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timerItemId, setTimerItemId] = useState<string | null>(null);
  const [chartItem, setChartItem] = useState<{ id: string; name: string } | null>(null);
  const active = workouts.find((w) => w.is_active);
  const currentId = selectedId ?? active?.id;
  const current = workouts.find((w) => w.id === currentId);

  const { data: items = [] } = useWorkoutItems(currentId);
  const { data: exercises = [] } = useExercises();
  const { data: logs = [] } = useWorkoutLogs(currentId);
  const upsert = useUpsertWorkoutLog();

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const logMap = useMemo(() => {
    const m = new Map<string, { completed: boolean; weight: string | null; notes: string | null }>();
    logs.forEach((l: any) => {
      if (l.log_date === today()) m.set(l.workout_item_id, { completed: l.completed, weight: l.weight, notes: l.notes });
    });
    return m;
  }, [logs]);

  if (loadingClient || loadingW) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!client) {
    return (
      <div className="px-6 md:px-12 py-12 max-w-2xl">
        <h1 className="font-display text-3xl uppercase mb-3">Nessuna scheda assegnata</h1>
        <p className="text-muted-foreground">
          Il tuo personal trainer non ha ancora collegato il tuo account. Verifica che si sia registrato con la tua stessa email, oppure contattalo.
        </p>
      </div>
    );
  }

  const status = current ? expiryStatus(current) : null;

  return (
    <div className="px-6 md:px-12 py-8 max-w-3xl">
      <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-2">La tua area</p>
      <h1 className="font-display text-4xl md:text-5xl uppercase leading-none mb-2">Ciao, {client.name.split(" ")[0]}</h1>
      <p className="text-muted-foreground mb-6">{client.goal || "Allenati con costanza."}</p>

      <ClientStatsCard clientId={client.id} />

      {workouts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">Il tuo trainer non ha ancora creato una scheda.</p>
        </div>
      )}

      {status && status.tone === "expired" && (
        <div className="mb-6 p-4 rounded-xl border bg-destructive/10 border-destructive/40 text-destructive flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold uppercase text-sm tracking-wider">Scheda scaduta</p>
            <p className="text-sm opacity-90">{status.label}. Contatta il tuo trainer per la nuova scheda.</p>
          </div>
        </div>
      )}

      {/* Tabs schede */}
      {workouts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {workouts.map((w) => {
            const isCur = w.id === currentId;
            const st = expiryStatus(w);
            return (
              <button
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                className={`px-4 py-2.5 rounded-lg border whitespace-nowrap transition-smooth shrink-0 ${
                  isCur ? "bg-primary/10 border-primary shadow-glow" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-display uppercase text-sm">{w.name}</span>
                  {w.is_active ? (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">Attiva</span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border flex items-center gap-1">
                      <History className="h-2.5 w-2.5" /> Storico
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
      )}

      {current && (
        <>
          <div className="mb-5">
            <p className="font-display text-2xl uppercase">{current.name}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {new Date(current.start_date).toLocaleDateString("it-IT")} → {current.expires_at && new Date(current.expires_at).toLocaleDateString("it-IT")} • {current.duration_weeks} settimane
            </p>
          </div>

          <div className="space-y-3">
            {items.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground">Scheda vuota.</p>
              </div>
            )}
            {items.map((item, idx) => {
              const ex = exMap.get(item.exercise_id);
              const hasMedia = !!(ex && (ex.video_path || ex.video_url || ex.image_path));
              const log = logMap.get(item.id);
              const isReadOnly = !current.is_active;
              return (
                <div key={item.id} className={`bg-gradient-card border rounded-xl p-4 md:p-5 shadow-card transition-smooth ${
                  log?.completed ? "border-primary/50" : "border-border"
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      disabled={isReadOnly}
                      onClick={() => upsert.mutate({
                        workout_item_id: item.id,
                        client_id: client.id,
                        workout_id: current.id,
                        completed: !log?.completed,
                        weight: log?.weight ?? null,
                        notes: log?.notes ?? null,
                      })}
                      className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center shrink-0 transition-smooth ${
                        log?.completed
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border hover:border-primary/60"
                      } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                      aria-label={log?.completed ? "Completato" : "Segna completato"}
                    >
                      {log?.completed ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-display text-sm">{String(idx + 1).padStart(2, "0")}</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg uppercase tracking-wide leading-tight">{ex?.name ?? "Esercizio"}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ex?.muscle_group ?? ""}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <Stat label="Serie" value={item.sets} />
                    <Stat label="Reps" value={item.reps} />
                    <Stat label="Recupero" value={item.rest} />
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
                    {!isReadOnly ? (
                      <Button variant="hero" size="sm" onClick={() => setTimerItemId(item.id)}>
                        <Play className="h-4 w-4" /> Allena con timer
                      </Button>
                    ) : <div />}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChartItem({ id: item.id, name: ex?.name ?? "Esercizio" })}
                      aria-label="Progressi"
                    >
                      <TrendingUp className="h-4 w-4" /> Progressi
                    </Button>
                  </div>

                  {item.notes && (
                    <p className="text-sm text-muted-foreground bg-background/40 border border-border rounded-lg px-3 py-2 mb-3">
                      {item.notes}
                    </p>
                  )}

                  {hasMedia && ex && (
                    <details className="mb-3 group">
                      <summary className="cursor-pointer text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5 list-none">
                        <PlayCircle className="h-4 w-4" />
                        <span className="group-open:hidden">Mostra video</span>
                        <span className="hidden group-open:inline">Nascondi video</span>
                      </summary>
                      <div className="mt-3"><ExerciseMedia exercise={ex} /></div>
                    </details>
                  )}

                  {!isReadOnly && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Peso usato (es. 60kg)"
                        defaultValue={log?.weight ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value || null;
                          if (v !== (log?.weight ?? null)) {
                            upsert.mutate({
                              workout_item_id: item.id, client_id: client.id, workout_id: current.id,
                              completed: log?.completed ?? false, weight: v, notes: log?.notes ?? null,
                            });
                          }
                        }}
                        className="bg-background/50"
                      />
                      <Input
                        placeholder="Note tue"
                        defaultValue={log?.notes ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value || null;
                          if (v !== (log?.notes ?? null)) {
                            upsert.mutate({
                              workout_item_id: item.id, client_id: client.id, workout_id: current.id,
                              completed: log?.completed ?? false, weight: log?.weight ?? null, notes: v,
                            });
                          }
                        }}
                        className="bg-background/50"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {(() => {
        const tItem = items.find((i) => i.id === timerItemId);
        const tEx = tItem ? exMap.get(tItem.exercise_id) : null;
        if (!tItem || !current) return null;
        return (
          <ExerciseTimer
            open={!!timerItemId}
            onOpenChange={(o) => !o && setTimerItemId(null)}
            exerciseName={tEx?.name ?? "Esercizio"}
            sets={tItem.sets}
            reps={tItem.reps}
            rest={tItem.rest}
            onComplete={() => {
              const log = logMap.get(tItem.id);
              upsert.mutate({
                workout_item_id: tItem.id,
                client_id: client.id,
                workout_id: current.id,
                completed: true,
                weight: log?.weight ?? null,
                notes: log?.notes ?? null,
              });
            }}
          />
        );
      })()}

      <ExerciseProgressChart
        open={!!chartItem}
        onOpenChange={(o) => !o && setChartItem(null)}
        workoutItemId={chartItem?.id ?? null}
        exerciseName={chartItem?.name ?? ""}
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-background/40 border border-border rounded-lg py-2">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-xl text-primary">{value}</p>
  </div>
);

export default MyWorkout;
