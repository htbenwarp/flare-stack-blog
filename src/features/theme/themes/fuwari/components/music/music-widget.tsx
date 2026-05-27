import { useMusic } from "./music-provider";
import { Music, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MusicWidget({ onClick }: { onClick: () => void }) {
  const { isPlaying, playlist, currentIndex } = useMusic();
  const track = playlist[currentIndex];

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
        "bg-(--fuwari-card-bg)/80 backdrop-blur-xl",
        "border border-(--fuwari-primary)/20",
        "shadow-lg shadow-black/10 dark:shadow-black/30",
        "flex items-center justify-center",
        "transition-all duration-300 hover:scale-110 active:scale-95",
        isPlaying && "ring-2 ring-(--fuwari-primary)/30 animate-pulse"
      )}
      aria-label="Music"
    >
      {isPlaying && track ? (
        <Disc3
          size={26}
          className="text-(--fuwari-primary) animate-spin"
          style={{ animationDuration: "3s" }}
        />
      ) : (
        <Music size={24} className="text-(--fuwari-primary)" />
      )}
    </button>
  );
}