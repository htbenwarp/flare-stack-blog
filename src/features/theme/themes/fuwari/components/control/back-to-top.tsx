// themes/fuwari/components/control/back-to-top.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Rocket, MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = useRouterState().location.pathname;
  const isPostPage = pathname.startsWith("/post/");

  // 按钮尺寸与音乐播放器一致
  const btnSize = "w-14 h-14"; // 56px
  const iconSize = 28;

  // 移动端触摸激活状态
  const [mobileActive, setMobileActive] = useState(false);
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 进度路径元素引用（用于动态计算长度）
  const progressPathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(208); // 初始默认值，挂载后动态获取

  // 圆角矩形路径（边框在按钮外侧）
  const roundedRectPath =
    "M 18 4 L 42 4 Q 56 4 56 18 L 56 42 Q 56 56 42 56 L 18 56 Q 4 56 4 42 L 4 18 Q 4 4 18 4 Z";

  // 动态获取路径长度
  useEffect(() => {
    const path = progressPathRef.current;
    if (path) {
      const length = path.getTotalLength();
      if (length > 0) setPathLength(length);
    }
  }, []);

  // 移动端触摸处理：临时恢复不透明，2秒后淡回
  const handleTouchStart = useCallback(() => {
    setMobileActive(true);
    if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    mobileTimerRef.current = setTimeout(() => {
      setMobileActive(false);
    }, 2000);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    };
  }, []);

  // 进度计算：文章页以评论区起始为内容终点
  const computeProgress = useCallback(() => {
    if (!isPostPage) {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const max = docHeight - winHeight;
      setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0);
      return;
    }

    const article = document.querySelector(".fuwari-custom-md");
    if (!article) {
      setProgress(0);
      return;
    }

    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = rect.height;

    // 将评论区起始作为“内容结束点”
    const commentSection = document.getElementById("comment-section");
    let contentEnd = articleTop + articleHeight;
    if (commentSection) {
      const commentRect = commentSection.getBoundingClientRect();
      contentEnd = commentRect.top + window.scrollY;
    }

    const contentHeight = contentEnd - articleTop;
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;

    if (contentHeight <= 0) {
      setProgress(0);
      return;
    }

    if (scrollTop + windowHeight >= contentEnd) {
      setProgress(100);
    } else if (scrollTop <= articleTop) {
      setProgress(0);
    } else {
      const scrolled = scrollTop - articleTop;
      const scrollable = contentHeight - windowHeight;
      const pct = scrollable > 0 ? (scrolled / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    }
  }, [isPostPage]);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
      computeProgress();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeProgress);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeProgress);
    };
  }, [computeProgress]);

  const scrollTo = (selector?: string) => {
    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`fixed right-6 bottom-22 z-40 flex flex-col gap-3 items-center pointer-events-none transition-opacity duration-300 ${
        mobileActive ? "opacity-100" : "max-lg:opacity-35"
      }`}
      onTouchStart={handleTouchStart}
    >
      {/* 回到顶部按钮（带进度边框） */}
      <div
        className={`relative flex items-center justify-center ${btnSize} pointer-events-auto transition-all duration-300 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <svg
          className="absolute pointer-events-none"
          style={{
            width: "calc(100% + 8px)",
            height: "calc(100% + 8px)",
            top: "-4px",
            left: "-4px",
          }}
          viewBox="0 0 60 60"
          fill="none"
        >
          <path
            ref={progressPathRef}
            d={roundedRectPath}
            stroke="var(--fuwari-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - progress / 100)}
            className="transition-[stroke-dashoffset] duration-100 ease-out"
          />
        </svg>
        <button
          onClick={() => scrollTo()}
          aria-label="回到顶部"
          className="fuwari-card-base w-full h-full flex items-center justify-center rounded-2xl shadow-md hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) transition-all active:scale-90"
        >
          <Rocket size={iconSize} strokeWidth={2} />
        </button>
      </div>

      {/* 跳转评论区按钮（无边框，仅文章页） */}
      {isPostPage && (
        <div
          className={`flex items-center justify-center ${btnSize} pointer-events-auto transition-all duration-300 ${
            visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <button
            onClick={() => scrollTo("#comment-section")}
            aria-label="跳转评论区"
            className="fuwari-card-base w-full h-full flex items-center justify-center rounded-2xl shadow-md hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) transition-all active:scale-90"
          >
            <MessageCircle size={iconSize} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}