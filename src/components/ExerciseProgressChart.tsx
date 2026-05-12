import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { useExerciseHistory } from "@/hooks/useClientStats";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workoutItemId: string | null;
  exerciseName: string;
};

// Estrae il primo numero da "60kg", "60 kg", "60", "12.5" -> number | null
const numFromWeight = (w: string | null | undefined): number | null => {
  if (!w) return null;
  const m = String(w).replace(",", ".").match(/(-?\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

const ExerciseProgressChart = ({ open, onOpenChange, workoutItemId, exerciseName }: Props) => {
  const { data: logs = [], isLoading } = useExerciseHistory(workoutItemId ?? undefined);

  const chartData = useMemo(() => {
    return logs
      .map((l) => ({
        date: l.log_date,
        label: new Date(l.log_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
        weight: numFromWeight(l.weight),
      }))
      .filter((d) => d.weight !== null) as { date: string; label: string; weight: number }[];
  }, [logs]);

  const max = chartData.reduce((a, b) => (b.weight > a ? b.weight : a), 0);
  const min = chartData.reduce((a, b) => (b.weight < a ? b.weight : a), Infinity);
  const delta = chartData.length >= 2 ? chartData[chartData.length - 1].weight - chartData[0].weight : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> {exerciseName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nessun dato di carico ancora registrato per questo esercizio.
            <p className="text-xs mt-2">Inserisci il peso usato (es. "60kg") per vedere il grafico.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Stat label="Sessioni" value={chartData.length} />
              <Stat label="Max" value={`${max}`} />
              <Stat label="Δ" value={`${delta >= 0 ? "+" : ""}${delta}`} tone={delta >= 0 ? "up" : "down"} />
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[Math.max(0, min - 5), max + 5]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: "up" | "down" }) => (
  <div className="bg-background/40 border border-border rounded-lg py-2 text-center">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`font-display text-xl ${tone === "up" ? "text-accent" : tone === "down" ? "text-destructive" : "text-primary"}`}>
      {value}
    </p>
  </div>
);

export default ExerciseProgressChart;
