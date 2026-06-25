import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Tv, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPublicTabataRoutine, tabataChannelName,
  type PublicTabataRoutine, type TabataLiveState,
} from "@/hooks/useTabataData";

const fmt = (totalSec: number) => {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

// Browser audio richiede una sblocco esplicito da gesture utente, quindi
// AudioContext/SpeechSynthesis sono condivisi e vengono "risvegliati" al primo tap.
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
};

const playBeep = (freq: number) => {
  const ctx = getAudioCtx();
  // Il browser sospende l'AudioContext quando la pagina va in background (es. tablet
  // che si blocca): senza una resume esplicita qui, i beep restano muti finché non si
  // tocca di nuovo lo schermo.
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.35;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

const speak = (text: string) => {
  if (!("speechSynthesis" in window)) return;
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
};

// Lavoro = energia arancione accesa (in linea con il colore primario dell'app), recupero = stessa famiglia ma più tenue
const PHASE = {
  work: {
    text: "text-orange-300",
    ring: "ring-orange-400/60",
    glow: "shadow-[0_0_90px_-10px_rgba(251,146,60,0.7)]",
    bgGlow: "bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(251,146,60,0.28),transparent_70%)]",
    badge: "border-orange-400/40 text-orange-300 bg-orange-400/10",
    dot: "bg-orange-400 shadow-[0_0_12px_3px_rgba(251,146,60,0.8)]",
    textShadow: "[text-shadow:0_0_35px_rgba(251,146,60,0.6)]",
  },
  rest: {
    text: "text-orange-200",
    ring: "ring-orange-200/30",
    glow: "shadow-[0_0_50px_-15px_rgba(254,215,170,0.35)]",
    bgGlow: "bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(254,215,170,0.12),transparent_70%)]",
    badge: "border-orange-200/30 text-orange-200 bg-orange-200/10",
    dot: "bg-orange-200",
    textShadow: "",
  },
} as const;

const ExerciseTable = ({ items }: { items: PublicTabataRoutine["items"] }) => (
  <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur overflow-hidden shadow-[0_0_50px_-20px_rgba(0,0,0,0.9)]">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest">
          <th className="px-4 py-3 w-14">#</th>
          <th className="px-4 py-3">Esercizio</th>
          <th className="px-4 py-3 text-right">Lavoro</th>
          <th className="px-4 py-3 text-right">Recupero</th>
          <th className="px-4 py-3 text-right">Round</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={item.position} className="border-t border-white/5">
            <td className="px-4 py-3 tabular-nums font-bold text-zinc-500">{idx + 1}</td>
            <td className="px-4 py-3 uppercase font-bold text-zinc-300">{item.name}</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-500">{item.work_seconds}s</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-500">{item.rest_seconds}s</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-500">x{item.rounds}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SoundUnlockHint = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-400/40 text-orange-300 bg-orange-400/10 backdrop-blur text-sm font-bold uppercase tracking-widest animate-pulse"
  >
    <Volume2 className="h-4 w-4" />
    Tocca per attivare l'audio
  </button>
);

const Brand = () => (
  <div className="flex items-center gap-3">
    <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_12px_3px_rgba(251,146,60,0.8)]" />
    <p className="font-display font-bold text-lg md:text-xl uppercase tracking-[0.4em] text-white">
      Training Space
    </p>
    <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_12px_3px_rgba(251,146,60,0.8)]" />
  </div>
);

