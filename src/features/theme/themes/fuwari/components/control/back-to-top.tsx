import { useEffect, useState, useCallback, useRef } from "react";
import { Rocket, MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

interface BackToTopProps {
  isGuestPost?: boolean;
}

export function BackToTop({ isGuestPost = false }: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const pathname = useRouterState().location.pathname;
  const isPostPage = pathname.startsWith("/post/");

  // 移动端半透明交互
  const [mobileActive, setMobileActive] = useState(false);
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 进度路径元素引用
  const progressPathRef = useRef<SVGPathElement>(null);
  // 存储路径总长度，避免重复计算
  const pathLengthRef = useRef(208);
  // requestAnimationFrame 的 ID，用于节流
  const rafIdRef = useRef<number | null>(null);

  // 圆角矩形路径（边框位于按钮外侧）
  const roundedRectPath =
    "M 18 4 L 42 4 Q 56 4 56 18 L 56 42 Q 56 56 42 56 L 18 56 Q 4 56 4 42 L 4 18 Q 4 4 18 4 Z";

  // 动态获取路径长度并设置 dasharray（仅挂载时执行一次）
  useEffect(() => {
    const path = progressPathRef.current;
    if (path) {
      const length = path.getTotalLength();
      if (length > 0) {
        pathLengthRef.current = length;
        path.setAttribute("stroke-dasharray", length.toString());
      }
    }
  }, []);

  // 移动端触摸激活
  const handleTouchStart = useCallback(() => {
    setMobileActive(true);
    if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    mobileTimerRef.current = setTimeout(() => {
      setMobileActive(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    };
  }, []);

  // 进度计算并直接操作 DOM（不触发组件重新渲染）
  const updateProgress = useCallback(() => {
    const path = progressPathRef.current;
    if (!path) return;

    let pct = 0;

    if (!isPostPage) {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const max = docHeight - winHeight;
      pct = max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0;
    } else {
      const article = document.querySelector(".fuwari-custom-md");
      if (!article) {
        pct = 0;
      } else {
        const rect = article.getBoundingClientRect();
        const articleTop = rect.top + window.scrollY;
        const articleHeight = rect.height;

        // 以相邻文章导航作为内容结束点
        const adjacent = document.getElementById("adjacent-posts");
        let contentEnd = articleTop + articleHeight;
        if (adjacent) {
          const adjacentRect = adjacent.getBoundingClientRect();
          contentEnd = adjacentRect.top + window.scrollY;
        }

        const contentHeight = contentEnd - articleTop;
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;

        if (contentHeight <= 0) {
          pct = 0;
        } else if (scrollTop + windowHeight >= contentEnd) {
          pct = 100;
        } else if (scrollTop <= articleTop) {
          pct = 0;
        } else {
          const scrolled = scrollTop - articleTop;
          const scrollable = contentHeight - windowHeight;
          pct = scrollable > 0 ? (scrolled / scrollable) * 100 : 0;
          pct = Math.min(100, Math.max(0, pct));
        }
      }
    }

    const length = pathLengthRef.current;
    path.setAttribute("stroke-dashoffset", (length * (1 - pct / 100)).toString());
  }, [isPostPage]);

  // 滚动监听（使用 rAF 节流，进一步减少主线程压力）
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress);
    onScroll(); // 初始调用

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [updateProgress]);

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
        className={`relative flex items-center justify-center w-14 h-14 pointer-events-auto transition-all duration-300 active:scale-90 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        onClick={() => scrollTo()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") scrollTo();
        }}
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
            // 不在此处设置 dasharray / dashoffset，完全由 JS 控制
          />
        </svg>
        <button
          aria-label="回到顶部"
          className="fuwari-card-base w-full h-full flex items-center justify-center rounded-2xl shadow-md hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) transition-all pointer-events-none"
        >
          <Rocket size={28} strokeWidth={2} />
        </button>
      </div>

      {/* 跳转评论区按钮（仅文章页且非客邸文章，无描边） */}
      {isPostPage && !isGuestPost && (
        <div
          className={`flex items-center justify-center w-14 h-14 pointer-events-auto transition-all duration-300 active:scale-90 ${
            visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <button
            onClick={() => scrollTo("#comment-section")}
            aria-label="跳转评论区"
            className="fuwari-card-base w-full h-full flex items-center justify-center rounded-2xl shadow-md hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) transition-all"
          >
            <MessageCircle size={28} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
