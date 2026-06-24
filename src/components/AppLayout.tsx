import { NavLink, Outlet } from "react-router-dom";
import { Dumbbell, Users, BookOpen, LogOut, ClipboardList, Sun, Moon, Shield, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppRole } from "@/hooks/useAppRole";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const trainerNav = [
  { to: "/", label: "Clienti", icon: Users, end: true },
  { to: "/esercizi", label: "Libreria", icon: BookOpen },
  { to: "/tabata", label: "Tabata", icon: Timer },
];
const clientNav = [
  { to: "/scheda", label: "La mia scheda", icon: ClipboardList, end: true },
  { to: "/esercizi", label: "Libreria", icon: BookOpen },
];

const AppLayout = () => {
  const { user, signOut } = useAuth();
  const role = useAppRole();
  const { theme, toggle } = useTheme();
  const baseNav = role === "client" ? clientNav : trainerNav;
  const navItems = role === "admin"
    ? [...trainerNav, { to: "/admin/utenti", label: "Utenti", icon: Shield }]
    : baseNav;
  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar border-r border-sidebar-border p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Dumbbell className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-wider text-foreground">FORGE</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Trainer Suite</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-smooth",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-display text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" className="justify-start" onClick={toggle} aria-label="Cambia tema">
              {theme === "dark" ? <Sun /> : <Moon />}
              <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={signOut}>
              <LogOut /> Esci
            </Button>
          </div>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between bg-sidebar border-b border-sidebar-border px-5 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-xl tracking-wider">FORGE</h1>
        </div>
        <nav className="flex gap-1 items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "p-2 rounded-md transition-smooth",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          ))}
          <button
            onClick={toggle}
            className="p-2 rounded-md text-muted-foreground hover:text-primary transition-smooth"
            aria-label="Cambia tema"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-md text-muted-foreground hover:text-destructive transition-smooth"
            aria-label="Esci"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </nav>
      </header>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
