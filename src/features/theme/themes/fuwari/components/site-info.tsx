import { useSiteStats } from "@/hooks/use-site-stats";
import { blogConfig } from "@/blog.config";
import { m } from "@/paraglide/messages";
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";
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
  const { data, isLoading } = useSiteStats();

  return (
    <div className="fuwari-card-base pb-4 transition-all duration-300">
      {/* 标题区域：左侧竖杠 + 文字（与标签卡片一致） */}
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-4">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        {m.site_info_title()}
      </div>

      {/* 数据列表 */}
      <div className="px-4 space-y-3 text-sm">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <BubbleSkeleton index={i} isStatic className="h-4 w-4" />
              <BubbleSkeleton index={i} className="h-4 w-3/5" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="flex items-center gap-3 fuwari-text-70">
              <Clock size={16} className="shrink-0 text-(--fuwari-primary)" />
              <span>
                {m.stats_runtime()}:{" "}
                {formatRuntime(data.startDate ?? blogConfig.startDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 fuwari-text-70">
              <FileText size={16} className="shrink-0 text-(--fuwari-primary)" />
              <span>
                {m.stats_articles()}:{" "}
                {(data.articleCount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 fuwari-text-70">
              <PencilLine size={16} className="shrink-0 text-(--fuwari-primary)" />
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
        ) : (
          <p className="text-xs fuwari-text-50">{m.site_info_no_data?.() ?? "暂无数据"}</p>
        )}
      </div>
    </div>
  );
}
