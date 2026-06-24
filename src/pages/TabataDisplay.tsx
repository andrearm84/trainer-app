import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPublicTabataSession, tabataChannelName,
  type PublicTabataSession, type TabataLiveState,
} from "@/hooks/useTabataData";

const fmt = (totalSec: number) => {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const ExerciseTable = ({
  items, currentIndex, phase,
}: {
  items: PublicTabataSession["items"];
  currentIndex?: number;
  phase?: "work" | "rest" | "done";
}) => (
  <div className="w-full max-w-2xl rounded-xl border border-border overflow-hidden">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-card text-muted-foreground text-xs uppercase tracking-widest">
          <th className="px-4 py-3 w-14">#</th>
          <th className="px-4 py-3">Esercizio</th>
          <th className="px-4 py-3 text-right">Lavoro</th>
          <th className="px-4 py-3 text-right">Recupero</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <tr
              key={item.position}
              className={`border-t border-border transition-smooth ${
                isCurrent ? (phase === "rest" ? "bg-accent/20" : "bg-primary/20") : ""
              }`}
            >
              <td className="px-4 py-3 text-muted-foreground tabular-nums">{idx + 1}</td>
              <td className={`px-4 py-3 uppercase ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {item.name}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{item.work_seconds}s</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{item.rest_seconds}s</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const TabataDisplay = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<PublicTabataSession | null | undefined>(undefined);
  const [liveState, setLiveState] = useState<TabataLiveState | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!sessionId) return;
    fetchPublicTabataSession(sessionId).then(setSession).catch(() => setSession(null));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(tabataChannelName(sessionId));
    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      setLiveState(payload as TabataLiveState);
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "request-sync", payload: {} });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
        <div>
          <Tv className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-2xl font-display uppercase text-muted-foreground">Lezione non trovata</p>
        </div>
      </div>
    );
  }

  const items = session.items;

  if (!liveState) {
    return (
      <div className="min-h-screen flex flex-col items-center px-6 md:px-12 py-10 gap-10 bg-background">
        <p className="font-display text-lg md:text-xl uppercase tracking-[0.4em] text-muted-foreground">
          Training Space
        </p>
        <div className="flex flex-col items-center text-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-2xl font-display uppercase text-muted-foreground">In attesa del trainer…</p>
          <p className="text-sm text-muted-foreground">{session.routine_name}</p>
        </div>
        <ExerciseTable items={items} />
      </div>
    );
  }

  const current = items[liveState.item_index];
  const isDone = liveState.phase === "done";
  const isWork = liveState.phase === "work";

  const secLeft = liveState.paused
    ? Math.ceil((liveState.remaining_ms ?? 0) / 1000)
    : liveState.phase_ends_at
      ? Math.max(0, Math.ceil((liveState.phase_ends_at - now) / 1000))
      : 0;

  const pulsing = !isDone && secLeft <= 3 && secLeft > 0;

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-6 md:px-12 py-10 gap-10 transition-smooth ${
        isDone ? "bg-background" : isWork ? "bg-primary/15" : "bg-accent/15"
      }`}
    >
      <p className="font-display text-lg md:text-xl uppercase tracking-[0.4em] text-muted-foreground">
        Training Space
      </p>

      {isDone ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <p className="font-display text-5xl md:text-7xl uppercase text-foreground">Lezione completata</p>
          <p className="text-xl text-muted-foreground uppercase tracking-widest">{session.routine_name}</p>
          <ExerciseTable items={items} />
        </div>
      ) : (
        <div className="flex-1 w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10">
          <div className="flex flex-col items-center text-center lg:w-[380px] shrink-0">
            <p className="text-xl md:text-2xl uppercase tracking-[0.3em] text-muted-foreground mb-3">
              {liveState.paused ? "In pausa" : isWork ? "Lavoro" : "Recupero"}
            </p>
            <h1 className="font-display text-5xl md:text-6xl uppercase leading-none mb-6">
              {current?.name}
            </h1>
            <p
              className={`font-display text-[22vw] lg:text-[9vw] leading-none tabular-nums ${
                pulsing ? "animate-pulse" : ""
              } ${isWork ? "text-primary" : "text-accent"}`}
            >
              {fmt(secLeft)}
            </p>
            <p className="mt-6 text-lg md:text-xl uppercase tracking-widest text-muted-foreground">
              Round {liveState.item_index + 1} / {items.length}
            </p>
          </div>

          <ExerciseTable items={items} currentIndex={liveState.item_index} phase={liveState.phase} />
        </div>
      )}
    </div>
  );
};

export default TabataDisplay;
