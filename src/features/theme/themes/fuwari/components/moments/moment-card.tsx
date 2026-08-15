// src/features/theme/themes/fuwari/components/moments/moment-card.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";
import { LikeButton } from "@/features/theme/themes/fuwari/components/like-button";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { deleteMomentFn } from "@/features/moments/api/moments.api";
import type { JSONContent } from "@tiptap/react";
import PhotoSwipe from "photoswipe";
import "photoswipe/dist/photoswipe.css";

// ---------- 工具函数 ----------
function extractImageSrcs(doc: JSONContent | null): string[] {
  if (!doc) return [];
  const srcs: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "image" && node.attrs?.src) srcs.push(node.attrs.src);
    if (node.content) node.content.forEach(walk);
  };
  walk(doc);
  return srcs;
}

function extractTextWithLineBreaks(doc: JSONContent | null): string {
  if (!doc) return "";
  const lines: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "text" && node.text) lines.push(node.text);
    if (node.content) node.content.forEach(walk);
    if (["paragraph", "heading", "blockquote", "listItem"].includes(node.type || "")) {
      lines.push("\n");
    }
  };
  walk(doc);
  return lines.join("").trim();
}

// 提取 iframe 节点属性
function extractIframes(doc: JSONContent | null): Array<Record<string, any>> {
  if (!doc) return [];
  const iframes: any[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "iframe" && node.attrs) {
      iframes.push(node.attrs);
    }
    if (node.content) node.content.forEach(walk);
  };
  walk(doc);
  return iframes;
}

function getImageSrc(src: string): string {
  return src.toLowerCase().endsWith(".gif") ? `${src}?no-transform=1` : src;
}

// 全局尺寸缓存
const sizeCache = new Map<string, { w: number; h: number }>();

function cacheImageSize(img: HTMLImageElement) {
  const key = img.src.split('?')[0];
  if (!sizeCache.has(key) && img.naturalWidth && img.naturalHeight) {
    sizeCache.set(key, { w: img.naturalWidth, h: img.naturalHeight });
  }
}