const TabataDisplay = () => {
  const { routineId } = useParams();
  const [routine, setRoutine] = useState<PublicTabataRoutine | null | undefined>(undefined);
  const [liveState, setLiveState] = useState<TabataLiveState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [soundReady, setSoundReady] = useState(false);
  const lastBeepKeyRef = useRef<string | null>(null);
  const lastAnnouncedKeyRef = useRef<string | null>(null);

  const enableSound = () => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    setSoundReady(true);
  };

  useEffect(() => {
    if (!routineId) return;
    fetchPublicTabataRoutine(routineId).then(setRoutine).catch(() => setRoutine(null));
  }, [routineId]);

  useEffect(() => {
    if (!routineId) return;
    const channel = supabase.channel(tabataChannelName(routineId));
    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      setLiveState(payload as TabataLiveState);
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "request-sync", payload: {} });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [routineId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Quando il dispositivo si risveglia da standby/tab in background, il countdown si
  // auto-corregge subito (si basa su un timestamp assoluto), ma l'AudioContext resta
  // sospeso finché non lo riprendiamo esplicitamente: altrimenti i beep restano muti.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      if (sharedAudioCtx?.state === "suspended") sharedAudioCtx.resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const secLeft = liveState
    ? liveState.paused
      ? Math.ceil((liveState.remaining_ms ?? 0) / 1000)
      : liveState.phase_ends_at
        ? Math.max(0, Math.ceil((liveState.phase_ends_at - now) / 1000))
        : 0
    : 0;

  // Beep negli ultimi 3 secondi di lavoro o recupero (vale sia per il countdown
  // che porta alla partenza del prossimo esercizio sia per quello di fine).
  useEffect(() => {
    if (!soundReady || !liveState || liveState.paused || liveState.phase === "done") return;
    if (secLeft <= 0 || secLeft > 3) return;
    const key = `${liveState.item_index}-${liveState.phase}-${secLeft}`;
    if (lastBeepKeyRef.current === key) return;
    lastBeepKeyRef.current = key;
    playBeep(secLeft === 1 ? 1046 : 784);
  }, [soundReady, secLeft, liveState?.item_index, liveState?.phase, liveState?.paused]);

  // Annuncio vocale al cambio di fase (lavoro/recupero/fine).
  useEffect(() => {
    if (!soundReady || !liveState || liveState.paused) return;
    const key = `${liveState.item_index}-${liveState.phase}`;
    if (lastAnnouncedKeyRef.current === key) return;
    lastAnnouncedKeyRef.current = key;
    if (liveState.phase === "work") speak("Start");
    else if (liveState.phase === "rest") speak("Rest");
    else if (liveState.phase === "done") speak("Stop");
  }, [soundReady, liveState?.item_index, liveState?.phase, liveState?.paused]);

  if (routine === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080c]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (routine === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080c] text-center px-6">
        <div>
          <Tv className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
          <p className="text-2xl font-display font-bold uppercase text-zinc-400">Lezione non trovata</p>
        </div>
      </div>
    );
  }

  const items = routine.items;

  if (!liveState) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#06080c]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className="relative flex flex-col items-center px-6 md:px-12 py-10 gap-10">
          <Brand />
          <div className="flex flex-col items-center text-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
            <p className="text-2xl font-display font-bold uppercase text-white">In attesa del trainer…</p>
            <p className="text-sm text-zinc-400 font-semibold">{routine.routine_name}</p>
          </div>
          <ExerciseTable items={items} />
        </div>
        {!soundReady && <SoundUnlockHint onClick={enableSound} />}
      </div>
    );
  }

  const isDone = liveState.phase === "done";
  const isWork = liveState.phase === "work";
  const phaseKey = isWork ? "work" : "rest";
  const colors = PHASE[phaseKey];
  const currentItem = items[liveState.item_index];

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
            <p className="text-lg md:text-xl text-zinc-400 uppercase tracking-widest font-bold">{routine.routine_name}</p>
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
                Esercizio {liveState.item_index + 1} / {items.length}
                {currentItem && currentItem.rounds > 1 && <> · Round {liveState.round}/{currentItem.rounds}</>}
              </p>
            </div>

            <ExerciseTable items={items} />
          </div>
        )}
      </div>
      {!soundReady && <SoundUnlockHint onClick={enableSound} />}
    </div>
  );
};

export default TabataDisplay;
