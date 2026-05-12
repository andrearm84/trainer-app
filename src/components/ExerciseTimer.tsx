import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, Plus, Minus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  exerciseName: string;
  sets: number;
  reps: string;
  rest: string; // es "60s", "1m30s", "90"
  onComplete?: () => void;
};

// Parse "60s", "1m", "1m30s", "90" -> secondi
const parseRest = (rest: string): number => {
  if (!rest) return 60;
  const s = rest.toLowerCase().replace(/\s/g, "");
  const m = s.match(/(?:(\d+)m)?(?:(\d+)s?)?/);
  if (!m) return 60;
  const min = parseInt(m[1] || "0", 10);
  const sec = parseInt(m[2] || "0", 10);
  const total = min * 60 + sec;
  return total > 0 ? total : 60;
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

// Beep semplice via WebAudio (no asset richiesti)
const beep = (audioCtx: AudioContext, freq = 880, dur = 0.18) => {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  o.type = "sine";
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
};

const ExerciseTimer = ({ open, onOpenChange, exerciseName, sets, reps, rest, onComplete }: Props) => {
  const totalRest = parseRest(rest);
  const [restSec, setRestSec] = useState(totalRest);
  const [secLeft, setSecLeft] = useState(totalRest);
  const [running, setRunning] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<"ready" | "resting" | "done">("ready");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (open) {
      setRestSec(totalRest);
      setSecLeft(totalRest);
      setRunning(false);
      setCurrentSet(1);
      setPhase("ready");
    }
  }, [open, totalRest]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          // Fine recupero
          if (audioRef.current) {
            beep(audioRef.current, 1200, 0.2);
            setTimeout(() => audioRef.current && beep(audioRef.current, 1600, 0.25), 250);
          }
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
          setRunning(false);
          setPhase("ready");
          // Avanza serie
          setCurrentSet((cs) => {
            if (cs >= sets) {
              setPhase("done");
              return cs;
            }
            return cs + 1;
          });
          return restSec;
        }
        // Tick a 3-2-1
        if (s <= 4 && audioRef.current) beep(audioRef.current, 700, 0.08);
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, restSec, sets]);

  const ensureAudio = () => {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
    }
    if (audioRef.current?.state === "suspended") audioRef.current.resume();
  };

  const startRest = () => {
    ensureAudio();
    setPhase("resting");
    setSecLeft(restSec);
    setRunning(true);
  };

  const skipRest = () => {
    setRunning(false);
    setSecLeft(restSec);
    setPhase("ready");
    if (currentSet >= sets) setPhase("done");
    else setCurrentSet((c) => Math.min(c + 1, sets));
  };

  const finish = () => {
    onComplete?.();
    onOpenChange(false);
  };

  const progress = phase === "resting" ? ((restSec - secLeft) / restSec) * 100 : 0;
  const adjustRest = (delta: number) => {
    const nv = Math.max(10, Math.min(600, restSec + delta));
    setRestSec(nv);
    if (!running) setSecLeft(nv);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide text-xl">{exerciseName}</DialogTitle>
        </DialogHeader>

        {/* Serie counter */}
        <div className="text-center py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">Serie</p>
          <p className="font-display text-6xl text-primary leading-none">
            {currentSet}<span className="text-muted-foreground text-3xl">/{sets}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">{reps} ripetizioni</p>
        </div>

        {/* Timer */}
        <div className="bg-card/40 border border-border rounded-2xl p-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            {phase === "resting" ? "Recupero in corso" : phase === "done" ? "Esercizio completato" : "Pronto per la serie"}
          </p>
          <p className={`font-display text-5xl leading-none mb-4 tabular-nums ${
            phase === "resting" ? "text-accent" : "text-foreground"
          }`}>
            {fmt(secLeft)}
          </p>
          <Progress value={progress} className="h-2 mb-4" />

          {/* Adjust rest */}
          {phase !== "done" && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => adjustRest(-15)} disabled={running}>
                <Minus className="h-3 w-3" /> 15s
              </Button>
              <span className="text-xs uppercase tracking-wider text-muted-foreground px-2">
                Recupero {fmt(restSec)}
              </span>
              <Button size="sm" variant="outline" onClick={() => adjustRest(15)} disabled={running}>
                <Plus className="h-3 w-3" /> 15s
              </Button>
            </div>
          )}

          {/* Controls */}
          {phase === "ready" && (
            <Button variant="hero" size="lg" className="w-full" onClick={startRest}>
              <Play className="h-5 w-5" /> Serie fatta — Avvia recupero
            </Button>
          )}
          {phase === "resting" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => setRunning((r) => !r)}>
                {running ? <><Pause className="h-4 w-4" /> Pausa</> : <><Play className="h-4 w-4" /> Riprendi</>}
              </Button>
              <Button variant="secondary" size="lg" onClick={skipRest}>
                <SkipForward className="h-4 w-4" /> Salta
              </Button>
            </div>
          )}
          {phase === "done" && (
            <Button variant="hero" size="lg" className="w-full" onClick={finish}>
              <CheckCircle2 className="h-5 w-5" /> Segna come completato
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCurrentSet(1); setPhase("ready"); setSecLeft(restSec); setRunning(false); }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Suono e vibrazione a fine recupero
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseTimer;
