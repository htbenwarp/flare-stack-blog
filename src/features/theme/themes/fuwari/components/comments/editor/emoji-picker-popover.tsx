"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// 常用表情快捷面板
const QUICK_EMOJIS = [
  { category: "常用", emojis: ["😊", "😂", "❤️", "👍", "🔥", "✨", "💡", "🤔", "👏", "🎉", "🙏", "😅"] },
  { category: "心情", emojis: ["😍", "🥰", "😘", "😎", "🤩", "🥳", "😤", "😭", "😢", "🥺", "🤗", "😇"] },
  { category: "手势", emojis: ["👋", "🤝", "✌️", "🤞", "👌", "🙌", "💪", "🤙", "🫶", "👀", "🤌", "🖐️"] },
  { category: "符号", emojis: ["⭐", "🌟", "💯", "🔰", "✅", "❌", "💎", "🚀", "📌", "🎯", "🏆", "💥"] },
];

type QuickCategory = typeof QUICK_EMOJIS[number]["category"];

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

// 动态导入完整选择器（按需加载，但这里我们是静态导入，不过可以配合 React.lazy）
const EmojiPicker = lazy(() =>
  import("emoji-picker-react").then((mod) => ({ default: mod.default }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-[400px] w-[352px]">
    <div className="animate-pulse text-sm text-gray-400">加载表情中...</div>
  </div>
);

export function EmojiPickerPopover({
  onEmojiSelect,
  onClose,
  className,
}: EmojiPickerPopoverProps) {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState<QuickCategory>("常用");
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleQuickEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
  };

  // 快速面板
  const QuickPanel = () => (
    <div className="w-[340px] max-h-[380px] flex flex-col">
      {/* 分类标签 */}
      <div className="flex border-b border-black/5 dark:border-white/5 px-2 py-1.5 gap-0.5 overflow-x-auto">
        {QUICK_EMOJIS.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md transition-all whitespace-nowrap",
              "hover:bg-black/5 dark:hover:bg-white/10",
              activeCategory === cat.category
                ? "bg-(--fuwari-primary) text-white dark:text-black/75"
                : "text-gray-600 dark:text-gray-400"
            )}
            type="button"
          >
            {cat.category}
          </button>
        ))}
      </div>

      {/* 表情网格 */}
      <div className="p-3 overflow-y-auto max-h-[280px]">
        {QUICK_EMOJIS.map(
          (cat) =>
            cat.category === activeCategory && (
              <div key={cat.category}>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleQuickEmojiClick(emoji)}
                      className="text-2xl p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-black/5 dark:border-white/5 px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          点击插入 · ESC 关闭
        </span>
        <button
          onClick={() => setShowFullPicker(true)}
          className={cn(
            "text-xs flex items-center gap-1 px-2.5 py-1 rounded-md",
            "text-(--fuwari-primary) hover:bg-(--fuwari-primary)/10",
            "transition-colors font-medium"
          )}
          type="button"
        >
          更多表情
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  // 完整选择器
  const FullPickerPanel = () => (
    <div className="relative w-[352px]">
      <button
        onClick={() => setShowFullPicker(false)}
        className={cn(
          "absolute top-2 left-2 z-10",
          "p-1.5 rounded-md",
          "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
          "hover:bg-white dark:hover:bg-gray-700",
          "border border-black/10 dark:border-white/10",
          "transition-colors"
        )}
        type="button"
      >
        <ChevronLeft size={16} />
      </button>

      <Suspense fallback={<LoadingFallback />}>
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onEmojiSelect(emojiData.emoji);
          }}
          theme={isDark ? "dark" : "light"}
          emojiStyle="apple"
          searchPlaceholder="搜索表情..."
          width="100%"
          height="400px"
        />
      </Suspense>
    </div>
  );

  return (
    <div
      ref={popoverRef}
      className={cn(
        "bg-white dark:bg-gray-800",
        "rounded-xl shadow-2xl border border-black/10 dark:border-white/10",
        "overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-150",
        className
      )}
    >
      {showFullPicker ? <FullPickerPanel /> : <QuickPanel />}
    </div>
  );
}