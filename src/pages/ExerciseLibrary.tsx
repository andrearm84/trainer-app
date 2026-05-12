import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Loader2, Youtube, Video as VideoIcon, ImageIcon, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useExercises, MUSCLE_GROUPS, type MuscleGroup, type Exercise,
} from "@/hooks/useTrainerData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeThumbnail } from "@/lib/youtube";
import ExerciseFormDialog from "@/components/ExerciseFormDialog";

const thumbFor = (ex: Exercise): string | null => {
  if (ex.image_path) {
    return supabase.storage.from("exercise-images").getPublicUrl(ex.image_path).data.publicUrl;
  }
  if (ex.video_url) return getYouTubeThumbnail(ex.video_url);
  return null;
};

const ExerciseLibrary = () => {
  const { data: exercises = [], isLoading } = useExercises();
  const { data: isAdmin = false } = useIsAdmin();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "Tutti">("Tutti");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "Tutti" || e.muscle_group === filter;
      return matchesSearch && matchesFilter;
    });
  }, [exercises, search, filter]);

  return (
    <div className="px-6 md:px-12 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl uppercase leading-none">
            Libreria <span className="text-gradient-primary">esercizi</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              {exercises.length} esercizi disponibili
            </p>
            {isAdmin && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/40 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
        </div>

        <Button variant="hero" onClick={() => setOpen(true)}>
          <Plus /> Nuovo esercizio
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca esercizio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["Tutti", ...MUSCLE_GROUPS] as const).map((g) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold border transition-smooth ${
                filter === g
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => {
            const thumb = thumbFor(ex);
            const hasYouTube = !!ex.video_url;
            const hasVideo = !!ex.video_path;
            const hasImage = !!ex.image_path;

            return (
              <Link
                key={ex.id}
                to={`/esercizi/${ex.id}`}
                className="group bg-gradient-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-glow transition-smooth flex flex-col"
              >
                <div className="relative aspect-video bg-secondary overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={ex.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                      <span className="font-display text-5xl uppercase text-primary/20">
                        {ex.muscle_group.slice(0, 3)}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    {hasVideo && (
                      <span className="bg-background/80 backdrop-blur text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                        <VideoIcon className="h-3 w-3" /> Video
                      </span>
                    )}
                    {hasYouTube && !hasVideo && (
                      <span className="bg-background/80 backdrop-blur text-destructive text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                        <Youtube className="h-3 w-3" /> YT
                      </span>
                    )}
                    {hasImage && !hasVideo && !hasYouTube && (
                      <span className="bg-background/80 backdrop-blur text-accent text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Foto
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display text-lg uppercase leading-tight mb-1 line-clamp-2">
                    {ex.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                      {ex.muscle_group}
                    </span>
                    {ex.trainer_id && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12">
              Nessun esercizio trovato
            </p>
          )}
        </div>
      )}

      <ExerciseFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default ExerciseLibrary;
