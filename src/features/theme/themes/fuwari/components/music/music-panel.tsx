import { useMusic } from "./music-provider";
import {
  X, Play, Pause, SkipBack, SkipForward,
  Repeat, Shuffle, Volume2, VolumeX
} from "lucide-react";
import { MusicList } from "./music-list";
import { m } from "@/paraglide/messages";

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MusicPanel({ onClose }: { onClose: () => void }) {
  const {
    playlist, currentIndex, isPlaying, currentTime, duration, volume,
    togglePlay, prevTrack, nextTrack, seek, setVolume,
    mode, setMode, showGlobalLyrics, setShowGlobalLyrics
  } = useMusic();

  const track = playlist[currentIndex];

  if (!track) {
    return (
      <div className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl bg-(--fuwari-card-bg)/95 backdrop-blur-2xl border border-(--fuwari-primary)/20 shadow-2xl shadow-black/20 overflow-hidden p-6 text-center">
        <p className="text-muted-foreground text-sm">暂无歌曲</p>
        <button onClick={onClose} className="mt-3 text-(--fuwari-primary) text-sm hover:underline">关闭</button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl bg-(--fuwari-card-bg)/95 backdrop-blur-2xl border border-(--fuwari-primary)/20 shadow-2xl shadow-black/20 overflow-hidden">
      {/* 封面区域 */}
      <div className="relative h-40 overflow-hidden">
        <img src={track.cover || "/images/music-placeholder.png"} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full bg-black/30 text-white hover:bg-black/50">
          <X size={16} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h4 className="text-white font-bold text-base truncate">{track.name}</h4>
          <p className="text-white/70 text-sm truncate">{track.artist}</p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="px-4 pt-3">
        <input type="range" min={0} max={duration || 0} value={currentTime} onChange={(e) => seek(+e.target.value)} className="w-full h-1 accent-(--fuwari-primary)" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button onClick={() => setMode(mode === "single" ? "list" : mode === "list" ? "random" : "single")} className="text-muted-foreground hover:text-(--fuwari-primary)">
          {mode === "list" ? <Repeat size={18} /> : mode === "single" ? <Repeat size={18} className="text-(--fuwari-primary)" /> : <Shuffle size={18} className="text-(--fuwari-primary)" />}
        </button>
        <button onClick={prevTrack} className="text-foreground hover:text-(--fuwari-primary)"><SkipBack size={22} /></button>
        <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-(--fuwari-primary) text-white flex items-center justify-center shadow-lg hover:opacity-90">
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button onClick={nextTrack} className="text-foreground hover:text-(--fuwari-primary)"><SkipForward size={22} /></button>
        <div className="flex items-center gap-1">
          <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-muted-foreground hover:text-(--fuwari-primary)">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-16 h-1 accent-(--fuwari-primary)" />
        </div>
      </div>

      {/* 歌词全局开关 */}
      <div className="px-4 pb-2 text-center">
        <button
          onClick={() => setShowGlobalLyrics(!showGlobalLyrics)}
          className="text-(--fuwari-primary) text-xs hover:underline"
        >
          {showGlobalLyrics
            ? m.music_hide_lyrics?.() ?? "隐藏歌词"
            : m.music_show_lyrics?.() ?? "显示歌词"}
        </button>
      </div>

      {/* 歌单列表 */}
      <div className="max-h-60 overflow-y-auto border-t border-(--fuwari-primary)/10">
        <MusicList compact />
      </div>
    </div>
  );
}