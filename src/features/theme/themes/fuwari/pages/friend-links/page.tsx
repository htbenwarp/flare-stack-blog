import { Link, useRouteContext } from "@tanstack/react-router";
import { Copy, Check, Rss, Link as LinkIcon, Globe, User } from "lucide-react";
import { useState } from "react";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { FriendCard } from "./components/friend-card";
import { RandomRead } from "@/components/ui/random-read";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const site = siteConfig;

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // ✅ 从 siteConfig 读取站点信息
  const blogInfo = {
    siteName: site?.title ?? "站点名称",
    siteUrl: window.location.origin,
    siteDescription: site?.description ?? "",
    siteAvatar: site?.icons?.appleTouchIcon ?? site?.icons?.faviconSvg ?? "",
    rssUrl: "/rss.xml",
    friendLinkUrl: "/friend-links",
  };

  const handleCopy = () => {
    setCopyError(null);

    if (!blogInfo.siteName) {
      setCopyError("站点信息未配置");
      return;
    }

    const text = `
站点名称：${blogInfo.siteName}
站点地址：${blogInfo.siteUrl}
站点简介：${blogInfo.siteDescription || ""}
头像地址：${blogInfo.siteAvatar || blogInfo.siteUrl + "/favicon.svg"}
RSS地址：${blogInfo.rssUrl}
友链页面：${blogInfo.friendLinkUrl}
    `.trim();

    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      },
      () => {
        setCopyError("复制失败，请手动复制");
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
        <h1 className="text-2xl md:text-3xl font-bold fuwari-text-90 mb-4 z-10 transition-colors">
          {m.friend_links_title()}
        </h1>
        <p className="text-sm md:text-base fuwari-text-50 text-center max-w-xl z-10 transition-colors">
          {m.friend_links_fuwari_desc()}
        </p>
        <Link
          to="/submit-friend-link"
          className="mt-6 z-10 fuwari-onload-animation fuwari-btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all"
        >
          {m.friend_links_fuwari_apply()}
        </Link>
      </div>

      {/* 随机一读 */}
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

      {/* 本站信息卡片 */}
      <div
        className="fuwari-card-base p-5 md:p-6 fuwari-onload-animation border border-(--fuwari-primary)/10 bg-(--fuwari-primary)/5"
        style={{ animationDelay: "450ms" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* 左侧信息 */}
          <div className="flex items-center gap-4 min-w-0">
            {blogInfo.siteAvatar ? (
              <img
                src={blogInfo.siteAvatar}
                alt={blogInfo.siteName}
                className="w-12 h-12 rounded-full border-2 border-(--fuwari-primary)/20 object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-(--fuwari-primary)/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-(--fuwari-primary)/50" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold fuwari-text-90 truncate">
                  {blogInfo.siteName}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest shrink-0">
                  本站
                </span>
              </div>
              {blogInfo.siteDescription && (
                <p className="text-xs fuwari-text-50 truncate">
                  {blogInfo.siteDescription}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <a
                  href={blogInfo.rssUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                >
                  <Rss className="w-3 h-3" /> RSS
                </a>
                <a
                  href={blogInfo.friendLinkUrl}
                  className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                >
                  <LinkIcon className="w-3 h-3" /> 友链
                </a>
                <a
                  href={blogInfo.siteUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-0.5 hover:text-(--fuwari-primary) transition-colors"
                >
                  <Globe className="w-3 h-3" /> 访问
                </a>
              </div>
            </div>
          </div>

          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            disabled={!blogInfo.siteName}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 bg-(--fuwari-primary)/10 text-(--fuwari-primary) hover:bg-(--fuwari-primary)/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "已复制" : "复制本站信息"}
          </button>
        </div>

        {copyError && (
          <p className="mt-2 text-xs text-red-500">{copyError}</p>
        )}
      </div>
    </div>
  );
}