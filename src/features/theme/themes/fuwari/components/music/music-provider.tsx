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
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});
  const preloadLockRef = useRef<boolean>(false);
  const preloadIndexRef = useRef<number>(-1);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [mode, setMode] = useState<"list" | "single" | "random">("list");
  const [showGlobalLyrics, setShowGlobalLyrics] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  const location = useLocation();
  const { data: playlist = [] } = useQuery(musicPlaylistQueryOptions());

  // 在客户端创建 Audio 实例
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = "anonymous";
      }
      if (!preloadAudioRef.current) {
        preloadAudioRef.current = new Audio();
        preloadAudioRef.current.crossOrigin = "anonymous";
        preloadAudioRef.current.preload = "auto";
      }
    }
  }, []);

  // 进入管理后台时暂停
  useEffect(() => {
    if (location.pathname.startsWith("/admin") && audioRef.current) {
      audioRef.current.pause();
    }
  }, [location.pathname]);

  // 计算下一首索引
  const getNextIndex = useCallback(
    (currentIdx: number): number => {
      if (playlist.length === 0) return currentIdx;
      if (mode === "single") return currentIdx;
      if (mode === "random") return Math.floor(Math.random() * playlist.length);
      const next = currentIdx + 1;
      return next >= playlist.length ? 0 : next;
    },
    [playlist.length, mode],
  );

  // 核心播放函数
  const loadAndPlay = useCallback(
    (index: number) => {
      const track = playlist[index];
      if (!track?.url || !audioRef.current) return;

      setCurrentTime(0);
      setDuration(0);

      // 检查预载音频是否匹配
      const preAudio = preloadAudioRef.current;
      if (preAudio && preAudio.src && preAudio.src === track.url && preAudio.readyState >= 2) {
        // 不替换 ref，而是转移数据到主音频
        const mainAudio = audioRef.current;
        mainAudio.src = preAudio.src;
        mainAudio.currentTime = 0;
        mainAudio.load();
        mainAudio.play().catch(() => {});

        // 重置预载音频
        preAudio.src = "";
        preAudio.load();
        preloadLockRef.current = false;
        preloadIndexRef.current = -1;
        setIsPreloading(false);
      } else {
        audioRef.current.src = track.url;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }

      setCurrentIndex(index);
    },
    [playlist],
  );

  // 预载下一首（带锁机制）
  const preloadNextTrack = useCallback(
    (currentIdx: number) => {
      if (!playlist.length || playlist.length === 1) return;
      if (preloadLockRef.current) return;
      if (preloadIndexRef.current === getNextIndex(currentIdx)) return;

      const nextIdx = getNextIndex(currentIdx);
      if (nextIdx === currentIdx) return;

      const nextTrack = playlist[nextIdx];
      if (!nextTrack?.url) return;

      const preAudio = preloadAudioRef.current;
      if (!preAudio) return;

      // 避免重复加载同一首歌
      if (preAudio.src === nextTrack.url && preAudio.readyState >= 2) {
        preloadIndexRef.current = nextIdx;
        return;
      }

      preloadLockRef.current = true;
      setIsPreloading(true);
      preloadIndexRef.current = nextIdx;

      preAudio.src = nextTrack.url;
      preAudio.load();

      // 监听加载完成，解除锁定
      const onCanPlay = () => {
        preloadLockRef.current = false;
        setIsPreloading(false);
        preAudio.removeEventListener("canplaythrough", onCanPlay);
        preAudio.removeEventListener("error", onError);
      };
      const onError = () => {
        preloadLockRef.current = false;
        setIsPreloading(false);
        preloadIndexRef.current = -1;
        preAudio.removeEventListener("canplaythrough", onCanPlay);
        preAudio.removeEventListener("error", onError);
        console.warn("预载失败，将使用回退机制");
      };

      preAudio.addEventListener("canplaythrough", onCanPlay);
      preAudio.addEventListener("error", onError);

      // 超时保护：10秒后强制解锁
      setTimeout(() => {
        if (preloadLockRef.current) {
          preloadLockRef.current = false;
          setIsPreloading(false);
          preAudio.removeEventListener("canplaythrough", onCanPlay);
          preAudio.removeEventListener("error", onError);
        }
      }, 10000);
    },
    [playlist, getNextIndex],
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
    const nextIdx = getNextIndex(currentIndex);
    loadAndPlay(nextIdx);
  }, [currentIndex, getNextIndex, loadAndPlay]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isFinite(time) && time >= 0) {
      audioRef.current.currentTime = time;
    }
  }, []);

  // 绑定音频事件
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const PRELOAD_THRESHOLD = 10;

    const onTimeUpdate = () => {
      if (isFinite(audio.currentTime)) setCurrentTime(audio.currentTime);

      const remaining = audio.duration - audio.currentTime;
      if (remaining <= PRELOAD_THRESHOLD && remaining > 0) {
        preloadNextTrack(currentIndex);
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    // 无缝切换：使用预载缓存的索引
    const onEnded = () => {
      const preAudio = preloadAudioRef.current;
      const mainAudio = audioRef.current;

      if (preAudio && preAudio.src && preAudio.readyState >= 2 && mainAudio) {
        mainAudio.src = preAudio.src;
        mainAudio.currentTime = 0;
        mainAudio.load();
        mainAudio.play().catch(() => {});

        preAudio.src = "";
        preAudio.load();
        preloadLockRef.current = false;
        setIsPreloading(false);

        // 直接使用预载时缓存的索引
        const nextIdx = preloadIndexRef.current;
        if (nextIdx >= 0 && nextIdx < playlist.length) {
          setCurrentIndex(nextIdx);
        } else {
          const fallbackIdx = getNextIndex(currentIndex);
          setCurrentIndex(fallbackIdx);
        }
        preloadIndexRef.current = -1;
      } else {
        nextTrackRef.current();
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [currentIndex, getNextIndex, preloadNextTrack, playlist.length]);

  // 音量同步
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (preloadAudioRef.current) {
      preloadAudioRef.current.volume = volume;
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
