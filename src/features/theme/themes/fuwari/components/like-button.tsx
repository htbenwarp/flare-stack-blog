// src/features/theme/themes/fuwari/components/like-button.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { getLikeCountFn, postLikeFn } from "@/features/likes/api/likes.public.api";
import { m } from "@/paraglide/messages";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; rot: number; vr: number;
}

const MAX_PARTICLES = 80;
const CANVAS_HEIGHT = 80;

interface LikeButtonProps {
  /** 自定义路径（用于非文章页面，如动态），若不提供则使用当前页面路径 */
  path?: string;
  /** 简洁模式：不显示粒子背景动画，仅保留按钮和计数 */
  simple?: boolean;
}

export function LikeButton({ path: customPath, simple = false }: LikeButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const loopRunningRef = useRef(false);
  const frameCountRef = useRef(0);
  const cwRef = useRef(280);
  const heartPathRef = useRef<Path2D | null>(null);

  const path = customPath || (typeof window !== "undefined" ? window.location.pathname : "");

  const resetParticles = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    particlesRef.current = [];
    loopRunningRef.current = false;
    frameCountRef.current = 0;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getHeartColor = useCallback((): string => {
    const root = document.documentElement;
    const color = getComputedStyle(root).getPropertyValue("--fuwari-primary").trim();
    return color || "rgb(180,100,160)";
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = cwRef.current;
    const H = CANVAS_HEIGHT;
    ctx.clearRect(0, 0, w, H);
    const heartColor = getHeartColor();
    for (const p of particlesRef.current) {
      const sc = p.r / 12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sc, sc);
      ctx.translate(-12, -12);
      ctx.fillStyle = heartColor;
      ctx.globalAlpha = 0.72;
      ctx.fill(heartPathRef.current!);
      ctx.restore();
    }
  }, [getHeartColor]);

  const spawnParticle = useCallback(() => {
    const p: Particle = {
      x: cwRef.current / 2 + (Math.random() - 0.5) * cwRef.current * 0.4,
      y: -8,
      vx: (Math.random() - 0.5) * 1.0,
      vy: 0,
      r: 6 + Math.random() * 6,
      rot: (Math.random() - 0.5) * Math.PI,
      vr: (Math.random() - 0.5) * 0.12,
    };
    particlesRef.current.push(p);
    if (!loopRunningRef.current) {
      loopRunningRef.current = true;
      frameCountRef.current = 0;
      animate();
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = cwRef.current;
    const H = CANVAS_HEIGHT;
    const GRAVITY = 0.1;
    const particles = particlesRef.current;

    frameCountRef.current++;
    if (frameCountRef.current > 800) {
      loopRunningRef.current = false;
      return;
    }

    ctx.clearRect(0, 0, w, H);
    let moving = false;

    for (const p of particles) {
      p.vy += GRAVITY;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0;
      p.vr *= 0;
      p.rot += p.vr;

      if (p.y + p.r > H) { p.y = H - p.r; p.vy *= -0.8; p.vx *= 0.75; p.vr *= 0.6; }
      if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.2; p.vr *= 0.5; }
      if (p.x + p.r > w) { p.x = w - p.r; p.vx = -Math.abs(p.vx) * 0.2; p.vr *= 0.5; }

      if (p.y + p.r < H - 0.5 || Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05 || Math.abs(p.vr) > 0.02)
        moving = true;
    }

    for (let i = 0; i < particles.length - 1; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const min = a.r + b.r;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const push = (min - d) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) {
            const imp = rel * 0.25;
            a.vx -= imp * nx; a.vy -= imp * ny;
            b.vx += imp * nx; b.vy += imp * ny;
            a.vr += imp * 0.15 * (Math.random() - 0.5);
            b.vr -= imp * 0.15 * (Math.random() - 0.5);
          }
        }
      }
    }

    const heartColor = getHeartColor();
    for (const p of particles) {
      const sc = p.r / 12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sc, sc);
      ctx.translate(-12, -12);
      ctx.fillStyle = heartColor;
      ctx.globalAlpha = 0.72;
      ctx.fill(heartPathRef.current!);
      ctx.restore();
    }

    if (moving) rafRef.current = requestAnimationFrame(animate);
    else loopRunningRef.current = false;
  }, [getHeartColor]);

  useEffect(() => {
    resetParticles();
    setCount(0);
    setLiked(false);
    setLoading(true);
    setError(false);

    const canvas = canvasRef.current;
    if (!canvas || simple) {
      // 简洁模式跳过 canvas 初始化
    } else {
      heartPathRef.current = new Path2D(
        "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      );

      const updateSize = () => {
        const parent = canvasRef.current?.parentElement;
        const w = parent?.getBoundingClientRect().width || 280;
        const clampedW = Math.min(w, 600);
        canvas.width = clampedW;
        canvas.height = CANVAS_HEIGHT;
        canvas.style.width = `${clampedW}px`;
        canvas.style.height = `${CANVAS_HEIGHT}px`;
        cwRef.current = clampedW;
        drawFrame();
      };

      updateSize();
      window.addEventListener("resize", updateSize);

      const observer = new MutationObserver(() => {
        setTimeout(() => drawFrame(), 50);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => {
        window.removeEventListener("resize", updateSize);
        observer.disconnect();
        resetParticles();
      };
    }
  }, [path, simple]);

  useEffect(() => {
    getLikeCountFn({ data: { path } })
      .then((res) => {
        const c = res.count ?? 0;
        setCount(c);
        resetParticles();
        if (!simple) {
          const n = Math.min(c, MAX_PARTICLES);
          for (let i = 0; i < n; i++) spawnParticle();
        }
      })
      .catch(() => {})
      .finally(() => {
        setLiked(!!localStorage.getItem(`liked:${path}`));
        setLoading(false);
      });
  }, [path, simple]);

  const handleLike = async () => {
    if (liked || loading || error || requesting) return;
    setRequesting(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
    if (!simple) spawnParticle();
    try {
      const res = await postLikeFn({ data: { path } });
      if (res.alreadyLiked) {
        setLiked(true);
        localStorage.setItem(`liked:${path}`, "1");
        setCount(res.count);
        setRequesting(false);
        return;
      }
      setCount(res.count);
      setLiked(true);
      localStorage.setItem(`liked:${path}`, "1");
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      {!simple && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
        />
      )}
      <button
        className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 border transition-colors duration-200 select-none
          ${liked
            ? "border-(--fuwari-primary) text-(--fuwari-primary) opacity-100 cursor-default"
            : "border-(--fuwari-btn-card-bg-active) opacity-70 hover:border-(--fuwari-primary) hover:text-(--fuwari-primary) hover:opacity-100"}
          ${error ? "border-red-500" : ""}
          bg-(--fuwari-card-bg)/50 backdrop-blur-sm text-sm`}
        onClick={handleLike}
        disabled={liked || loading || requesting}
        aria-label={m.like_button_label()}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-[17px] h-[17px] flex-shrink-0 transition-transform duration-200 ${animating ? "scale-150" : ""}`}
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="min-w-[1.5ch] tabular-nums">{loading ? "·" : count}</span>
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-500">{m.like_error()}</p>
      )}
    </div>
  );
}