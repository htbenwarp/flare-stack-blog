import { useMusic } from "./music-provider";
import { Music, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function MusicWidget({ onClick }: { onClick: () => void }) {
  const { isPlaying, playlist, currentIndex, currentTime, duration } = useMusic();
  const track = playlist[currentIndex];

  const circleRef = useRef<SVGCircleElement>(null);
  const radius = 26; // 半径，适配 56px 按钮
  const circumference = 2 * Math.PI * radius;

  // 初始化圆的周长
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.strokeDasharray = `${circumference}`;
    }
  }, [circumference]);

  // 更新进度
  useEffect(() => {
    if (!circleRef.current) return;
    const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const offset = circumference * (1 - progress);
    circleRef.current.style.strokeDashoffset = `${offset}`;
  }, [currentTime, duration, circumference]);

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
      {/* 进度环 SVG */}
      <svg
        className="absolute pointer-events-none"
        style={{
          width: "calc(100% + 8px)",
          height: "calc(100% + 8px)",
          top: "-4px",
          left: "-4px",
          transform: "rotate(-90deg)", // 从顶部开始
        }}
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle
          ref={circleRef}
          cx="32"
          cy="32"
          r={radius}
          stroke="var(--fuwari-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference, // 初始满圈
            transition: "stroke-dashoffset 0.2s ease",
          }}
        />
      </svg>

      {/* 图标 */}
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