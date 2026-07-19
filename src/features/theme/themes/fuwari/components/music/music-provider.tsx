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
  // 两个固定的 Audio 元素
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  // 当前播放器标识，用于驱动事件绑定
  const [currentPlayerId, setCurrentPlayerId] = useState<"audio1" | "audio2">("audio1");
  // 获取当前正在播放的 Audio 引用
  const getCurrentAudio = useCallback(
    () => (currentPlayerId === "audio1" ? audio1Ref.current : audio2Ref.current),
    [currentPlayerId],
  );
  // 获取预载 Audio 引用
  const getPreloadAudio = useCallback(
    () => (currentPlayerId === "audio1" ? audio2Ref.current : audio1Ref.current),
    [currentPlayerId],
  );

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

  // 用 ref 同步最新状态，供事件回调使用
  const currentIndexRef = useRef(currentIndex);
  const modeRef = useRef(mode);
  const playlistRef = useRef(playlist);
  const preloadIndexRef = useRef(-1);
  const preloadLockRef = useRef(false);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // 初始化两个 Audio 元素（仅在客户端执行）
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!audio1Ref.current) {
        const a1 = new Audio();
        a1.crossOrigin = "anonymous";
        a1.preload = "auto";
        audio1Ref.current = a1;
      }
      if (!audio2Ref.current) {
        const a2 = new Audio();
        a2.crossOrigin = "anonymous";
        a2.preload = "auto";
        audio2Ref.current = a2;
      }
    }
  }, []);

  // 进入管理后台时暂停
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      getCurrentAudio()?.pause();
    }
  }, [location.pathname, getCurrentAudio]);

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
    [], // 使用 ref，无需依赖
  );

  // ---- 预载逻辑 ----
  const preloadTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlistRef.current.length) return;
      const track = playlistRef.current[index];
      if (!track?.url) return;

      const preAudio = getPreloadAudio();
      if (!preAudio) return;

      // 已经在加载同一首歌，且已足够缓冲
      if (preAudio.src === track.url && preAudio.readyState >= 2) {
        preloadIndexRef.current = index;
        preloadLockRef.current = false;
        return;
      }

      if (preloadLockRef.current) return; // 上一轮预载仍在进行

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
    [getPreloadAudio],
  );

  // ---- 双音频轮换（核心无缝切换）----
  const switchToPreloaded = useCallback(
    (expectedIndex: number): boolean => {
      const preAudio = getPreloadAudio();
      const curAudio = getCurrentAudio();
      if (!preAudio || !curAudio) return false;

      // 必须匹配索引且缓冲足够
      if (preloadIndexRef.current !== expectedIndex) return false;
      if (preAudio.readyState < 2) return false;

      // 暂停旧播放器，准备回收为预载器
      curAudio.pause();

      // 确保新播放器从头开始
      preAudio.currentTime = 0;

      // 交换角色：新的播放器是 preAudio，旧的变成预载器
      const newPlayerId = currentPlayerId === "audio1" ? "audio2" : "audio1";
      setCurrentPlayerId(newPlayerId);
      setCurrentIndex(expectedIndex);
      preloadIndexRef.current = -1;
      preloadLockRef.current = false;
      setIsPreloading(false);

      // 立即播放
      preAudio.play().catch(() => {});

      // 预载新的下一首
      const nextIdx = getNextIndex(expectedIndex);
      // 延迟执行，等待 setCurrentPlayerId 引起的 useEffect 更新完成
      setTimeout(() => preloadTrack(nextIdx), 0);
      return true;
    },
    [currentPlayerId, getNextIndex, getPreloadAudio, getCurrentAudio, preloadTrack],
  );

  // ---- 在当前播放器上强制加载（回退方案）----
  const loadAndPlayOnCurrent = useCallback(
    (index: number) => {
      const track = playlistRef.current[index];
      if (!track?.url) return;

      const audio = getCurrentAudio();
      if (!audio) return;

      audio.src = track.url;
      audio.load();
      audio.play().catch(() => {});
      setCurrentIndex(index);

      // 开始加载下一首
      const nextIdx = getNextIndex(index);
      preloadTrack(nextIdx);
    },
    [getCurrentAudio, getNextIndex, preloadTrack],
  );

  // ---- 手动操作 API ----
  const togglePlay = useCallback(() => {
    const audio = getCurrentAudio();
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
  }, [getCurrentAudio, loadAndPlayOnCurrent]);

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
    const audio = getCurrentAudio();
    if (audio && isFinite(time) && time >= 0) {
      audio.currentTime = time;
    }
  }, [getCurrentAudio]);

  // ---- 事件绑定（跟随 currentPlayerId）----
  useEffect(() => {
    const audio = getCurrentAudio();
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
        // 预载未就绪，回退到当前播放器加载
        loadAndPlayOnCurrent(nextIdx);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    // 歌曲开始播放后立即预载下一首（更激进）
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
  }, [currentPlayerId, getCurrentAudio, getNextIndex, switchToPreloaded, loadAndPlayOnCurrent, preloadTrack]);

  // 音量同步
  useEffect(() => {
    if (audio1Ref.current) audio1Ref.current.volume = volume;
    if (audio2Ref.current) audio2Ref.current.volume = volume;
  }, [volume]);

  // 初始化首曲（无 src 时自动加载第一首）
  useEffect(() => {
    if (playlist.length > 0) {
      const audio = getCurrentAudio();
      if (audio && !audio.src) {
        loadAndPlayOnCurrent(0);
      }
    }
  }, [playlist, getCurrentAudio, loadAndPlayOnCurrent]);

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
