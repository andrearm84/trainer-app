import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Upload, X, Youtube, Video as VideoIcon, ImageIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCreateExercise, useUpdateExercise, MUSCLE_GROUPS,
  type Exercise, type MuscleGroup,
} from "@/hooks/useTrainerData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getYouTubeId } from "@/lib/youtube";

const schema = z.object({
  name: z.string().trim().min(1, "Nome richiesto").max(80),
  muscle_group: z.enum([
    "Petto","Schiena","Spalle","Bicipiti","Tricipiti","Gambe","Glutei","Core","Cardio",
  ]),
  description: z.string().trim().max(2000).nullable(),
  video_url: z.string().trim().max(500).nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  exercise?: Exercise | null;
}

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 100;

const publicUrl = (bucket: string, path: string | null) => {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const ExerciseFormDialog = ({ open, onOpenChange, exercise }: Props) => {
  const isEdit = !!exercise;
  const isPreset = isEdit && exercise!.trainer_id === null;
  const { data: isAdmin = false } = useIsAdmin();
  const create = useCreateExercise();
  const update = useUpdateExercise();

  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("Petto");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);

  useEffect(() => {
    if (open) {
      setName(exercise?.name ?? "");
      setGroup((exercise?.muscle_group as MuscleGroup) ?? "Petto");
      setDescription(exercise?.description ?? "");
      setVideoUrl(exercise?.video_url ?? "");
      setImagePath(exercise?.image_path ?? null);
      setVideoPath(exercise?.video_path ?? null);
    }
  }, [open, exercise]);

  const handleUpload = async (file: File, kind: "image" | "video") => {
    const bucket = kind === "image" ? "exercise-images" : "exercise-videos";
    const maxMB = kind === "image" ? MAX_IMAGE_MB : MAX_VIDEO_MB;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File troppo grande (max ${maxMB}MB)`);
      return;
    }
    const allowed = kind === "image"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.type)) {
      toast.error(kind === "image" ? "Formato: JPG, PNG, WEBP" : "Formato: MP4, WEBM, MOV");
      return;
    }

    setUploading(kind);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const ext = file.name.split(".").pop() ?? "bin";
      // Per i preset (admin) salva sotto presets/, altrimenti sotto user.id (richiesto da RLS)
      const folder = isPreset && isAdmin ? "presets" : user.id;
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      if (kind === "image") setImagePath(path);
      else setVideoPath(path);
      toast.success(kind === "image" ? "Immagine caricata" : "Video caricato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (kind: "image" | "video") => {
    const bucket = kind === "image" ? "exercise-images" : "exercise-videos";
    const path = kind === "image" ? imagePath : videoPath;
    if (!path) return;
    await supabase.storage.from(bucket).remove([path]);
    if (kind === "image") setImagePath(null);
    else setVideoPath(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      muscle_group: group,
      description: description.trim() ? description : null,
      video_url: videoUrl.trim() ? videoUrl : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.video_url && !getYouTubeId(parsed.data.video_url)) {
      toast.error("Link YouTube non valido");
      return;
    }

    try {
      const payload = {
        name: parsed.data.name,
        muscle_group: parsed.data.muscle_group as MuscleGroup,
        description: parsed.data.description,
        video_url: parsed.data.video_url,
        image_path: imagePath,
        video_path: videoPath,
      };
      if (isEdit) {
        await update.mutateAsync({ id: exercise!.id, ...payload });
        toast.success("Esercizio aggiornato");
      } else {
        await create.mutateAsync(payload);
        toast.success("Esercizio creato");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore salvataggio");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">
            {isEdit ? "Modifica esercizio" : "Nuovo esercizio"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div>
              <Label>Gruppo muscolare</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as MuscleGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrizione tecnica</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Esecuzione, errori comuni, tips..."
              maxLength={2000}
              rows={4}
            />
          </div>

          {/* Immagine */}
          <div>
            <Label className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Immagine anteprima</Label>
            {imagePath ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={publicUrl("exercise-images", imagePath)!}
                  alt="anteprima"
                  className="w-full h-40 object-cover"
                />
                <Button
                  type="button" size="icon" variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleRemoveFile("image")}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <UploadButton
                accept="image/jpeg,image/png,image/webp"
                loading={uploading === "image"}
                onFile={(f) => handleUpload(f, "image")}
                label="Carica immagine (max 5MB)"
              />
            )}
          </div>

          {/* YouTube */}
          <div>
            <Label className="flex items-center gap-2"><Youtube className="h-3.5 w-3.5" /> Link YouTube</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              maxLength={500}
            />
          </div>

          {/* Upload video */}
          <div>
            <Label className="flex items-center gap-2"><VideoIcon className="h-3.5 w-3.5" /> Oppure carica un tuo video</Label>
            {videoPath ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <video src={publicUrl("exercise-videos", videoPath)!} controls className="w-full max-h-56" />
                <Button
                  type="button" size="icon" variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleRemoveFile("video")}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <UploadButton
                accept="video/mp4,video/webm,video/quicktime"
                loading={uploading === "video"}
                onFile={(f) => handleUpload(f, "video")}
                label="Carica video (max 100MB, MP4/WEBM/MOV)"
              />
            )}
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy || !!uploading}>
            {busy && <Loader2 className="animate-spin" />}
            {isEdit ? "Salva modifiche" : "Crea esercizio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block ${className}`}>
    {children}
  </label>
);

interface UploadBtnProps {
  accept: string;
  loading: boolean;
  label: string;
  onFile: (f: File) => void;
}
const UploadButton = ({ accept, loading, label, onFile }: UploadBtnProps) => (
  <label className={`flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-smooth cursor-pointer ${loading ? "opacity-60 pointer-events-none" : ""}`}>
    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
    <span className="text-sm text-muted-foreground">{label}</span>
    <input
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
    />
  </label>
);

export default ExerciseFormDialog;
