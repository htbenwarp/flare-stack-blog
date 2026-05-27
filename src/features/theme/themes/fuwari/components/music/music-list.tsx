import { useState } from "react";
import { useMusic } from "./music-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Play, Pause, ChevronDown, ChevronUp } from "lucide-react";

export function MusicList({ compact = false }: { compact?: boolean }) {
  const { playlist, currentIndex, playTrack, isPlaying, togglePlay } = useMusic();
  const [expanded, setExpanded] = useState(false);
  const currentTrack = playlist[currentIndex];

  if (playlist.length === 0) return null;

  return (
    <div className="fuwari-card-base pb-4 transition-all duration-300">
      {/* 标题区域：与 SiteInfo 完全一致 */}
      <div
        className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        <span>{m.music_playlist_title?.() ?? "歌单"}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* 常驻迷你播放器：仅在播放中或有当前歌曲时显示 */}
      {currentTrack && (
        <div className="px-4 py-1">
          <div className="flex items-center gap-3 bg-(--fuwari-card-bg) rounded-lg p-2 border border-(--fuwari-primary)/10">
            <img
              src={currentTrack.cover || "/images/music-placeholder.png"}
              alt=""
              className="h-10 w-10 rounded-md object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{currentTrack.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2 rounded-full bg-(--fuwari-primary) text-white hover:opacity-90"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* 可折叠歌单列表 */}
      {expanded && (
        <ul className="space-y-1 px-4 pt-2 max-h-60 overflow-y-auto">
          {playlist.map((track, i) => (
            <li
              key={i}
              onClick={() => playTrack(i)}
              className={cn(
                "flex items-center gap-2 px-2 py-2 cursor-pointer rounded-lg transition-colors",
                "hover:bg-(--fuwari-primary)/10",
                i === currentIndex && "bg-(--fuwari-primary)/15 text-(--fuwari-primary)"
              )}
            >
              <span className="w-6 text-center text-xs text-muted-foreground">
                {i === currentIndex && isPlaying ? "🎵" : i + 1}
              </span>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium truncate">{track.name}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
