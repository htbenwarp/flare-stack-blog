import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { getRandomReadFn } from "@/features/friend-links/api/random-read.api";
import { cn } from "@/lib/utils";

interface RandomReadArticle {
  title: string;
  link: string;
  source: string;
  sourceUrl: string;
}

export function RandomRead() {
  const [article, setArticle] = useState<RandomReadArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setArticle(null);

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ["random-read", Date.now()],
        queryFn: () => getRandomReadFn({ data: {} }),
        staleTime: 0,
      });

      if (result.success && result.article) {
        setArticle(result.article);
      } else {
        setError(result.message || "获取失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  return (
    <div className="fuwari-card-base p-5 transition-all hover:shadow-lg">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-(--fuwari-primary)" />
          <h3 className="text-sm font-bold fuwari-text-90">随机一读</h3>
          <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">
            FROM FRIENDS
          </span>
        </div>
        <button
          onClick={handleFetch}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-(--fuwari-primary)/10 text-(--fuwari-primary)",
            "hover:bg-(--fuwari-primary)/20 hover:scale-105 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isLoading ? "探索中..." : "摇一摇"}
        </button>
      </div>

      {/* 内容区 */}
      <div className="min-h-[4.5rem]">
        {/* 错误状态 */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500 py-2 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <span className="flex-1">{error}</span>
            <button
              onClick={handleFetch}
              className="text-(--fuwari-primary) hover:underline font-medium shrink-0"
            >
              重试
            </button>
          </div>
        )}

        {/* 文章展示 */}
        {article && !error && (
          <div className="p-4 rounded-xl bg-(--fuwari-primary)/5 border border-black/5 dark:border-white/5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex items-start gap-2">
                <span className="flex-1 font-medium text-sm fuwari-text-90 group-hover:text-(--fuwari-primary) transition-colors line-clamp-2">
                  {article.title}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground group-hover:text-(--fuwari-primary) transition-colors" />
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>📡</span>
                <span>{article.source}</span>
              </div>
            </a>
          </div>
        )}

        {/* 空状态 */}
        {!article && !error && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--fuwari-primary)/30 animate-pulse" />
            点击「摇一摇」从友链中随机发现一篇文章
          </div>
        )}
      </div>
    </div>
  );
}