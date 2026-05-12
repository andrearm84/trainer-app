import { useMemo } from "react";
import { Flame, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { useClientAllLogs } from "@/hooks/useClientStats";

type Props = { clientId: string };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const ClientStatsCard = ({ clientId }: Props) => {
  const { data: logs = [] } = useClientAllLogs(clientId);

  const stats = useMemo(() => {
    const completedLogs = logs.filter((l) => l.completed);
    // Sessioni distinte = giorni distinti con almeno un log completato
    const days = new Set(completedLogs.map((l) => l.log_date));
    const sessions = days.size;

    // Streak settimanale: numero di settimane consecutive (terminanti questa settimana) con almeno una sessione
    const weekKey = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const dow = (x.getDay() + 6) % 7; // lun=0
      x.setDate(x.getDate() - dow);
      return isoDay(x);
    };
    const weeks = new Set(Array.from(days).map((s) => weekKey(new Date(s))));
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const k = weekKey(cursor);
      if (weeks.has(k)) { streak += 1; cursor.setDate(cursor.getDate() - 7); }
      else break;
    }

    // Ultima sessione
    const lastDate = days.size > 0 ? Array.from(days).sort().pop()! : null;

    // Sessioni questa settimana
    const thisWeek = weekKey(new Date());
    const thisWeekCount = new Set(
      completedLogs
        .filter((l) => weekKey(new Date(l.log_date)) === thisWeek)
        .map((l) => l.log_date)
    ).size;

    return { sessions, streak, lastDate, thisWeekCount };
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Stat icon={CheckCircle2} label="Sessioni totali" value={stats.sessions} tone="primary" />
      <Stat icon={Flame} label="Streak settimanale" value={`${stats.streak}🔥`} tone="accent" />
      <Stat icon={TrendingUp} label="Questa settimana" value={stats.thisWeekCount} tone="primary" />
      <Stat
        icon={Calendar}
        label="Ultima"
        value={stats.lastDate ? new Date(stats.lastDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "—"}
        tone="muted"
      />
    </div>
  );
};

const Stat = ({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: string | number; tone: "primary" | "accent" | "muted" }) => (
  <div className="bg-gradient-card border border-border rounded-xl p-3 shadow-card">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`h-3.5 w-3.5 ${
        tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-muted-foreground"
      }`} />
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
    <p className={`font-display text-2xl leading-none ${
      tone === "accent" ? "text-accent" : "text-foreground"
    }`}>{value}</p>
  </div>
);

export default ClientStatsCard;
