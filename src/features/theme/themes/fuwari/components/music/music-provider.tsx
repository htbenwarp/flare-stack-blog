import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { musicPlaylistQueryOptions } from '@/features/music/queries';
import type { MusicTrack } from '@/features/music/schema';

// ---------- Context 类型 ----------
interface MusicContextType {
  playlist: MusicTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  mode: 'list' | 'single' | 'random';
  isLoading: boolean;
  togglePlay: () => void;
  playTrack: (index: number) => void;
  prevTrack: () => void;
  nextTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setMode: (mode: 'list' | 'single' | 'random') => void;
  showGlobalLyrics: boolean;
  setShowGlobalLyrics: (show: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    return {
      playlist: [],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      mode: 'list' as const,
      isLoading: false,
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
  // ---------- 状态 ----------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [mode, setMode] = useState<'list' | 'single' | 'random'>('list');
  const [showGlobalLyrics, setShowGlobalLyrics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const location = useLocation();
  const { data: playlist = [] } = useQuery(musicPlaylistQueryOptions());

  // ---------- Web Audio 引用 ----------
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentGainRef = useRef<GainNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentBufferRef = useRef<AudioBuffer | null>(null);
  const nextBufferRef = useRef<AudioBuffer | null>(null);

  // 状态 refs
  const currentIndexRef = useRef(currentIndex);
  const modeRef = useRef(mode);
  const playlistRef = useRef(playlist);
  const volumeRef = useRef(volume);
  const isPlayingRef = useRef(isPlaying);

  // 播放参数
  const pauseOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // 取消令牌
  const switchTokenRef = useRef(0);
  const preloadTokenRef = useRef(0);

  // 自动切换与加载锁
  const autoSwitchPendingRef = useRef(false);
  const isLoadingRef = useRef(false);

  // 同步 refs
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ---------- 工具函数 ----------
  const getNextIndex = useCallback((currentIdx: number): number => {
    const list = playlistRef.current;
    if (list.length === 0) return currentIdx;
    if (modeRef.current === 'single') return currentIdx;
    if (modeRef.current === 'random') {
      if (list.length === 1) return currentIdx;
      let next;
      do { next = Math.floor(Math.random() * list.length); } while (next === currentIdx);
      return next;
    }
    const next = currentIdx + 1;
    return next >= list.length ? 0 : next;
  }, []);

  const getPrevIndex = useCallback((currentIdx: number): number => {
    const list = playlistRef.current;
    if (list.length === 0) return currentIdx;
    if (modeRef.current === 'single') return currentIdx;
    if (modeRef.current === 'random') {
      if (list.length === 1) return currentIdx;
      let prev;
      do { prev = Math.floor(Math.random() * list.length); } while (prev === currentIdx);
      return prev;
    }
    const prev = currentIdx - 1;
    return prev < 0 ? list.length - 1 : prev;
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const stopPlayback = useCallback(() => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch (e) {}
      currentSourceRef.current.disconnect();
      currentSourceRef.current = null;
    }
    if (currentGainRef.current) {
      currentGainRef.current.disconnect();
      currentGainRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ---------- 解码与创建音频源 ----------
  const decodeTrack = useCallback(async (
    track: MusicTrack,
    token: number,
    cancelRef: React.MutableRefObject<number>
  ): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch(track.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      if (token !== cancelRef.current) return null;
      const ctx = ensureAudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      if (token !== cancelRef.current) return null;
      return buffer;
    } catch (error) {
      console.error('解码失败:', track.title, error);
      return null;
    }
  }, [ensureAudioContext]);

  const createBufferSource = useCallback((buffer: AudioBuffer, offset = 0, when = 0) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(when, offset);
    return { source, gain };
  }, []);

  // ---------- 预载下一首 ----------
  const preloadNext = useCallback((currentIdx: number) => {
    const nextIdx = getNextIndex(currentIdx);
    if (nextIdx === currentIdx) return;
    const token = ++preloadTokenRef.current;
    const track = playlistRef.current[nextIdx];
    if (track?.url) {
      decodeTrack(track, token, preloadTokenRef).then(buf => {
        if (token === preloadTokenRef.current && buf) {
          nextBufferRef.current = buf;
        }
      }).catch(() => {});
    }
  }, [getNextIndex, decodeTrack]);

  // ---------- 进度更新 ref（避免循环依赖） ----------
  const updateProgressRef = useRef<() => void>(() => {});

  // ---------- 核心加载函数（带并发锁，finally 保证解锁） ----------
  const loadAndPlay = useCallback(async (index: number, isAuto = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    const token = ++switchTokenRef.current;
    try {
      const track = playlistRef.current[index];
      if (!track) {
        if (isAuto) autoSwitchPendingRef.current = false;
        return;
      }

      stopPlayback();
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);

      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const buffer = await decodeTrack(track, token, switchTokenRef);
      if (token !== switchTokenRef.current) {
        if (isAuto) autoSwitchPendingRef.current = false;
        return;
      }
      if (!buffer) {
        if (isAuto) autoSwitchPendingRef.current = false;
        return;
      }

      currentBufferRef.current = buffer;
      setDuration(buffer.duration);

      const { source, gain } = createBufferSource(buffer, 0, ctx.currentTime)!;
      currentSourceRef.current = source;
      currentGainRef.current = gain;
      gain.gain.setValueAtTime(volumeRef.current, ctx.currentTime);

      startTimeRef.current = ctx.currentTime;
      pauseOffsetRef.current = 0;
      setCurrentIndex(index);
      setIsPlaying(true);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateProgressRef.current);

      preloadNext(index);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      if (isAuto) autoSwitchPendingRef.current = false;
    }
  }, [stopPlayback, ensureAudioContext, decodeTrack, createBufferSource, preloadNext]);

  // ---------- 无缝切换（消除咔声） ----------
  const immediateSwitch = useCallback((nextIndex: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      autoSwitchPendingRef.current = false;
      return;
    }
    const buffer = nextBufferRef.current;
    if (!buffer) {
      autoSwitchPendingRef.current = false;
      loadAndPlay(nextIndex, true);
      return;
    }

    const now = ctx.currentTime;
    const currentPos = pauseOffsetRef.current + (now - startTimeRef.current);
    const dur = currentBufferRef.current!.duration;
    const remaining = dur - currentPos;
    const crossfade = 0.05;

    const fadeStart = now + Math.max(remaining - crossfade, 0.001);

    // 旧源安排淡出，不强制停止
    const oldSource = currentSourceRef.current;
    const oldGain = currentGainRef.current;
    if (oldSource && oldGain) {
      oldGain.gain.cancelScheduledValues(fadeStart);
      oldGain.gain.setValueAtTime(volumeRef.current, fadeStart);
      oldGain.gain.linearRampToValueAtTime(0, fadeStart + crossfade);
      oldSource.onended = () => {
        oldSource.disconnect();
        oldGain.disconnect();
      };
    }

    // 新源淡入
    const { source, gain } = createBufferSource(buffer, 0, fadeStart)!;
    gain.gain.setValueAtTime(0, fadeStart);
    gain.gain.linearRampToValueAtTime(volumeRef.current, fadeStart + crossfade);

    currentSourceRef.current = source;
    currentGainRef.current = gain;
    currentBufferRef.current = buffer;
    nextBufferRef.current = null;

    startTimeRef.current = fadeStart;
    pauseOffsetRef.current = 0;

    setCurrentIndex(nextIndex);
    setDuration(buffer.duration);
    setCurrentTime(0);
    setIsPlaying(true);

    preloadNext(nextIndex);

    autoSwitchPendingRef.current = false;
  }, [createBufferSource, preloadNext, loadAndPlay]);

  // ---------- 进度更新 ----------
  const updateProgress = useCallback(() => {
    if (!audioCtxRef.current) {
      rafRef.current = requestAnimationFrame(updateProgressRef.current);
      return;
    }
    const ctx = audioCtxRef.current;

    if (ctx.state === 'suspended' && isPlayingRef.current) {
      setIsPlaying(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (isPlayingRef.current && currentBufferRef.current && currentSourceRef.current) {
      const elapsed = ctx.currentTime - startTimeRef.current;
      const dur = currentBufferRef.current.duration;
      const pos = Math.min(Math.max(elapsed + pauseOffsetRef.current, 0), dur);
      setCurrentTime(pos);

      if (pos >= dur - 0.1 && !autoSwitchPendingRef.current) {
        autoSwitchPendingRef.current = true;
        const nextIdx = getNextIndex(currentIndexRef.current);

        if (modeRef.current === 'single') {
          autoSwitchPendingRef.current = false;
          loadAndPlay(currentIndexRef.current, true);
        } else if (nextIdx !== currentIndexRef.current) {
          immediateSwitch(nextIdx);
        } else {
          stopPlayback();
          setIsPlaying(false);
          autoSwitchPendingRef.current = false;
        }
      }
    }
    rafRef.current = requestAnimationFrame(updateProgressRef.current);
  }, [getNextIndex, immediateSwitch, loadAndPlay, stopPlayback]);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  // ---------- 播放/暂停切换 ----------
  const togglePlay = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      if (!currentBufferRef.current) return;
      if (playlistRef.current.length) await loadAndPlay(0);
      return;
    }
    if (ctx.state === 'suspended') await ctx.resume();

    if (isPlayingRef.current) {
      // 暂停
      if (currentSourceRef.current) {
        const elapsed = ctx.currentTime - startTimeRef.current;
        pauseOffsetRef.current += elapsed;
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
        if (currentGainRef.current) {
          currentGainRef.current.disconnect();
          currentGainRef.current = null;
        }
        setIsPlaying(false);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    } else {
      // 恢复播放
      if (currentBufferRef.current) {
        const offset = Math.min(pauseOffsetRef.current, currentBufferRef.current.duration - 0.1);
        const { source, gain } = createBufferSource(currentBufferRef.current, offset, ctx.currentTime)!;
        currentSourceRef.current = source;
        currentGainRef.current = gain;
        gain.gain.setValueAtTime(volumeRef.current, ctx.currentTime);
        startTimeRef.current = ctx.currentTime;
        setIsPlaying(true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateProgressRef.current);
      } else {
        if (playlistRef.current.length) await loadAndPlay(0);
      }
    }
  }, [loadAndPlay, createBufferSource]);

  // ---------- 拖动进度 ----------
  const seek = useCallback((time: number) => {
    if (!currentBufferRef.current) return;
    const clamped = Math.max(0, Math.min(time, currentBufferRef.current.duration));
    if (isPlayingRef.current && currentSourceRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      currentSourceRef.current.stop();
      currentSourceRef.current.disconnect();
      if (currentGainRef.current) currentGainRef.current.disconnect();

      const { source, gain } = createBufferSource(currentBufferRef.current, clamped, ctx.currentTime)!;
      currentSourceRef.current = source;
      currentGainRef.current = gain;
      gain.gain.setValueAtTime(volumeRef.current, ctx.currentTime);
      startTimeRef.current = ctx.currentTime;
      pauseOffsetRef.current = clamped;
      setCurrentTime(clamped);
    } else {
      pauseOffsetRef.current = clamped;
      setCurrentTime(clamped);
    }
  }, [createBufferSource]);

  // ---------- 手动切歌 ----------
  const switchToTrack = useCallback((index: number) => {
    autoSwitchPendingRef.current = false;
    switchTokenRef.current += 1;

    const sameTrack = index === currentIndexRef.current;
    if (sameTrack && modeRef.current !== 'single') {
      togglePlay();
      return;
    }

    // 立即更新 UI
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    stopPlayback();

    loadAndPlay(index, false);
  }, [togglePlay, loadAndPlay, stopPlayback]);

  // ---------- 外部 API ----------
  const playTrack = useCallback((index: number) => {
    switchToTrack(index);
  }, [switchToTrack]);

  const prevTrack = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const prevIdx = getPrevIndex(currentIndexRef.current);
    playTrack(prevIdx);
  }, [getPrevIndex, playTrack]);

  const nextTrack = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    const nextIdx = getNextIndex(currentIndexRef.current);
    playTrack(nextIdx);
  }, [getNextIndex, playTrack]);

  // ---------- 路由变化暂停 ----------
  useEffect(() => {
    if (location.pathname.startsWith('/admin') && isPlayingRef.current) {
      togglePlay();
    }
  }, [location.pathname, togglePlay]);

  // ---------- 音量同步 ----------
  useEffect(() => {
    if (currentGainRef.current && audioCtxRef.current) {
      currentGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // ---------- 组件卸载清理 ----------
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopPlayback();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [stopPlayback]);

  // ---------- 初始加载 ----------
  useEffect(() => {
    if (playlist.length > 0 && !currentBufferRef.current && !isLoadingRef.current) {
      loadAndPlay(0);
    }
  }, [playlist, loadAndPlay]);

  // ---------- 返回值 ----------
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
        isLoading,
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
