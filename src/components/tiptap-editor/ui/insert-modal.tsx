import { ClientOnly } from "@tanstack/react-router";
import {
  Check,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Search,
  X,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import type React from "react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { m } from "@/paraglide/messages";

export type ModalType =
  | "LINK"
  | "IMAGE"
  | "FOOTNOTE"
  | "GITHUB_CARD"
  | "IFRAME"
  | null;

interface InsertModalProps {
  type: ModalType;
  initialUrl?: string;
  initialText?: string;
  onClose: () => void;
  onSubmit: (
    url: string,
    attrs?: { width?: number; height?: number },
    nodeData?: { type: string; attrs?: Record<string, any>; content?: any[] },
  ) => void;
}

const MediaItem = memo(
  ({
    media,
    isSelected,
    onSelect,
  }: {
    media: MediaAsset;
    isSelected: boolean;
    onSelect: (m: MediaAsset) => void;
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
      <div
        onClick={() => onSelect(media)}
        className={`
          relative aspect-square border cursor-pointer transition-all duration-500 bg-muted/30 group overflow-hidden rounded-sm
          ${
            isSelected
              ? "border-primary opacity-100 shadow-lg"
              : "border-border opacity-60 hover:opacity-100 hover:border-foreground"
          }
        `}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <ImageIcon size={18} className="text-muted-foreground/30" />
          </div>
        )}
        <img
          src={getOptimizedImageUrl(media.key)}
          alt={media.fileName}
          className={`w-full h-full object-cover transition-all duration-1000 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${isSelected ? "scale-105" : "group-hover:scale-110"}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
              <Check size={14} strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
    );
  },
);
MediaItem.displayName = "MediaItem";

const InsertModalInternal: React.FC<InsertModalProps> = ({
  type,
  initialUrl = "",
  initialText = "",
  onClose,
  onSubmit,
}) => {
  const isMounted = !!type;
  const shouldRender = useDelayUnmount(isMounted, 500);
  const [activeType, setActiveType] = useState<ModalType>(type);

  useEffect(() => {
    if (type) setActiveType(type);
  }, [type]);

  // 链接/图片状态
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);

  const {
    mediaItems,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
  } = useMediaPicker();

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    if (type) {
      setInputUrl(initialUrl);
      setSelectedMedia(null);
      setSearchQuery("");
    }
  }, [initialUrl, type, setSearchQuery]);

  // 扩展功能状态
  const [footnoteText, setFootnoteText] = useState(initialText || "");
  const [footnoteNote, setFootnoteNote] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  // 重置状态
  useEffect(() => {
    if (type === "FOOTNOTE") {
      setFootnoteText(initialText || "");
      setFootnoteNote("");
    }
  }, [type, initialText]);

  useEffect(() => {
    if (type === "GITHUB_CARD") {
      setGithubUrl("");
    }
  }, [type]);

  useEffect(() => {
    if (type === "IFRAME") {
      setIframeCode("");
    }
  }, [type]);

  const handleSubmit = () => {
    const trimmed = inputUrl.trim();

    if (activeType === "LINK") {
      if (trimmed || initialUrl.trim()) onSubmit(trimmed);
      return;
    }

    if (activeType === "IMAGE") {
      if (trimmed) {
        if (selectedMedia && selectedMedia.url === trimmed) {
          onSubmit(trimmed, {
            width: selectedMedia.width || undefined,
            height: selectedMedia.height || undefined,
          });
        } else {
          onSubmit(trimmed);
        }
      }
      return;
    }

    if (activeType === "FOOTNOTE") {
      if (!footnoteText.trim() || !footnoteNote.trim()) return;
      onSubmit("", undefined, {
        type: "footnoteTip",
        attrs: { text: footnoteText, note: footnoteNote },
      });
      return;
    }

    if (activeType === "GITHUB_CARD") {
      if (!githubUrl.trim()) return;
      onSubmit(githubUrl.trim());
      return;
    }

    if (activeType === "IFRAME") {
      if (!iframeCode.trim()) return;

      // 尝试解析 iframe 标签
      const parser = new DOMParser();
      const doc = parser.parseFromString(iframeCode, "text/html");
      const iframeEl = doc.querySelector("iframe");

      if (!iframeEl) {
        // 如果是纯 URL，构造一个基础的 iframe
        const trimmedCode = iframeCode.trim();
        if (trimmedCode.startsWith("http://") || trimmedCode.startsWith("https://")) {
          onSubmit("", undefined, {
            type: "iframe",
            attrs: {
              src: trimmedCode,
              width: "100%",
              height: "400",
              allowFullscreen: true,
              frameborder: "0",
            },
          });
        }
        return;
      }

      // 解析所有属性
      const attrs: Record<string, any> = {};

      // 基本属性
      const src = iframeEl.getAttribute("src");
      if (src) attrs.src = src;

      const width = iframeEl.getAttribute("width");
      if (width) attrs.width = width;

      const height = iframeEl.getAttribute("height");
      if (height) attrs.height = height;

      const title = iframeEl.getAttribute("title");
      if (title) attrs.title = title;

      const loading = iframeEl.getAttribute("loading");
      if (loading) attrs.loading = loading;

      // 网易云等平台特有的属性
      const frameborder = iframeEl.getAttribute("frameborder");
      if (frameborder !== null) attrs.frameborder = frameborder;

      const border = iframeEl.getAttribute("border");
      if (border !== null) attrs.border = border;

      const marginwidth = iframeEl.getAttribute("marginwidth");
      if (marginwidth !== null) attrs.marginwidth = marginwidth;

      const marginheight = iframeEl.getAttribute("marginheight");
      if (marginheight !== null) attrs.marginheight = marginheight;

      const scrolling = iframeEl.getAttribute("scrolling");
      if (scrolling) attrs.scrolling = scrolling;

      const allow = iframeEl.getAttribute("allow");
      if (allow) attrs.allow = allow;

      const sandbox = iframeEl.getAttribute("sandbox");
      if (sandbox) attrs.sandbox = sandbox;

      const referrerpolicy = iframeEl.getAttribute("referrerpolicy");
      if (referrerpolicy) attrs.referrerpolicy = referrerpolicy;

      // allowfullscreen 特殊处理
      attrs.allowFullscreen = iframeEl.hasAttribute("allowfullscreen");

      onSubmit("", undefined, {
        type: "iframe",
        attrs,
      });
      return;
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ease-out ${
        isMounted
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`
          relative w-full max-w-2xl bg-background border border-border shadow-2xl 
          flex flex-col overflow-hidden rounded-none max-h-[80vh] transition-all duration-300 ease-out transform
          ${isMounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0"}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 border border-border bg-background text-foreground">
              {activeType === "LINK" ? (
                <LinkIcon size={14} />
              ) : activeType === "IMAGE" ? (
                <ImageIcon size={14} />
              ) : activeType === "FOOTNOTE" ? (
                <Bookmark size={14} />
              ) : activeType === "GITHUB_CARD" ? (
                <ExternalLink size={14} />
              ) : activeType === "IFRAME" ? (
                <LinkIcon size={14} />
              ) : null}
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground leading-none mb-1">
                COMMAND
              </span>
              <span className="text-base font-bold font-mono tracking-wider text-foreground uppercase">
                {activeType === "LINK"
                  ? m.editor_insert_link_title()
                  : activeType === "IMAGE"
                    ? m.editor_insert_media_title()
                    : activeType === "FOOTNOTE"
                      ? m.editor_insert_footnote_title?.() ?? "插入脚注"
                      : activeType === "GITHUB_CARD"
                        ? m.editor_insert_github_card_title?.() ?? "插入GitHub卡片"
                        : activeType === "IFRAME"
                          ? m.editor_insert_iframe_title?.() ?? "插入嵌入代码"
                          : ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/10"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-background">
          {/* 图片搜索区域 */}
          {activeType === "IMAGE" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="relative shrink-0 border-b border-border/50">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <input
                  type="text"
                  placeholder={m.editor_insert_search_placeholder()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-foreground text-sm font-mono pl-12 pr-6 py-4 focus:ring-0 placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/5">
                {isPending ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-muted/20 animate-pulse border border-border/20"
                      />
                    ))}
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Search size={24} className="opacity-20" />
                    <span className="text-sm font-mono">
                      {m.media_grid_empty()}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 content-start pb-4">
                    {mediaItems.map((media) => (
                      <MediaItem
                        key={media.key}
                        media={media}
                        isSelected={selectedMedia?.key === media.key}
                        onSelect={(asset) => {
                          setSelectedMedia(asset);
                          setInputUrl(asset.url);
                        }}
                      />
                    ))}
                    <div
                      ref={observerTarget}
                      className="col-span-full h-8 flex items-center justify-center p-4"
                    >
                      {isLoadingMore && (
                        <Loader2
                          size={14}
                          className="animate-spin text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 脚注表单 */}
          {activeType === "FOOTNOTE" && (
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder={
                  m.editor_insert_footnote_text_placeholder?.() ?? "提示文本"
                }
                value={footnoteText}
                onChange={(e) => setFootnoteText(e.target.value)}
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 px-4 focus:border-foreground focus:outline-none"
              />
              <textarea
                placeholder={
                  m.editor_insert_footnote_note_placeholder?.() ?? "脚注内容"
                }
                value={footnoteNote}
                onChange={(e) => setFootnoteNote(e.target.value)}
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 px-4 focus:border-foreground focus:outline-none resize-none"
                rows={3}
              />
            </div>
          )}

          {/* GitHub 卡片表单 */}
          {activeType === "GITHUB_CARD" && (
            <div className="p-6">
              <input
                type="text"
                placeholder={
                  m.editor_insert_github_url_placeholder?.() ??
                  "https://github.com/user/repo"
                }
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 px-4 focus:border-foreground focus:outline-none"
              />
            </div>
          )}

          {/* iframe 表单 */}
          {activeType === "IFRAME" && (
            <div className="p-6 space-y-2">
              <textarea
                placeholder={
                  m.editor_insert_iframe_placeholder?.() ??
                  '粘贴 iframe 代码，例如：<iframe src="https://..." width="100%" height="400"></iframe>'
                }
                value={iframeCode}
                onChange={(e) => setIframeCode(e.target.value)}
                className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 px-4 focus:border-foreground focus:outline-none resize-y"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {m.editor_insert_iframe_hint?.() ??
                  "支持 iframe 标签，自动解析 src, width, height, allowfullscreen 等属性"}
              </p>
            </div>
          )}

          {/* URL 输入区域（链接/图片） */}
          {(activeType === "LINK" || activeType === "IMAGE") && (
            <div className="p-6 space-y-4 border-t border-border/50 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={12} className="text-muted-foreground" />
                <label className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
                  {activeType === "IMAGE"
                    ? m.editor_insert_external_link()
                    : m.editor_insert_target_url()}
                </label>
              </div>
              <div className="group relative">
                <input
                  type="text"
                  autoFocus={activeType === "LINK"}
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (selectedMedia) setSelectedMedia(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="https://..."
                  className="w-full bg-transparent border-b border-border text-foreground font-mono text-base py-2 pl-4 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-0 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border-r border-border/50"
          >
            [ {m.editor_insert_cancel()} ]
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
          >
            [ {m.editor_insert_confirm()} ]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const InsertModal: React.FC<InsertModalProps> = (props) => (
  <ClientOnly>
    <InsertModalInternal {...props} />
  </ClientOnly>
);

export default InsertModal;