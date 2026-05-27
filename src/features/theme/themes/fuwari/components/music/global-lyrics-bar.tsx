import { useState, useEffect } from "react";
import { useMusic } from "./music-provider";

function parseLrc(lrcText: string): { time: number; text: string }[] {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const parsed: { time: number; text: string }[] = [];
  const reg = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  for (const line of lines) {
    const match = [...line.matchAll(reg)];
    if (match.length === 0) continue;
    const text = line.replace(reg, "").trim();
    for (const m of match) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      parsed.push({ time, text });
    }
  }
  return parsed.sort((a, b) => a.time - b.time);
}

export function GlobalLyricsBar() {
  const { playlist, currentIndex, currentTime, isPlaying, showGlobalLyrics } = useMusic();
  const track = playlist[currentIndex];
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);

  useEffect(() => {
    if (!track?.lrc) {
      setLyrics([]);
      return;
    }
    fetch(track.lrc)
      .then((r) => r.text())
      .then((text) => setLyrics(parseLrc(text)))
      .catch(() => setLyrics([]));
  }, [track?.lrc]);

  const currentLyric =
    lyrics
      ?.filter((l) => l.time <= currentTime)
      .pop()?.text ?? "";

  if (!showGlobalLyrics || !isPlaying || !currentLyric) return null;

  return (
    <div className="fixed bottom-12 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <p className="text-sm text-black/70 dark:text-white/80 drop-shadow-md px-4 py-2 rounded-lg transition-opacity duration-500">
        {currentLyric}
      </p>
    </div>
  );
}
