import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Trash2, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useExercise } from "@/hooks/useTrainerData";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQueryClient } from "@tanstack/react-query";
import ExerciseMedia from "@/components/ExerciseMedia";
import ExerciseFormDialog from "@/components/ExerciseFormDialog";

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin = false } = useIsAdmin();
  const qc = useQueryClient();
  const { data: exercise, isLoading } = useExercise(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground mb-4">Esercizio non trovato.</p>
        <Link to="/esercizi" className="text-primary hover:underline">Torna alla libreria</Link>
      </div>
    );
  }

  const isOwn = exercise.trainer_id === user?.id;
  const isPreset = exercise.trainer_id === null;
  const canEdit = isOwn || (isPreset && isAdmin);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // pulizia file storage
      if (exercise.image_path) {
        await supabase.storage.from("exercise-images").remove([exercise.image_path]);
      }
      if (exercise.video_path) {
        await supabase.storage.from("exercise-videos").remove([exercise.video_path]);
      }
      const { error } = await supabase.from("exercises").delete().eq("id", exercise.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Esercizio eliminato");
      navigate("/esercizi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 md:px-12 py-8 max-w-4xl">
      <Link
        to="/esercizi"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-smooth"
      >
        <ArrowLeft className="h-4 w-4" /> Libreria esercizi
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> {exercise.muscle_group}
            </span>
            {isPreset && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Preset
              </span>
            )}
            {isOwn && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                Custom
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl uppercase leading-none">
            {exercise.name}
          </h1>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Modifica
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="hover:!border-destructive hover:!text-destructive">
                  <Trash2 />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare {exercise.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Operazione irreversibile. Eventuali schede che usano questo esercizio non potranno essere eliminate finché non rimuovi prima i suoi utilizzi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="animate-spin" />} Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isPreset && !isAdmin && (
        <p className="text-sm text-muted-foreground mb-6 p-3 rounded-lg bg-muted/40 border border-border">
          Questo è un esercizio condiviso. Per aggiungere video o descrizioni personalizzate, crea una tua versione dalla libreria.
        </p>
      )}

      <ExerciseMedia exercise={exercise} className="mb-8 shadow-elevated" />

      {exercise.description && (
        <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="font-display text-xl uppercase mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Esecuzione
          </h2>
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {exercise.description}
          </p>
        </div>
      )}

      <ExerciseFormDialog open={editOpen} onOpenChange={setEditOpen} exercise={exercise} />
    </div>
  );
};

export default ExerciseDetail;
