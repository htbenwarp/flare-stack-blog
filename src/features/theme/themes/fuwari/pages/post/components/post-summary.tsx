import { Quote } from "lucide-react";
import { m } from "@/paraglide/messages";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface PostSummaryProps {
  summary?: string | null;
}

export function PostSummary({ summary }: PostSummaryProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullText = summary || "";

  // 重置并开始打字
  useEffect(() => {
    // 清空显示
    setDisplayText("");
    setIsTyping(false);
    setIsComplete(false);

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!fullText) return;

    // 延迟启动，让卡片先渲染出来
    const startDelay = setTimeout(() => {
      setIsTyping(true);
      let index = 0;

      const typeNextChar = () => {
        if (index < fullText.length) {
          setDisplayText(fullText.slice(0, index + 1));
          index++;
          timerRef.current = setTimeout(typeNextChar, 35); // 每个字符35ms
        } else {
          setIsTyping(false);
          setIsComplete(true);
          timerRef.current = null;
        }
      };

      timerRef.current = setTimeout(typeNextChar, 60);
    }, 400);

    return () => {
      clearTimeout(startDelay);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fullText]);

  if (!summary) return null;

  return (
    <div
      className="mb-4 md:mb-6 rounded-2xl bg-(--fuwari-primary)/5 border border-black/5 dark:border-white/10 p-4 md:p-5 flex items-start gap-3 md:gap-4 transition-all hover:bg-(--fuwari-primary)/10 fuwari-onload-animation backdrop-blur-sm"
      style={{ animationDelay: "200ms" }}
    >
      <div className="shrink-0 text-(--fuwari-primary) bg-(--fuwari-primary)/10 p-2 md:p-2.5 rounded-xl flex items-center justify-center mt-0.5">
        <Quote className="w-4 h-4 md:w-4.5 md:h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[11px] md:text-xs font-bold text-(--fuwari-primary) flex items-center mb-1 md:mb-1.5 uppercase tracking-[0.2em] opacity-80">
          {m.post_summary_title()}
        </h3>
        <p className="text-sm md:text-[15px] leading-relaxed fuwari-text-70 font-medium">
          {displayText}
          {/* 光标 */}
          <span
            className={cn(
              "inline-block w-0.5 h-[1em] ml-0.5 align-middle rounded-sm transition-opacity duration-200",
              isTyping || !isComplete ? "bg-(--fuwari-primary) opacity-100" : "opacity-0"
            )}
            style={{
              animation: isTyping || !isComplete ? "blink-caret 0.7s step-end infinite" : "none",
            }}
          />
        </p>
      </div>

      {/* 光标闪烁动画 */}
      <style>{`
        @keyframes blink-caret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}