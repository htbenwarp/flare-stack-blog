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
  // 固定的两个 Audio 元素
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);

  // 用 ref 始终追踪当前正在播放的 Audio 和用于预载的 Audio
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [mode, setMode] = useState<"list" | "single" | "random">("list");
  const [showGlobalLyrics, setShowGlobalLyrics] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  // 用于强制重新绑定事件的 key
  const [activeAudioKey, setActiveAudioKey] = useState(0);

  const location = useLocation();
  const { data: playlist = [] } = useQuery(musicPlaylistQueryOptions());

  // 用 ref 同步最新状态，供事件回调使用
  const currentIndexRef = useRef(currentIndex);
  const modeRef = useRef(mode);
  const playlistRef = useRef(playlist);
  const preloadIndexRef = useRef(-1); // 预载的歌曲索引
  const preloadLockRef = useRef(false); // 预载锁

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // 初始化两个 Audio 并分配角色（audio1 为活跃，audio2 为预载）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audio1Ref.current) {
      audio1Ref.current = new Audio();
      audio1Ref.current.crossOrigin = "anonymous";
    }
    if (!audio2Ref.current) {
      audio2Ref.current = new Audio();
      audio2Ref.current.crossOrigin = "anonymous";
    }
    activeAudioRef.current = audio1Ref.current;
    preloadAudioRef.current = audio2Ref.current;
  }, []);

  // 进入管理后台暂停
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      activeAudioRef.current?.pause();
    }
  }, [location.pathname]);

  // 计算下一首索引
  const getNextIndex = useCallback(
    (currentIdx: number): number => {
      const list = playlistRef.current;
      if (list.length === 0) return currentIdx;
      if (modeRef.current === "single") return currentIdx;
      if (modeRef.current === "random") return Math.floor(Math.random() * list.length);
      const next = currentIdx + 1;
      return next >= list.length ? 0 : next;
    },
    [],
  );

  // ---------- 预载函数 ----------
  const preloadTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlistRef.current.length) return;
      const track = playlistRef.current[index];
      if (!track?.url) return;

      const preAudio = preloadAudioRef.current;
      if (!preAudio) return;

      // 已经在预载同一首且缓冲足够
      if (preAudio.src === track.url && preAudio.readyState >= 2) {
        preloadIndexRef.current = index;
        preloadLockRef.current = false;
        return;
      }

      if (preloadLockRef.current) return;

      preloadLockRef.current = true;
      setIsPreloading(true);
      preAudio.src = track.url;
      preAudio.load();
      preloadIndexRef.current = index;

      const onReady = () => {
        preloadLockRef.current = false;
        setIsPreloading(false);
        preAudio.removeEventListener("canplaythrough", onReady);
        preAudio.removeEventListener("error", onError);
      };
      const onError = () => {
        preloadLockRef.current = false;
        setIsPreloading(false);
        preloadIndexRef.current = -1;
        preAudio.removeEventListener("canplaythrough", onReady);
        preAudio.removeEventListener("error", onError);
      };
      preAudio.addEventListener("canplaythrough", onReady);
      preAudio.addEventListener("error", onError);

      // 超时保护
      setTimeout(() => {
        if (preloadLockRef.current) {
          preloadLockRef.current = false;
          setIsPreloading(false);
          preAudio.removeEventListener("canplaythrough", onReady);
          preAudio.removeEventListener("error", onError);
        }
      }, 10000);
    },
    [],
  );

  // ---------- 核心无缝切换 ----------
  const switchToPreloaded = useCallback(
    (expectedIndex: number): boolean => {
      const preAudio = preloadAudioRef.current;
      const curAudio = activeAudioRef.current;
      if (!preAudio || !curAudio) return false;

      if (preloadIndexRef.current !== expectedIndex) return false;
      if (preAudio.readyState < 2) return false;

      // 1. 暂停当前播放器
      curAudio.pause();

      // 2. 交换 active 和 preload 引用
      const temp = activeAudioRef.current;
      activeAudioRef.current = preloadAudioRef.current;
      preloadAudioRef.current = temp;

      // 3. 从头播放新的 active
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current.play().catch(() => {});

      // 4. 立即同步 UI 状态（不依赖事件）
      setCurrentIndex(expectedIndex);
      setCurrentTime(0);
      setDuration(activeAudioRef.current.duration || 0);
      setIsPlaying(true);
      preloadIndexRef.current = -1;
      preloadLockRef.current = false;
      setIsPreloading(false);

      // 5. 强制重新绑定事件到新的 active 音频
      setActiveAudioKey(prev => prev + 1);

      // 6. 用新的预载器（原来的 active）预载下一首
      const nextIdx = getNextIndex(expectedIndex);
      if (nextIdx !== expectedIndex) {
        setTimeout(() => preloadTrack(nextIdx), 0);
      }

      return true;
    },
    [getNextIndex, preloadTrack],
  );

  // ---------- 在当前 active 音频上强制加载（回退方案） ----------
  const loadAndPlayOnCurrent = useCallback(
    (index: number) => {
      const track = playlistRef.current[index];
      if (!track?.url) return;

      const audio = activeAudioRef.current;
      if (!audio) return;

      // 重置 UI 状态
      setCurrentTime(0);
      setDuration(0);

      audio.src = track.url;
      audio.load();
      audio.play().catch(() => {});
      setCurrentIndex(index);
      setIsPlaying(true);

      // 强制重新绑定事件
      setActiveAudioKey(prev => prev + 1);

      // 预载下一首
      const nextIdx = getNextIndex(index);
      if (nextIdx !== index) preloadTrack(nextIdx);
    },
    [getNextIndex, preloadTrack],
  );

  // ---------- 对外 API ----------
  const togglePlay = useCallback(() => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    if (!audio.src && playlistRef.current.length > 0) {
      const idx = currentIndexRef.current < playlistRef.current.length ? currentIndexRef.current : 0;
      loadAndPlayOnCurrent(idx);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [loadAndPlayOnCurrent]);

  const playTrack = useCallback(
    (index: number) => {
      if (index === currentIndexRef.current) {
        togglePlay();
        return;
      }
      // 尝试无缝切换
      if (!switchToPreloaded(index)) {
        loadAndPlayOnCurrent(index);
      }
    },
    [switchToPreloaded, loadAndPlayOnCurrent, togglePlay],
  );

  const prevTrack = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    let prev = currentIndexRef.current - 1;
    if (prev < 0) prev = list.length - 1;
    playTrack(prev);
  }, [playTrack]);

  const nextTrack = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const nextIdx = getNextIndex(currentIndexRef.current);
    playTrack(nextIdx);
  }, [getNextIndex, playTrack]);

  const seek = useCallback((time: number) => {
    const audio = activeAudioRef.current;
    if (audio && isFinite(time) && time >= 0) {
      audio.currentTime = time;
    }
  }, []);

  // ---------- 事件绑定（始终跟随 activeAudioRef）----------
  useEffect(() => {
    const audio = activeAudioRef.current;
    if (!audio) return;

    const PRELOAD_THRESHOLD = 10;

    const onTimeUpdate = () => {
      if (!isFinite(audio.currentTime)) return;
      setCurrentTime(audio.currentTime);

      const dur = audio.duration;
      if (dur > 0 && dur - audio.currentTime <= PRELOAD_THRESHOLD) {
        const nextIdx = getNextIndex(currentIndexRef.current);
        if (nextIdx !== currentIndexRef.current) {
          preloadTrack(nextIdx);
        }
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };

    const onEnded = () => {
      const nextIdx = getNextIndex(currentIndexRef.current);
      if (!switchToPreloaded(nextIdx)) {
        loadAndPlayOnCurrent(nextIdx);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    // 开始播放后立即预载下一首
    const onPlaying = () => {
      const nextIdx = getNextIndex(currentIndexRef.current);
      if (nextIdx !== currentIndexRef.current) {
        preloadTrack(nextIdx);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [activeAudioKey, getNextIndex, switchToPreloaded, loadAndPlayOnCurrent, preloadTrack]);

  // 音量同步
  useEffect(() => {
    if (audio1Ref.current) audio1Ref.current.volume = volume;
    if (audio2Ref.current) audio2Ref.current.volume = volume;
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
