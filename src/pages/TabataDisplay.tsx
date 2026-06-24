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

// Lavoro = energia neon (ciano acceso), recupero = stessa famiglia ma più tenue
const PHASE = {
  work: {
    text: "text-cyan-300",
    ring: "ring-cyan-400/60",
    glow: "shadow-[0_0_90px_-10px_rgba(34,211,238,0.7)]",
    bgGlow: "bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(34,211,238,0.28),transparent_70%)]",
    badge: "border-cyan-400/40 text-cyan-300 bg-cyan-400/10",
    dot: "bg-cyan-400 shadow-[0_0_12px_3px_rgba(34,211,238,0.8)]",
    textShadow: "[text-shadow:0_0_35px_rgba(34,211,238,0.6)]",
  },
  rest: {
    text: "text-sky-200",
    ring: "ring-sky-300/30",
    glow: "shadow-[0_0_50px_-15px_rgba(125,211,252,0.35)]",
    bgGlow: "bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(125,211,252,0.12),transparent_70%)]",
    badge: "border-sky-300/30 text-sky-200 bg-sky-300/10",
    dot: "bg-sky-300",
    textShadow: "",
  },
} as const;

const ExerciseTable = ({ items }: { items: PublicTabataSession["items"] }) => (
  <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur overflow-hidden shadow-[0_0_50px_-20px_rgba(0,0,0,0.9)]">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest">
          <th className="px-4 py-3 w-14">#</th>
          <th className="px-4 py-3">Esercizio</th>
          <th className="px-4 py-3 text-right">Lavoro</th>
          <th className="px-4 py-3 text-right">Recupero</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={item.position} className="border-t border-white/5">
            <td className="px-4 py-3 tabular-nums font-bold text-zinc-500">{idx + 1}</td>
            <td className="px-4 py-3 uppercase font-bold text-zinc-300">{item.name}</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-500">{item.work_seconds}s</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-500">{item.rest_seconds}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Brand = () => (
  <div className="flex items-center gap-3">
    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_3px_rgba(34,211,238,0.8)]" />
    <p className="font-display font-bold text-lg md:text-xl uppercase tracking-[0.4em] text-white">
      Training Space
    </p>
    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_3px_rgba(34,211,238,0.8)]" />
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
      <div className="min-h-screen flex items-center justify-center bg-[#06080c]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080c] text-center px-6">
        <div>
          <Tv className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
          <p className="text-2xl font-display font-bold uppercase text-zinc-400">Lezione non trovata</p>
        </div>
      </div>
    );
  }

  const items = session.items;

  if (!liveState) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#06080c]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className="relative flex flex-col items-center px-6 md:px-12 py-10 gap-10">
          <Brand />
          <div className="flex flex-col items-center text-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-2xl font-display font-bold uppercase text-white">In attesa del trainer…</p>
            <p className="text-sm text-zinc-400 font-semibold">{session.routine_name}</p>
          </div>
          <ExerciseTable items={items} />
        </div>
      </div>
    );
  }

  const isDone = liveState.phase === "done";
  const isWork = liveState.phase === "work";
  const phaseKey = isWork ? "work" : "rest";
  const colors = PHASE[phaseKey];

  const secLeft = liveState.paused
    ? Math.ceil((liveState.remaining_ms ?? 0) / 1000)
    : liveState.phase_ends_at
      ? Math.max(0, Math.ceil((liveState.phase_ends_at - now) / 1000))
      : 0;

  const pulsing = !isDone && secLeft <= 3 && secLeft > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06080c] transition-smooth">
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDone ? "bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.08),transparent_70%)]" : colors.bgGlow
        }`}
      />
      <div className="relative flex flex-col items-center px-6 md:px-12 py-10 gap-10">
        <Brand />

        {isDone ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <p className="font-display font-bold text-5xl md:text-7xl uppercase text-white [text-shadow:0_2px_30px_rgba(255,255,255,0.2)]">
              Lezione completata
            </p>
            <p className="text-lg md:text-xl text-zinc-400 uppercase tracking-widest font-bold">{session.routine_name}</p>
            <ExerciseTable items={items} />
          </div>
        ) : (
          <div className="flex-1 w-full max-w-6xl flex flex-col landscape:flex-row items-center landscape:items-start justify-center gap-10">
            <div className="flex flex-col items-center text-center landscape:w-[400px] shrink-0">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm md:text-base font-bold uppercase tracking-[0.25em] mb-4 ${
                liveState.paused ? "border-zinc-500/40 text-zinc-300 bg-zinc-500/10" : colors.badge
              }`}>
                <span className={`h-2 w-2 rounded-full ${liveState.paused ? "bg-zinc-400" : colors.dot}`} />
                {liveState.paused ? "In pausa" : isWork ? "Lavoro" : "Recupero"}
              </span>

              <div className={`relative rounded-[2rem] border border-white/10 bg-black/40 px-10 py-8 ring-2 ${colors.ring} ${colors.glow} mt-2`}>
                <p
                  className={`font-display font-bold portrait:text-[22vh] landscape:text-[16vh] leading-none tabular-nums ${
                    pulsing ? "animate-pulse" : ""
                  } ${colors.text} ${colors.textShadow}`}
                >
                  {fmt(secLeft)}
                </p>
              </div>

              <p className="mt-6 inline-flex items-center gap-2 text-sm md:text-base font-bold uppercase tracking-widest text-zinc-300 border border-white/10 rounded-full px-4 py-1.5 bg-white/5">
                Round {liveState.item_index + 1} / {items.length}
              </p>
            </div>

            <ExerciseTable items={items} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TabataDisplay;
