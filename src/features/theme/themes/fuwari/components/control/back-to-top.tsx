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

  const [mobileActive, setMobileActive] = useState(false);
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressPathRef = useRef<SVGPathElement>(null);
  const pathLengthRef = useRef(208);
  const rafIdRef = useRef<number | null>(null);
  const roundedRectPath =
    "M 18 4 L 42 4 Q 56 4 56 18 L 56 42 Q 56 56 42 56 L 18 56 Q 4 56 4 42 L 4 18 Q 4 4 18 4 Z";
  
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
    onScroll(); 

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
      className={`fixed right-6 bottom-23 z-40 flex flex-col gap-3 items-center pointer-events-none transition-opacity duration-300 ${
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
