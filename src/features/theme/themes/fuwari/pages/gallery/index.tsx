import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Shuffle } from "lucide-react";
import { getGalleryItemsFn } from "@/features/gallery/api/gallery.public.api";
import { getOptimizedImageUrl, getOriginalImageUrl } from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Skeleton } from "@/components/ui/skeleton";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import PhotoSwipe from "photoswipe";
import "photoswipe/dist/photoswipe.css";

interface GalleryItem {
  id: number;
  title: string;
  description: string;
  imageKey: string;
  tags: Array<{ id: number; name: string }>;
  sortOrder: number;
  imgWidth?: number;
  imgHeight?: number;
}

const BATCH = 12;
const GAP = 8;

// ---------- 图片组件 ----------
function GalleryImage({ item, colWidth }: { item: GalleryItem; colWidth: number }) {
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setLoaded(true);
  };

  const handleError = () => {
    setLoaded(true);
  };

  const aspectRatio = naturalSize
    ? `${naturalSize.w} / ${naturalSize.h}`
    : `${item.imgWidth || 1200} / ${item.imgHeight || 800}`;

  return (
    <div
      className="gallery-item overflow-hidden cursor-pointer relative"
      style={{
        aspectRatio,
        transition: "aspect-ratio 0.3s ease",
        backgroundColor: "#f0f0f0",
      }}
      data-title={item.title || undefined}
      data-description={item.description || undefined}
      data-pswp-src={getOriginalImageUrl(item.imageKey)}
      // 使用与网格图片相同的 800px 缩略图，保证缓存命中
      data-pswp-msrc={getOptimizedImageUrl(item.imageKey, 800)}
      data-pswp-width={naturalSize?.w || item.imgWidth || 1200}
      data-pswp-height={naturalSize?.h || item.imgHeight || 800}
    >
      <img
        src={getOptimizedImageUrl(item.imageKey, 800)}
        alt={item.title}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

export function GalleryPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["gallery", "public"],
    queryFn: () => getGalleryItemsFn(),
    staleTime: 5 * 60 * 1000,
  });

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [displayItems, setDisplayItems] = useState<GalleryItem[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  // 标签统计
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    (items ?? []).forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  // 初始化显示数据
  useEffect(() => {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    setDisplayItems(sorted);
    setLoadedCount(Math.min(BATCH, sorted.length));
  }, [items, activeTag]);

  // 筛选后的数据
  const filteredItems = useMemo(() => {
    return activeTag
      ? displayItems.filter((item) => item.tags.some((t) => t.name === activeTag))
      : displayItems;
  }, [displayItems, activeTag]);

  // 加载更多
  const loadMore = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + BATCH, filteredItems.length));
  }, [filteredItems.length]);

  // 随机排序
  const shuffle = useCallback(() => {
    const target = [...filteredItems];
    for (let i = target.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [target[i], target[j]] = [target[j], target[i]];
    }
    if (activeTag) {
      const newDisplay = displayItems.filter(
        (item) => !item.tags.some((t) => t.name === activeTag)
      );
      setDisplayItems([...newDisplay, ...target]);
    } else {
      setDisplayItems(target);
    }
    setLoadedCount((prev) => (prev === 0 ? BATCH : prev));
  }, [filteredItems, displayItems, activeTag]);

  // ---------- 瀑布流布局 ----------
  const masonryRef = useRef<HTMLDivElement>(null);
  const [colCount, setColCount] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024 ? 3 : 2
  );
  const [colWidth, setColWidth] = useState(200);

  const updateLayout = useCallback(() => {
    const masonry = masonryRef.current;
    if (!masonry) return;
    const totalWidth = masonry.getBoundingClientRect().width;
    const count = window.innerWidth >= 1024 ? 3 : 2;
    const maxColWidth = 320;
    const rawWidth = (totalWidth - GAP * (count - 1)) / count;
    setColWidth(Math.min(rawWidth, maxColWidth));
    setColCount(count);
  }, []);

  useEffect(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [updateLayout]);

  // ---------- PhotoSwipe 单例管理 ----------
  const lbRef = useRef<PhotoSwipeLightbox | null>(null);
  const isInitializedRef = useRef(false);
  const [needsRefresh, setNeedsRefresh] = useState(0);

  // 当图片列表变化时，标记需要刷新
  useEffect(() => {
    setNeedsRefresh((v) => v + 1);
  }, [displayItems, loadedCount]);

  // PhotoSwipe 初始化与刷新
  useEffect(() => {
    if (isLoading || !masonryRef.current) return;

    // 如果实例已存在，直接刷新
    if (lbRef.current) {
      try {
        requestAnimationFrame(() => {
          if (lbRef.current) {
            lbRef.current.refresh();
          }
        });
        return;
      } catch (error) {
        console.warn("PhotoSwipe refresh 失败，准备重建:", error);
        try {
          lbRef.current.destroy();
        } catch (_) {}
        lbRef.current = null;
        isInitializedRef.current = false;
      }
    }

    // 防止重复创建
    if (isInitializedRef.current && !lbRef.current) {
      isInitializedRef.current = false;
    }

    // 创建新实例（仅在首次或实例损坏时）
    if (!lbRef.current && !isInitializedRef.current) {
      try {
        const lb = new PhotoSwipeLightbox({
          gallery: "#gallery-masonry",
          children: ".gallery-item",
          pswpModule: PhotoSwipe,
          imageClickAction: "close",
          tapAction: "close",
          bgOpacity: 0.9,
          wheelToZoom: true,
          zoom: true,
          initialZoomLevel: "fit",
          secondaryZoomLevel: 2,
          maxZoomLevel: 4,
          // 🔥 预加载前后各 3 张图片，确保缩略图提前加载
          preload: [3, 3],
        });

        // 自定义底部标题
        lb.on("afterInit", () => {
          const pswp = lb.pswp;
          if (!pswp?.element) return;

          let captionEl = pswp.element.querySelector(".pswp__custom-caption") as HTMLElement;
          if (!captionEl) {
            captionEl = document.createElement("div");
            captionEl.className = "pswp__custom-caption";
            captionEl.style.cssText = `
              position: absolute;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.65);
              color: #fff;
              padding: 8px 18px;
              border-radius: 10px;
              max-width: 80%;
              text-align: center;
              z-index: 20;
              pointer-events: none;
              backdrop-filter: blur(4px);
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              flex-direction: column;
              align-items: center;
            `;
            pswp.element.appendChild(captionEl);
          }

          const updateCaption = () => {
            const slideData = pswp.currSlide?.data;
            const title = slideData?.element?.dataset?.title || "";
            const desc = slideData?.element?.dataset?.description || "";
            if (captionEl) {
              captionEl.innerHTML = "";
              if (title) {
                const titleEl = document.createElement("span");
                titleEl.textContent = title;
                titleEl.style.fontWeight = "bold";
                titleEl.style.fontFamily = 'Georgia, "Times New Roman", serif';
                titleEl.style.fontSize = "16px";
                captionEl.appendChild(titleEl);
              }
              if (desc) {
                const descEl = document.createElement("span");
                descEl.textContent = desc;
                descEl.style.fontFamily = 'Georgia, "Times New Roman", serif';
                descEl.style.fontSize = "14px";
                captionEl.appendChild(descEl);
              }
              captionEl.style.display = title || desc ? "flex" : "none";
            }
          };

          pswp.on("change", updateCaption);
          updateCaption();

          const isMobile = window.innerWidth < 768;
          const arrowLeft = pswp.element.querySelector(".pswp__button--arrow--left") as HTMLElement;
          const arrowRight = pswp.element.querySelector(".pswp__button--arrow--right") as HTMLElement;
          if (arrowLeft) arrowLeft.style.display = isMobile ? "none" : "";
          if (arrowRight) arrowRight.style.display = isMobile ? "none" : "";
        });

        lb.on("close", () => {
          const captionEl = document.querySelector(".pswp__custom-caption");
          if (captionEl) captionEl.remove();
        });

        lb.addFilter("domItemData", (itemData: any, element: HTMLElement) => {
          const originalSrc = element.dataset.pswpSrc;
          if (originalSrc) itemData.src = originalSrc;
          const msrc = element.dataset.pswpMsrc;
          if (msrc) itemData.msrc = msrc;
          const w = Number(element.dataset.pswpWidth);
          const h = Number(element.dataset.pswpHeight);
          if (w > 0 && h > 0) {
            itemData.w = w;
            itemData.h = h;
          }
          return itemData;
        });

        lb.init();
        lbRef.current = lb;
        isInitializedRef.current = true;
      } catch (error) {
        console.error("PhotoSwipe 初始化失败:", error);
        isInitializedRef.current = false;
      }
    }

    return () => {
      if (lbRef.current) {
        try {
          lbRef.current.destroy();
        } catch (_) {}
        lbRef.current = null;
        isInitializedRef.current = false;
      }
      document.querySelectorAll(".pswp__custom-caption").forEach((el) => el.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, needsRefresh]);

  // 组件卸载时额外清理
  useEffect(() => {
    return () => {
      if (lbRef.current) {
        try {
          lbRef.current.destroy();
        } catch (_) {}
        lbRef.current = null;
        isInitializedRef.current = false;
      }
      document.querySelectorAll(".pswp__custom-caption").forEach((el) => el.remove());
    };
  }, []);

  // ---------- 骨架屏 ----------
  if (isLoading) return <GallerySkeleton />;

  // ---------- 渲染 ----------
  const visibleItems = filteredItems.slice(0, loadedCount);
  const columns: GalleryItem[][] = Array.from({ length: colCount }, () => []);
  const heights = new Array(colCount).fill(0);

  const calcItemHeight = (item: GalleryItem) => {
    const w = item.imgWidth || 1200;
    const h = item.imgHeight || 800;
    return colWidth * (h / w);
  };

  visibleItems.forEach((item) => {
    const imgH = calcItemHeight(item);
    const minIdx = heights.indexOf(Math.min(...heights));
    columns[minIdx].push(item);
    heights[minIdx] += imgH + GAP;
  });

  const hasMore = loadedCount < filteredItems.length;

  const LoadMoreBtn = () => (
    <button
      onClick={loadMore}
      className="w-full aspect-[4/3] flex items-center justify-center rounded-xl transition-all"
      style={{ backgroundColor: "var(--fuwari-btn-regular-bg)", color: "var(--fuwari-btn-content)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--fuwari-btn-regular-bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--fuwari-btn-regular-bg)")}
      onMouseDown={(e) => (e.currentTarget.style.backgroundColor = "var(--fuwari-btn-regular-bg-active)")}
      onMouseUp={(e) => (e.currentTarget.style.backgroundColor = "var(--fuwari-btn-regular-bg-hover)")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        className="rotate-90"
        aria-hidden="true"
      >
        <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
      </svg>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 标题 */}
      <div className="fuwari-card-base p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold fuwari-text-90">
          {m.gallery_title?.() ?? "画廊"}
        </h1>
        <p className="text-sm fuwari-text-50">
          {m.gallery_intro?.() ?? "浏览摄影作品"}
        </p>
      </div>

      {/* 随机排序按钮 */}
      <button
        onClick={shuffle}
        className="fuwari-card-base group flex items-center gap-4 px-6 py-5 text-left w-full cursor-pointer hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active)"
      >
        <Shuffle className="text-2xl text-(--fuwari-primary) shrink-0" />
        <div>
          <div className="text-lg font-bold fuwari-text-90 group-hover:text-(--fuwari-primary) transition">
            {m.gallery_shuffle?.() ?? "物换星移"}
          </div>
          <div className="text-sm fuwari-text-50">
            {m.gallery_shuffle_desc?.() ?? "打乱时间线索，重编流动的记忆"}
          </div>
        </div>
      </button>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="fuwari-card-base p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors",
                !activeTag
                  ? "bg-(--fuwari-primary) text-white border-(--fuwari-primary)"
                  : "fuwari-text-50 border-border hover:border-(--fuwari-primary)",
              )}
            >
              {m.gallery_all?.() ?? "全部"} ({items?.length ?? 0})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setActiveTag(tag.name)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  activeTag === tag.name
                    ? "bg-(--fuwari-primary) text-white border-(--fuwari-primary)"
                    : "fuwari-text-50 border-border hover:border-(--fuwari-primary)",
                )}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 瀑布流 */}
      <div className="fuwari-card-base p-4 w-full">
        <div id="gallery-masonry" ref={masonryRef} className="flex gap-2 w-full">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-2">
              {col.map((item) => (
                <GalleryImage key={item.id} item={item} colWidth={colWidth} />
              ))}
              {colIdx === columns.length - 1 && hasMore && <LoadMoreBtn />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
