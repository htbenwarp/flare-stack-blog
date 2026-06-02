import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { musicPlaylistQueryOptions } from "@/features/music/queries";
import type { MusicTrack } from "@/features/music/schema";

interface MusicContextType {
  playlist: MusicTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  mode: "list" | "single" | "random";
  togglePlay: () => void;
  playTrack: (index: number) => void;
  prevTrack: () => void;
  nextTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setMode: (mode: "list" | "single" | "random") => void;
  showGlobalLyrics: boolean;
  setShowGlobalLyrics: (show: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    return {
      playlist: [] as MusicTrack[],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      mode: "list" as const,
      togglePlay: () => {},
      playTrack: () => {},
      prevTrack: () => {},
      nextTrack: () => {},
      seek: () => {},
      setVolume: () => {},
      setMode: () => {},
      showGlobalLyrics: false,
      setShowGlobalLyrics: () => {},
    };
  }
  return ctx;
};

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [mode, setMode] = useState<"list" | "single" | "random">("list");
  const [showGlobalLyrics, setShowGlobalLyrics] = useState(false);

  const location = useLocation();
  const { data: playlist = [] } = useQuery(musicPlaylistQueryOptions());

  // 在客户端创建 Audio 实例（避免 SSR 报错）
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  // 进入管理后台时暂停
  useEffect(() => {
    if (location.pathname.startsWith("/admin") && audioRef.current) {
      audioRef.current.pause();
    }
  }, [location.pathname]);

  // 核心播放函数
  const loadAndPlay = useCallback(
    (index: number) => {
      const track = playlist[index];
      if (!track?.url || !audioRef.current) return;
      audioRef.current.src = track.url;
      audioRef.current.play().catch(() => {});
      setCurrentIndex(index);
    },
    [playlist],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src && playlist.length > 0) {
      const index = currentIndex >= 0 && currentIndex < playlist.length ? currentIndex : 0;
      loadAndPlay(index);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentIndex, playlist, loadAndPlay]);

  const playTrack = useCallback(
    (index: number) => {
      if (index === currentIndex && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      } else {
        loadAndPlay(index);
      }
    },
    [currentIndex, loadAndPlay],
  );

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    let nextIndex = currentIndex - 1;
    if (nextIndex < 0) nextIndex = playlist.length - 1;
    loadAndPlay(nextIndex);
  }, [currentIndex, playlist, loadAndPlay]);

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    let nextIndex: number;
    if (mode === "single") {
      nextIndex = currentIndex;
    } else if (mode === "random") {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= playlist.length) nextIndex = 0;
    }
    loadAndPlay(nextIndex);
  }, [currentIndex, playlist, mode, loadAndPlay]);

  // 保持 nextTrack 引用最新
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
    }
  }, []);

  // 绑定音频事件（使用 ref 避免闭包陷阱）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (isFinite(audio.currentTime)) setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => nextTrackRef.current();  // ← 关键：使用最新引用
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [currentIndex, mode]); // 重新绑定事件当 currentIndex 或 mode 变化

  // 音量同步
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <MusicContext.Provider
      value={{
        playlist,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        mode,
        togglePlay,
        playTrack,
        prevTrack,
        nextTrack,
        seek,
        setVolume,
        setMode,
        showGlobalLyrics,
        setShowGlobalLyrics,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
