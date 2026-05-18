import { useSiteStats } from "@/hooks/use-site-stats";
import { blogConfig } from "@/blog.config";
import { m } from "@/paraglide/messages";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, PencilLine, Eye } from "lucide-react";

function formatRuntime(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  if (years > 0) {
    return `${years} ${m.stats_years()} ${remainingDays} ${m.stats_days()}`;
  }
  return `${days} ${m.stats_days()}`;
}

export function SiteInfo() {
  const { data, isLoading, error } = useSiteStats();

  return (
    <div className="fuwari-card-base rounded-(--fuwari-radius-large) p-6">
      <h2 className="text-xl font-bold mb-4 fuwari-text-90">
        {m.site_info_title()}
      </h2>
         {/* 🔍 临时调试面板 */}
      <div className="text-xs break-all bg-yellow-100 dark:bg-yellow-900 p-2 rounded mb-2">
        <div>isLoading: {String(isLoading)}</div>
        <div>hasData: {String(!!data)}</div>
        <div>error: {error ? (error as Error).message : "none"}</div>
        {data && <pre className="mt-1">{JSON.stringify(data, null, 2)}</pre>}
      </div>

      <div className="space-y-3 text-sm">
        {isLoading ? (
          // 骨架屏
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
            </div>
          ))
        ) : error || !data ? (
          // 错误或空数据回退
          <p className="text-xs fuwari-text-50">
            {m.site_info_no_data?.() ?? "暂无数据"}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 fuwari-text-70">
              <Clock size={16} className="shrink-0 text-(--fuwari-primary)" />
              <span>
                {m.stats_runtime()}:{" "}
                {formatRuntime(data.startDate ?? blogConfig.startDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 fuwari-text-70">
              <FileText
                size={16}
                className="shrink-0 text-(--fuwari-primary)"
              />
              <span>
                {m.stats_articles()}:{" "}
                {(data.articleCount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 fuwari-text-70">
              <PencilLine
                size={16}
                className="shrink-0 text-(--fuwari-primary)"
              />
              <span>
                {m.stats_total_words()}:{" "}
                {(data.totalChars ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 fuwari-text-70">
              <Eye size={16} className="shrink-0 text-(--fuwari-primary)" />
              <span>
                {m.stats_pageviews()}:{" "}
                {(data.totalPageviews ?? 0).toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
