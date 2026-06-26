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

export function GalleryPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["gallery", "public"],
    queryFn: () => getGalleryItemsFn(),
    staleTime: 5 * 60 * 1000,
  });

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [displayItems, setDisplayItems] = useState<GalleryItem[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    (items ?? []).forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  // 合并初始化与标签切换，消除闪烁
  useEffect(() => {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const filtered = activeTag
      ? sorted.filter((item) => item.tags.some((t) => t.name === activeTag))
      : sorted;
    setDisplayItems(sorted);
    setLoadedCount(Math.min(BATCH, filtered.length));
  }, [items, activeTag]);

  const filteredItems = useMemo(() => {
    return activeTag
      ? displayItems.filter((item) => item.tags.some((t) => t.name === activeTag))
      : displayItems;
  }, [displayItems, activeTag]);

  const loadMore = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + BATCH, filteredItems.length));
  }, [filteredItems.length]);

  // 洗牌：保持当前加载数量不变
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

  // PhotoSwipe 灯箱初始化（含缩放按钮常驻 + 平滑过渡）
  useEffect(() => {
    if (!masonryRef.current) return;

    let lb: PhotoSwipeLightbox;
    try {
      lb = new PhotoSwipeLightbox({
        gallery: "#gallery-masonry",
        children: ".gallery-item",
        pswpModule: PhotoSwipe,
        imageClickAction: "close",
        tapAction: "close",
        bgOpacity: 0.9,
        wheelToZoom: true,
        // ----- 新增配置：缩放按钮常驻 + 柔和过渡 -----
        zoom: true,
        showHideAnimationType: "fade",
        initialZoomLevel: "fit",
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,
      });

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

        // 移动端隐藏导航箭头
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

      // 图片数据过滤：原图加载 + 精确尺寸
      lb.addFilter("domItemData", (itemData: any, element: HTMLElement) => {
        const originalSrc = element.dataset.originalSrc;
        if (originalSrc) {
          itemData.src = originalSrc; // 灯箱中使用原图
        }

        const img = element.querySelector("img") as HTMLImageElement | null;
        if (img) {
          itemData.msrc = img.src; // 缩略图预加载

          // 优先使用后端存储的宽高
          const imgWidth = parseInt(img.getAttribute("width") || "0");
          const imgHeight = parseInt(img.getAttribute("height") || "0");
          if (imgWidth > 0 && imgHeight > 0) {
            itemData.w = imgWidth;
            itemData.h = imgHeight;
          } else {
            itemData.w = img.naturalWidth || img.width || window.innerWidth;
            itemData.h = img.naturalHeight || img.height || window.innerHeight;
          }
        }
        return itemData;
      });

      lb.init();
    } catch (error) {
      console.error("PhotoSwipe 初始化失败:", error);
    }

    return () => {
      lb?.destroy();
    };
  }, [loadedCount, colCount]);

  if (isLoading) return <GallerySkeleton />;

  const visibleItems = filteredItems.slice(0, loadedCount);
  const columns: GalleryItem[][] = Array.from({ length: colCount }, () => []);
  const heights = new Array(colCount).fill(0);

  const calcItemHeight = (item: GalleryItem) => {
    if (item.imgWidth && item.imgHeight) {
      return colWidth * (item.imgHeight / item.imgWidth);
    }
    return (colWidth * 3) / 4;
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
        <path
          fill="currentColor"
          d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"
        />
      </svg>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 max-w-(--fuwari-page-width) mx-auto">
      <div className="fuwari-card-base p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold fuwari-text-90">
          {m.gallery_title?.() ?? "画廊"}
        </h1>
        <p className="text-sm fuwari-text-50">
          {m.gallery_intro?.() ?? "浏览摄影作品"}
        </p>
      </div>

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

      <div className="fuwari-card-base p-4">
        <div id="gallery-masonry" ref={masonryRef} className="flex gap-2">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-2">
              {col.map((item) => (
                <div
                  key={item.id}
                  className="gallery-item overflow-hidden cursor-pointer"
                  data-title={item.title || undefined}
                  data-description={item.description || undefined}
                  data-original-src={getOriginalImageUrl(item.imageKey)}
                >
                  <img
                    src={getOptimizedImageUrl(item.imageKey, 200)}
                    srcSet={`
                      ${getOptimizedImageUrl(item.imageKey, 200)} 200w,
                      ${getOptimizedImageUrl(item.imageKey, 400)} 400w,
                      ${getOptimizedImageUrl(item.imageKey, 600)} 600w,
                      ${getOptimizedImageUrl(item.imageKey, 800)} 800w
                    `}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    alt={item.title}
                    className="w-full h-auto object-cover transition-transform hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={item.imgWidth}
                    height={item.imgHeight}
                  />
                </div>
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
    <div className="flex flex-col gap-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
