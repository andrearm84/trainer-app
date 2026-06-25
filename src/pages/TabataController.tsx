import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Square, Copy, Tv, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useSession, useRoutine, useRoutineItems, useEndSession,
  tabataChannelName, type TabataLiveState,
} from "@/hooks/useTabataData";

const fmt = (totalSec: number) => {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const TabataController = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading: loadingSession } = useSession(sessionId);
  const { data: routine } = useRoutine(session?.routine_id);
  const { data: rawItems = [], isLoading: loadingItems } = useRoutineItems(session?.routine_id);
  const endSession = useEndSession();

  const items = useMemo(() => [...rawItems].sort((a, b) => a.position - b.position), [rawItems]);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const [liveState, setLiveState] = useState<TabataLiveState | null>(null);
  const liveRef = useRef<TabataLiveState | null>(null);
  useEffect(() => { liveRef.current = liveState; }, [liveState]);

  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const initializedRef = useRef(false);

  // Canale realtime: il pannello trasmette lo stato, le TV lo ricevono e calcolano il countdown in locale
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(tabataChannelName(sessionId));
    channel.on("broadcast", { event: "request-sync" }, () => {
      if (liveRef.current) channel.send({ type: "broadcast", event: "state", payload: liveRef.current });
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setReady(true);
    });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setReady(false);
    };
  }, [sessionId]);

  // Stato iniziale, una volta sole quando gli esercizi sono pronti
  useEffect(() => {
    if (initializedRef.current || items.length === 0) return;
    initializedRef.current = true;
    setLiveState({
      item_index: 0,
      phase: "work",
      paused: false,
      phase_ends_at: Date.now() + items[0].work_seconds * 1000,
      remaining_ms: null,
    });
  }, [items]);

  // Ogni cambio di stato viene trasmesso alle TV
  useEffect(() => {
    if (liveState && ready) {
      channelRef.current?.send({ type: "broadcast", event: "state", payload: liveState });
    }
  }, [liveState, ready]);

  // Termina automaticamente la sessione lato DB a fine sequenza (una sola volta),
  // poi torna alla lista lezioni senza bisogno di un click manuale del trainer.
  const endedRef = useRef(false);
  useEffect(() => {
    if (liveState?.phase === "done" && sessionId && !endedRef.current) {
      endedRef.current = true;
      endSession.mutate(sessionId);
      toast.success("Lezione conclusa");
      const id = setTimeout(() => navigate("/tabata"), 4000);
      return () => clearTimeout(id);
    }
  }, [liveState?.phase, sessionId, endSession, navigate]);

  const transition = () => {
    const ls = liveRef.current;
    const its = itemsRef.current;
    if (!ls || ls.phase === "done") return;
    if (ls.phase === "work") {
      const restSec = its[ls.item_index]?.rest_seconds ?? 0;
      setLiveState({ ...ls, phase: "rest", paused: false, phase_ends_at: Date.now() + restSec * 1000, remaining_ms: null });
    } else if (ls.phase === "rest") {
      const nextIndex = ls.item_index + 1;
      if (nextIndex >= its.length) {
        setLiveState({ ...ls, phase: "done", phase_ends_at: null, remaining_ms: null });
      } else {
        setLiveState({
          item_index: nextIndex, phase: "work", paused: false,
          phase_ends_at: Date.now() + its[nextIndex].work_seconds * 1000, remaining_ms: null,
        });
      }
    }
  };

  // Tick locale: aggiorna il countdown a video e fa avanzare automaticamente la fase
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      const ls = liveRef.current;
      if (ls && !ls.paused && ls.phase !== "done" && ls.phase_ends_at !== null && Date.now() >= ls.phase_ends_at) {
        transition();
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const togglePause = () => {
    const ls = liveRef.current;
    if (!ls || ls.phase === "done") return;
    if (ls.paused) {
      setLiveState({ ...ls, paused: false, phase_ends_at: Date.now() + (ls.remaining_ms ?? 0), remaining_ms: null });
    } else {
      setLiveState({ ...ls, paused: true, remaining_ms: ls.phase_ends_at ? ls.phase_ends_at - Date.now() : 0, phase_ends_at: null });
    }
  };

  const skip = () => transition();

  const prevItem = () => {
    const ls = liveRef.current;
    const its = itemsRef.current;
    if (!ls || its.length === 0) return;
    const prevIndex = Math.max(0, ls.item_index - 1);
    setLiveState({
      item_index: prevIndex, phase: "work", paused: false,
      phase_ends_at: Date.now() + its[prevIndex].work_seconds * 1000, remaining_ms: null,
    });
  };

  const restart = () => {
    const its = itemsRef.current;
    if (its.length === 0) return;
    setLiveState({ item_index: 0, phase: "work", paused: false, phase_ends_at: Date.now() + its[0].work_seconds * 1000, remaining_ms: null });
  };

  const handleEnd = async () => {
    setLiveState((ls) => (ls ? { ...ls, phase: "done", phase_ends_at: null, remaining_ms: null } : ls));
    navigate("/tabata");
  };

  const tvUrl = sessionId ? `${window.location.origin}/tv/${sessionId}` : "";
  const copyLink = async () => {
    await navigator.clipboard.writeText(tvUrl);
    toast.success("Link copiato");
  };

  if (loadingSession || loadingItems) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!session || items.length === 0) {
    return (
      <div className="px-6 md:px-12 py-12">
        <p className="text-muted-foreground mb-4">Lezione non trovata o senza esercizi.</p>
        <Link to="/tabata" className="text-primary hover:underline">Torna alle lezioni</Link>
      </div>
    );
  }

  const current = items[liveState?.item_index ?? 0];
  const next = items[(liveState?.item_index ?? 0) + 1];
  const secLeft = liveState
    ? liveState.paused
      ? Math.ceil((liveState.remaining_ms ?? 0) / 1000)
      : liveState.phase_ends_at
        ? Math.max(0, Math.ceil((liveState.phase_ends_at - now) / 1000))
        : 0
    : 0;
  const phase = liveState?.phase ?? "work";
  const isDone = phase === "done";

  return (
    <div className="px-6 md:px-12 py-8 max-w-3xl">
      <Link to="/tabata" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-smooth">
        <ArrowLeft className="h-4 w-4" /> Lezioni Tabata
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl uppercase">{routine?.name ?? "Lezione"}</h1>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
          <Tv className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{tvUrl}</span>
          <Button size="icon" variant="ghost" onClick={copyLink} aria-label="Copia link TV">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className={`rounded-2xl border p-8 text-center mb-6 transition-smooth ${
        isDone ? "bg-card border-border" : phase === "work" ? "bg-primary/10 border-primary" : "bg-accent/10 border-accent"
      }`}>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
          {isDone ? "Lezione completata" : phase === "work" ? "Lavoro" : "Recupero"}
        </p>
        <h2 className="font-display text-4xl uppercase mb-4">{isDone ? "Fine" : current?.name}</h2>
        {!isDone && (
          <p className="font-display text-7xl tabular-nums leading-none mb-4">{fmt(secLeft)}</p>
        )}
        <p className="text-sm text-muted-foreground uppercase tracking-wider">
          Esercizio {(liveState?.item_index ?? 0) + 1} / {items.length}
          {!isDone && next && <> · Prossimo: {next.name}</>}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Button variant="outline" size="lg" onClick={prevItem} disabled={isDone} aria-label="Esercizio precedente">
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button variant="hero" size="lg" onClick={togglePause} disabled={isDone}>
          {liveState?.paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button variant="outline" size="lg" onClick={skip} disabled={isDone} aria-label="Salta fase">
          <SkipForward className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="lg" onClick={restart} aria-label="Ricomincia">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <Button variant="outline" className="w-full hover:!border-destructive hover:!text-destructive" onClick={handleEnd}>
        <Square className="h-4 w-4" /> Termina lezione
      </Button>
    </div>
  );
};

export default TabataController;
