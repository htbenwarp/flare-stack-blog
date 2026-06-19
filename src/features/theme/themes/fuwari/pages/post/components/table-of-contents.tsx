import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { cn } from "@/lib/utils";

export default function TableOfContents({
  headers,
  variant = "fixed",
}: {
  headers: Array<TableOfContentsItem>;
  variant?: "fixed" | "inline";
}) {
  const [activeIndices, setActiveIndices] = useState<Array<number>>([]);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tocRootRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({ top: 0, height: 0, opacity: 0 });

  const minDepth = useMemo(() => {
    if (headers.length === 0) return 10;
    let min = 10;
    for (const heading of headers) {
      if (heading.level < min) min = heading.level;
    }
    return min;
  }, [headers]);

  const maxLevel = 3;

  const removeTailingHash = (text: string) => {
    const lastIndexOfHash = text.lastIndexOf("#");
    if (lastIndexOfHash !== -1 && lastIndexOfHash === text.length - 1) {
      return text.substring(0, lastIndexOfHash);
    }
    return text;
  };

  // 仅 fixed 模式需要滚动可见性
  useEffect(() => {
    if (variant !== "fixed") return;
    const handleScrollVisibility = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 350);
    };
    window.addEventListener("scroll", handleScrollVisibility, { passive: true });
    handleScrollVisibility();
    return () => window.removeEventListener("scroll", handleScrollVisibility);
  }, [variant]);

  const computeActiveHeadings = useCallback(() => {
    if (headers.length === 0) return;
    const active: Array<boolean> = new Array(headers.length).fill(false);
    for (let i = 0; i < headers.length; i++) {
      const heading = document.getElementById(headers[i].id);
      if (!heading) continue;
      const rect = heading.getBoundingClientRect();
      const sectionTop = rect.top;
      let sectionBottom: number;
      if (i < headers.length - 1) {
        const nextHeading = document.getElementById(headers[i + 1].id);
        sectionBottom = nextHeading
          ? nextHeading.getBoundingClientRect().top
          : window.innerHeight;
      } else {
        const content = heading.closest(".fuwari-custom-md");
        sectionBottom = content
          ? content.getBoundingClientRect().bottom
          : document.documentElement.scrollHeight - window.scrollY;
      }
      const isInViewport =
        (sectionTop >= -1 && sectionTop < window.innerHeight) ||
        (sectionBottom > 1 && sectionBottom <= window.innerHeight) ||
        (sectionTop < 0 && sectionBottom > window.innerHeight);
      if (isInViewport) active[i] = true;
      else if (sectionTop > window.innerHeight) break;
    }
    const newActiveIndices: Array<number> = [];
    let i = active.length - 1;
    let minIdx = active.length - 1;
    let maxIdx = -1;
    while (i >= 0 && !active[i]) i--;
    while (i >= 0 && active[i]) {
      minIdx = Math.min(minIdx, i);
      maxIdx = Math.max(maxIdx, i);
      i--;
    }
    if (minIdx <= maxIdx) {
      for (let j = minIdx; j <= maxIdx; j++) newActiveIndices.push(j);
    }
    setActiveIndices((prev) =>
      JSON.stringify(prev) === JSON.stringify(newActiveIndices)
        ? prev
        : newActiveIndices,
    );
  }, [headers]);

  useEffect(() => {
    computeActiveHeadings();
    setActiveIndices([]);
    setIsReady(false);
    const timer = setTimeout(() => {
      setIsReady(true);
      computeActiveHeadings();
    }, 600);
    window.addEventListener("scroll", computeActiveHeadings, { passive: true });
    window.addEventListener("resize", computeActiveHeadings);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", computeActiveHeadings);
      window.removeEventListener("resize", computeActiveHeadings);
    };
  }, [headers, computeActiveHeadings]);

  useEffect(() => {
    if (
      variant !== "fixed" ||
      activeIndices.length === 0 ||
      !linksContainerRef.current
    ) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const firstIdx = activeIndices[0];
    const lastIdx = activeIndices[activeIndices.length - 1];
    if (!headers[firstIdx] || !headers[lastIdx]) return;
    const firstLink =
      linksContainerRef.current.querySelector<HTMLElement>(
        `a[href="#${headers[firstIdx].id}"]`,
      );
    const lastLink =
      linksContainerRef.current.querySelector<HTMLElement>(
        `a[href="#${headers[lastIdx].id}"]`,
      );
    if (firstLink && lastLink) {
      const top = firstLink.offsetTop;
      const height =
        lastLink.offsetHeight + lastLink.offsetTop - firstLink.offsetTop;
      setIndicatorStyle({ top, height, opacity: 1 });
      if (tocRootRef.current) {
        const tocHeight = tocRootRef.current.clientHeight;
        const scrollTarget =
          height < 0.9 * tocHeight
            ? top - 32
            : lastLink.offsetTop + lastLink.offsetHeight - tocHeight * 0.8;
        tocRootRef.current.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      }
    }
  }, [activeIndices, headers, variant]);

  if (headers.length === 0) return null;

  let h1Count = 1;

  return (
    <nav
      ref={navRef}
      className={cn(
        variant === "fixed" && "sticky top-14 self-start block w-full",
        variant === "inline" && "relative",
        variant === "fixed" && isVisible && isReady
          ? "opacity-100 translate-y-0"
          : variant === "fixed" &&
              "opacity-0 translate-y-4 pointer-events-none",
        "transition-all duration-500",
      )}
    >
      <div
        ref={tocRootRef}
        className={cn(
          variant === "fixed" &&
            "relative toc-root overflow-y-scroll overflow-x-hidden fuwari-toc-scrollbar h-[calc(100vh-20rem)]",
          variant === "inline" && "",
        )}
        style={
          variant === "fixed"
            ? {
                scrollBehavior: "smooth",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 2rem, black calc(100% - 2rem), transparent 100%)",
              }
            : undefined
        }
      >
        {variant === "fixed" && <div className="h-8 w-full" />}
        <div
          ref={linksContainerRef}
          className="group relative flex flex-col w-full"
        >
          {headers
            .filter((heading) => heading.level < minDepth + maxLevel)
            .map((heading) => {
              const text = removeTailingHash(heading.text);
              const isH1 = heading.level === minDepth;
              const isH2 = heading.level === minDepth + 1;
              const isH3 = heading.level === minDepth + 2;
              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      const top =
                        element.getBoundingClientRect().top +
                        window.scrollY -
                        80;
                      window.scrollTo({ top, behavior: "smooth" });
                      navigate({ hash: heading.id, replace: true });
                    }
                  }}
                  className={cn(
                    "px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl py-2 z-10",
                    "hover:bg-(--fuwari-toc-btn-hover) active:bg-(--fuwari-toc-btn-active)",
                  )}
                >
                  <div
                    className={cn(
                      "transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold",
                      {
                        "bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)":
                          isH1,
                        "ml-4": isH2,
                        "ml-8": isH3,
                      },
                    )}
                  >
                    {isH1 && h1Count++}
                    {isH2 && (
                      <div className="transition w-2 h-2 rounded-[0.1875rem] bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg)" />
                    )}
                    {isH3 && (
                      <div className="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10" />
                    )}
                  </div>
                  <div
                    className={cn("transition text-sm", {
                      "fuwari-text-50": isH1 || isH2,
                      "fuwari-text-30": isH3,
                    })}
                  >
                    {text}
                  </div>
                </a>
              );
            })}

          {/* ✅ 激活指示器 — 添加了 transition-colors 消除主题切换闪杠 */}
          {variant === "fixed" && headers.length > 0 && (
            <div
              className={cn(
                "absolute left-0 right-0 rounded-xl transition-all duration-300 ease-out -z-10 border-2 border-dashed pointer-events-none",
                "bg-(--fuwari-toc-btn-hover) border-(--fuwari-toc-btn-hover) group-hover:bg-transparent group-hover:border-(--fuwari-toc-btn-active)",
                "transition-colors duration-200", // ← 关键：平滑主题切换
              )}
              style={{
                top: `${indicatorStyle.top}px`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
              }}
            />
          )}
        </div>
        {variant === "fixed" && <div className="h-8 w-full" />}
      </div>
    </nav>
  );
}