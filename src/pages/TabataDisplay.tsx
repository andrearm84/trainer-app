import { useEffect, useRef, useState } from "react";
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

  if (!liveState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
        <div>
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-2xl font-display uppercase text-muted-foreground">In attesa del trainer…</p>
          <p className="text-sm text-muted-foreground mt-2">{session.routine_name}</p>
        </div>
      </div>
    );
  }

  const items = session.items;
  const current = items[liveState.item_index];
  const next = items[liveState.item_index + 1];
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
      className={`min-h-screen flex flex-col items-center justify-center px-8 transition-smooth ${
        isDone ? "bg-background" : isWork ? "bg-primary/15" : "bg-accent/15"
      }`}
    >
      <p className="fixed top-6 left-1/2 -translate-x-1/2 font-display text-lg md:text-xl uppercase tracking-[0.4em] text-muted-foreground">
        Training Space
      </p>

      {isDone ? (
        <div className="text-center">
          <p className="font-display text-6xl md:text-8xl uppercase text-foreground">Lezione completata</p>
          <p className="text-2xl text-muted-foreground mt-4 uppercase tracking-widest">{session.routine_name}</p>
        </div>
      ) : (
        <>
          <p className="text-xl md:text-3xl uppercase tracking-[0.3em] text-muted-foreground mb-4">
            {liveState.paused ? "In pausa" : isWork ? "Lavoro" : "Recupero"}
          </p>
          <h1 className="font-display text-6xl md:text-9xl uppercase text-center leading-none mb-8 px-4">
            {current?.name}
          </h1>
          <p
            className={`font-display text-[18vw] md:text-[14vw] leading-none tabular-nums ${
              pulsing ? "animate-pulse" : ""
            } ${isWork ? "text-primary" : "text-accent"}`}
          >
            {fmt(secLeft)}
          </p>
          <div className="mt-10 flex items-center gap-8 text-xl md:text-2xl uppercase tracking-widest text-muted-foreground">
            <span>Esercizio {liveState.item_index + 1} / {items.length}</span>
            {next && <span>Prossimo: {next.name}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default TabataDisplay;
