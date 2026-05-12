import { supabase } from "@/integrations/supabase/client";
import type { Exercise } from "@/hooks/useTrainerData";
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/lib/youtube";
import { Play } from "lucide-react";

const publicUrl = (bucket: string, path: string | null) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

interface Props {
  exercise: Exercise;
  className?: string;
  /** Se true e c'è solo l'immagine, mostra un pulsante play sopra */
  compact?: boolean;
}

/**
 * Mostra il media migliore per un esercizio:
 * priorità: video uploadato > YouTube embed > immagine
 */
const ExerciseMedia = ({ exercise, className = "", compact = false }: Props) => {
  const videoFile = publicUrl("exercise-videos", exercise.video_path);
  const ytEmbed = getYouTubeEmbedUrl(exercise.video_url);
  const ytThumb = getYouTubeThumbnail(exercise.video_url);
  const image = publicUrl("exercise-images", exercise.image_path);

  if (videoFile) {
    return (
      <video
        src={videoFile}
        controls
        playsInline
        preload="metadata"
        className={`w-full bg-black rounded-lg ${className}`}
      />
    );
  }

  if (ytEmbed) {
    return (
      <div className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`} style={{ aspectRatio: "16/9" }}>
        <iframe
          src={ytEmbed}
          title={exercise.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  const thumb = image ?? ytThumb;
  if (thumb) {
    return (
      <div className={`relative w-full overflow-hidden rounded-lg bg-secondary ${className}`} style={{ aspectRatio: "16/9" }}>
        <img src={thumb} alt={exercise.name} className="absolute inset-0 w-full h-full object-cover" />
        {compact && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <Play className="h-10 w-10 text-foreground/80" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-lg bg-secondary border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm ${className}`}
      style={{ aspectRatio: "16/9" }}
    >
      Nessun video o immagine
    </div>
  );
};

export default ExerciseMedia;
