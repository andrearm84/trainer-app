import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Target, Calendar, Plus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useTrainerData";
import { useAppRole } from "@/hooks/useAppRole";
import ClientFormDialog from "@/components/ClientFormDialog";
import heroImg from "@/assets/hero-gym.jpg";

const levelStyles: Record<string, string> = {
  Principiante: "bg-accent/15 text-accent border-accent/30",
  Intermedio: "bg-primary/15 text-primary border-primary/30",
  Avanzato: "bg-destructive/15 text-destructive border-destructive/30",
};

const Clients = () => {
  const role = useAppRole();
  const { data: clients, isLoading } = useClients();
  const [open, setOpen] = useState(false);

  if (role === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (role === "client") return <Navigate to="/scheda" replace />;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImg}
          alt="Palestra dark con luci al neon arancioni"
          width={1536}
          height={1024}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="relative px-6 md:px-12 py-14 md:py-20 max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
            Personal Trainer Workspace
          </p>
          <h1 className="font-display text-5xl md:text-7xl uppercase leading-[0.95] mb-5">
            I tuoi <span className="text-gradient-primary">clienti</span>,
            <br />
            le loro schede.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            Crea, modifica e gestisci le schede di allenamento di tutti i tuoi atleti da un'unica dashboard.
          </p>
          <Button variant="hero" size="xl" onClick={() => setOpen(true)}>
            <Plus /> Nuovo cliente
          </Button>
        </div>
      </section>

      <section className="px-6 md:px-12 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl uppercase">Atleti attivi</h2>
            <p className="text-muted-foreground mt-1">
              {clients?.length ?? 0} clienti in programma
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !clients || clients.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-5">Nessun cliente ancora. Inizia ad aggiungerne uno!</p>
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus /> Aggiungi il primo cliente
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                to={`/clienti/${client.id}`}
                className="group relative bg-gradient-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/50 hover:shadow-glow transition-smooth"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-display text-2xl text-primary">
                      {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display text-xl leading-tight">{client.name}</h3>
                      <span
                        className={`inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${levelStyles[client.level]}`}
                      >
                        {client.level}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth" />
                </div>

                <div className="space-y-2.5 text-sm">
                  {client.goal && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-foreground truncate">{client.goal}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    Dal {new Date(client.started_at).toLocaleDateString("it-IT")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ClientFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Clients;