// ---------- 图片网格 ----------
function ImageGrid({
  images,
  onImageClick,
}: {
  images: string[];
  onImageClick: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-none">
      {images.slice(0, 9).map((src, idx) => {
        const isLast = idx === 8 && images.length > 9;
        return (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-none cursor-pointer"
            onClick={() => onImageClick(idx)}
          >
            <img
              src={getImageSrc(src)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-none !m-0"
              loading="lazy"
              onLoad={(e) => cacheImageSize(e.currentTarget)}
            />
            {isLast && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-none">
                <span className="text-white text-lg font-bold">+{images.length - 9}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 文本折叠 ----------
function CollapsibleText({
  text,
  maxLines = 6,
  className,
}: {
  text: string;
  maxLines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.style.maxHeight = "none";
    const fullHeight = el.scrollHeight;
    const lineHeight = 1.25 * 16;
    const maxHeight = maxLines * lineHeight;

    const shouldCollapse = fullHeight > maxHeight;
    setNeedsCollapse(shouldCollapse);

    if (shouldCollapse && !expanded) {
      el.style.maxHeight = `${maxHeight}px`;
    } else {
      el.style.maxHeight = "none";
    }
  }, [text, expanded, maxLines]);

  const handleToggle = () => setExpanded(!expanded);

  return (
    <div>
      <div
        ref={containerRef}
        className={`whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${className}`}
      >
        {text}
      </div>
      {needsCollapse && (
        <button
          onClick={handleToggle}
          className="text-xs text-(--fuwari-primary) hover:underline mt-1"
        >
          {expanded ? "收起" : "展开更多"}
        </button>
      )}
    </div>
  );
}

// ---------- MomentCard 主组件 ----------
interface MomentCardProps {
  moment: {
    id: number;
    content: JSONContent;
    publishedAt: string | null;
    location?: string;
    deviceInfo?: Record<string, string>;
    author: { name: string; image?: string | null } | null;
  };
  isAdmin?: boolean;
  onEdit?: (moment: any) => void;
}

export function MomentCard({ moment, isAdmin, onEdit }: MomentCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteMomentFn({ data: { id: moment.id } }),
    onSuccess: () => {
      toast.success("动态已删除");
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      queryClient.invalidateQueries({ queryKey: ["moment-dates"] });
    },
    onError: () => toast.error("删除失败"),
  });

  const handleDelete = () => {
    if (window.confirm("确定删除这条动态吗？此操作不可撤销。")) deleteMutation.mutate();
  };

  const timeString = moment.publishedAt
    ? new Date(moment.publishedAt).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const deviceString = moment.deviceInfo
    ? [moment.deviceInfo.browser, moment.deviceInfo.os, moment.deviceInfo.device]
        .filter(Boolean)
        .join(" · ")
    : null;

  const likePath = `/moment/${moment.id}`;
  const images = extractImageSrcs(moment.content);
  const plainText = extractTextWithLineBreaks(moment.content);
  const iframes = extractIframes(moment.content);

  // 灯箱相关
  const galleryRef = useRef<PhotoSwipe | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const getImageSize = useCallback(
    async (src: string, signal?: AbortSignal): Promise<{ w: number; h: number } | null> => {
      if (signal?.aborted) return null;

      const url = getImageSrc(src);
      const key = src.split('?')[0];

      if (sizeCache.has(key)) return sizeCache.get(key)!;

      if (gridRef.current) {
        const imgs = gridRef.current.querySelectorAll('img');
        for (const img of imgs) {
          if (signal?.aborted) return null;

          if (img.src.split('?')[0] === key) {
            if (img.complete && img.naturalWidth) {
              const size = { w: img.naturalWidth, h: img.naturalHeight };
              sizeCache.set(key, size);
              return size;
            }
            if (!img.complete) {
              try {
                await new Promise<void>((resolve, reject) => {
                  if (signal?.aborted) {
                    reject(new Error('aborted'));
                    return;
                  }

                  const timeout = setTimeout(() => reject(new Error('timeout')), 3000);

                  const onAbort = () => {
                    clearTimeout(timeout);
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                    reject(new Error('aborted'));
                  };

                  const onLoad = () => {
                    clearTimeout(timeout);
                    signal?.removeEventListener('abort', onAbort);
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                    resolve();
                  };

                  const onError = () => {
                    clearTimeout(timeout);
                    signal?.removeEventListener('abort', onAbort);
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                    reject(new Error('error'));
                  };

                  signal?.addEventListener('abort', onAbort, { once: true });
                  img.addEventListener('load', onLoad, { once: true });
                  img.addEventListener('error', onError, { once: true });
                });

                if (img.naturalWidth) {
                  const size = { w: img.naturalWidth, h: img.naturalHeight };
                  sizeCache.set(key, size);
                  return size;
                }
              } catch {
                // ignore
              }
            }
            break;
          }
        }
      }

      return new Promise((resolve) => {
        if (signal?.aborted) {
          resolve(null);
          return;
        }

        const img = new Image();
        let settled = false;

        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            img.src = '';
            signal?.removeEventListener('abort', onAbort);
            resolve(null);
          }
        }, 5000);

        const onAbort = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            img.src = '';
            resolve(null);
          }
        };

        img.onload = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            const size = { w: img.naturalWidth, h: img.naturalHeight };
            sizeCache.set(key, size);
            resolve(size);
          }
        };

        img.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            resolve(null);
          }
        };

        signal?.addEventListener('abort', onAbort, { once: true });
        img.src = url;
      });
    },
    [],
  );

  const getSlidesData = useCallback(
    async (imgs: string[], signal?: AbortSignal) => {
      const concurrency = 3;
      const results: { src: string; msrc: string; w?: number; h?: number }[] = [];

      for (let i = 0; i < imgs.length; i += concurrency) {
        if (signal?.aborted) break;

        const batch = imgs.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async (src) => {
            if (signal?.aborted) return { src: getImageSrc(src), msrc: getImageSrc(src) };

            const url = getImageSrc(src);
            const size = await getImageSize(src, signal);
            return size
              ? { src: url, msrc: url, w: size.w, h: size.h }
              : { src: url, msrc: url };
          }),
        );
        results.push(...batchResults);
      }

      return results;
    },
    [getImageSize],
  );

  const openGallery = useCallback(
    async (index: number) => {
      if (images.length === 0) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (galleryRef.current) {
        galleryRef.current.destroy();
        galleryRef.current = null;
      }

      setGalleryLoading(true);

      try {
        const slides = await getSlidesData(images, abortController.signal);

        if (abortController.signal.aborted) return;

        const pswp = new PhotoSwipe({
          dataSource: slides,
          index,
          bgOpacity: 0.95,
          wheelToZoom: true,
          zoom: true,
          closeOnVerticalDrag: true,
          showHideAnimationType: 'fade',
        });

        pswp.on('destroy', () => {
          galleryRef.current = null;
        });

        pswp.init();
        galleryRef.current = pswp;
      } catch (error) {
        if (error instanceof Error && error.message !== 'aborted') {
          console.error('Failed to open gallery:', error);
          toast.error('打开图片浏览器失败');
        }
      } finally {
        setGalleryLoading(false);
      }
    },
    [images, getSlidesData],
  );

  const renderImages = () => {
    if (images.length === 0) return null;
    if (images.length === 1) {
      const originalUrl = getImageSrc(images[0]);
      return (
        <div ref={gridRef} className="cursor-pointer overflow-hidden rounded-none" onClick={() => openGallery(0)}>
          <img
            src={originalUrl}
            alt=""
            className="w-full h-auto max-h-[80vh] object-contain rounded-none !m-0"
            loading="lazy"
            onLoad={(e) => cacheImageSize(e.currentTarget)}
          />
        </div>
      );
    }
    return (
      <div ref={gridRef}>
        <ImageGrid images={images} onImageClick={openGallery} />
      </div>
    );
  };

  const renderIframes = () => {
    if (iframes.length === 0) return null;
    return (
      <div className="space-y-4 mt-2">
        {iframes.map((attrs, idx) => (
          <div key={idx} className="iframe-wrapper relative my-2">
            <iframe
              src={attrs.src}
              width={attrs.width || "100%"}
              height={attrs.height || "400"}
              allowFullscreen={attrs.allowFullscreen !== false}
              title={attrs.title || ""}
              loading={attrs.loading || "lazy"}
              frameBorder={attrs.frameborder || "0"}
              className="w-full rounded-lg border border-border"
              {...(attrs.sandbox && { sandbox: attrs.sandbox })}
              {...(attrs.allow && { allow: attrs.allow })}
              {...(attrs.scrolling && { scrolling: attrs.scrolling })}
              {...(attrs.referrerpolicy && { referrerpolicy: attrs.referrerpolicy })}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fuwari-card-base p-4 md:p-6 space-y-4 w-full relative">
      {galleryLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-(--fuwari-card-bg) rounded-(--fuwari-radius-large) p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="animate-spin text-(--fuwari-primary)" size={24} />
            <span className="text-sm fuwari-text-75">准备图片中...</span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          <button
            onClick={() => onEdit?.(moment)}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition"
            title="编辑"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition disabled:opacity-50"
            title="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {moment.author?.image ? (
          <img src={moment.author.image} alt={moment.author.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-(--fuwari-primary) flex items-center justify-center text-white text-xs font-bold">
            {(moment.author?.name ?? "博主").charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium fuwari-text-90">{moment.author?.name ?? "博主"}</p>
          <div className="flex items-center gap-2 text-xs fuwari-text-50">
            {timeString && <span>{timeString}</span>}
            {moment.location && (
              <>
                <span>·</span>
                <span>{moment.location}</span>
              </>
            )}
            {deviceString && (
              <>
                <span>·</span>
                <span>{deviceString}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fuwari-custom-md text-sm moment-content whitespace-pre-wrap">
        {plainText && <CollapsibleText text={plainText} maxLines={6} className="mb-2" />}
        {renderIframes()}
        {renderImages()}
        {!plainText && images.length === 0 && iframes.length === 0 && (
          <ContentRenderer content={moment.content} />
        )}
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-black/5 dark:border-white/5">
        <LikeButton path={likePath} simple />
      </div>

      <FuwariCommentSection postId={moment.id} collapsed />
    </div>
  );
}
