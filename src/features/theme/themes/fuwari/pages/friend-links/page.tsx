import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Rss, Link as LinkIcon, Globe, User, Loader2 } from "lucide-react";
import { useState } from "react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";
import { RandomRead } from "@/components/ui/random-read";
import { getSystemConfigFn } from "@/features/config/api/config.api";
import { toast } from "sonner";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => getSystemConfigFn({ data: {} }),
    staleTime: 5 * 60 * 1000,
  });

  const site = config?.site;

  const handleCopy = () => {
    setCopyError(null);

    if (!site?.title) {
      setCopyError("请先在后台设置站点信息");
      toast.error("请先在后台设置站点信息");
      return;
    }

    const siteUrl = window.location.origin;
    const rssUrl = siteUrl + "/rss.xml";
    const friendLinkUrl = siteUrl + "/friend-links";

    const text = `
站点名称：${site.title}
站点地址：${siteUrl}
站点简介：${site.description || ""}
头像地址：${site.icons?.appleTouchIcon || site.icons?.faviconSvg || siteUrl + "/favicon.svg"}
RSS地址：${rssUrl}
友链页面：${friendLinkUrl}
    `.trim();

    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        toast.success("本站信息已复制");
        setTimeout(() => setCopied(false), 3000);
      },
      () => {
        toast.error("复制失败，请手动复制");
      }
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Banner */}
      <div
        className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-56 fuwari-onload-animation bg-linear-to-br from-(--fuwari-primary)/5 to-transparent"
        style={{ animationDelay: "150ms" }}
      >
        <h1 className="text-3xl md:text-4xl font-bold fuwari-text-90 mb-4 z-10 transition-colors">
          {m.friend_links_title()}
        </h1>
        <p className="fuwari-text-50 text-center max-w-xl z-10 transition-colors">
          {m.friend_links_fuwari_desc()}
        </p>
        <Link
          to="/submit-friend-link"
          className="mt-6 z-10 fuwari-onload-animation fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all"
        >
          {m.friend_links_fuwari_apply()}
        </Link>
      </div>

      {/* 随机一读组件 */}
      <div className="fuwari-onload-animation" style={{ animationDelay: "200ms" }}>
        <RandomRead />
      </div>

      {/* Links Grid */}
      <div
        className="fuwari-card-base p-6 md:p-8 fuwari-onload-animation flex-1"
        style={{ animationDelay: "300ms" }}
      >
        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {links.map((link, i) => (
              <FriendCard
                key={link.id}
                link={link}
                className="fuwari-onload-animation"
                style={{ animationDelay: `${400 + i * 50}ms` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 fuwari-text-30 transition-colors">
            <p className="text-lg">{m.friend_links_fuwari_no_links()}</p>
          </div>
        )}
      </div>

      {/* 🆕 本站信息卡片 - 放在最下面 */}
      <div
        className="fuwari-card-base p-5 md:p-6 fuwari-onload-animation border border-(--fuwari-primary)/10 bg-(--fuwari-primary)/5"
        style={{ animationDelay: "450ms" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* 左侧信息 */}
          <div className="flex items-center gap-4 min-w-0">
            {/* 头像 */}
            {configLoading ? (
              <div className="w-12 h-12 rounded-full bg-muted/30 animate-pulse shrink-0" />
            ) : site?.icons?.appleTouchIcon || site?.icons?.faviconSvg ? (
              <img
                src={site.icons?.appleTouchIcon || site.icons?.faviconSvg}
                alt={site.title || "站点头像"}
                className="w-12 h-12 rounded-full border-2 border-(--fuwari-primary)/20 object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-(--fuwari-primary)/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-(--fuwari-primary)/50" />
              </div>
            )}

            {/* 文本信息 */}
            <div className="min-w-0 flex-1">
              {configLoading ? (
                <>
                  <div className="h-5 w-32 bg-muted/30 animate-pulse rounded" />
                  <div className="h-3 w-48 bg-muted/30 animate-pulse rounded mt-1.5" />
                </>
              ) : site?.title ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-bold fuwari-text-90 truncate">
                      {site.title}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest shrink-0">
                      本站
                    </span>
                  </div>
                  {site.description && (
                    <p className="text-xs fuwari-text-50 truncate">
                      {site.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <a
                      href={window.location.origin + "/rss.xml"}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                    >
                      <Rss className="w-3 h-3" /> RSS
                    </a>
                    <a
                      href={window.location.origin + "/friend-links"}
                      className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" /> 友链
                    </a>
                    <a
                      href={window.location.origin}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                    >
                      <Globe className="w-3 h-3" /> 访问
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  请在「后台 → 站点设置」中配置站点信息
                  <Link
                    to="/admin/settings"
                    className="ml-2 text-(--fuwari-primary) hover:underline"
                  >
                    去设置
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <button
            onClick={handleCopy}
            disabled={!site?.title || configLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 bg-(--fuwari-primary)/10 text-(--fuwari-primary) hover:bg-(--fuwari-primary)/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {configLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "已复制" : "复制本站信息"}
          </button>
        </div>

        {/* 复制失败提示 */}
        {copyError && (
          <p className="mt-2 text-xs text-red-500">{copyError}</p>
        )}
      </div>
    </div>
  );
}