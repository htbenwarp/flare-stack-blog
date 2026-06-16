import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const bannerHeight = window.innerHeight * 0.35;
      setIsVisible(window.scrollY > bannerHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        // 固定在视口右下角，但上移留出音乐按钮空间
        "fixed right-7 bottom-25 z-40 transition-all duration-300",
        isVisible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-90 translate-y-2 pointer-events-none",
      )}
    >
      <button
        onClick={scrollToTop}
        aria-label={m.post_back_to_top()}
        className="flex items-center justify-center w-12 h-12 md:w-15 md:h-15 rounded-2xl fuwari-card-base hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) shadow-md transition-all active:scale-90"
      >
        <ArrowUp className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}