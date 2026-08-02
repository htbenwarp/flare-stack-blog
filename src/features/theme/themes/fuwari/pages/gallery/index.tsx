// src/features/theme/themes/fuwari/pages/gallery/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Shuffle } from "lucide-react";
import { getGalleryItemsFn } from "@/features/gallery/api/gallery.public.api";
import { getOptimizedImageUrl, getOriginalImageUrl } from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Skeleton } from "@/components/ui/skeleton";
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

// 全局尺寸缓存（key: 优化图 URL，value: 宽高）
const sizeCache = new Map<string, { w: number; h: number }>();

function preloadImageSize(src: string): Promise<{ w: number; h: number }> {
  if (sizeCache.has(src)) return Promise.resolve(sizeCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = { w: img.naturalWidth, h: img.naturalHeight };
      sizeCache.set(src, size);
      resolve(size);
    };
    img.onerror = () => {
      const fallback = { w: 800, h: 600 };
      sizeCache.set(src, fallback);
      resolve(fallback);
    };
    img.src = src;
  });
}

function GalleryImage({
  item,
  colWidth,
  onImageClick,
}: {
  item: GalleryItem;
  colWidth: number;
  onImageClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const optimizedUrl = getOptimizedImageUrl(item.imageKey, 800);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) {
      setNaturalSize({ w, h });
      sizeCache.set(optimizedUrl, { w, h });
    }
    setLoaded(true);
  };

  const aspectRatio = naturalSize
    ? `${naturalSize.w} / ${naturalSize.h}`
    : `${item.imgWidth || 1200} / ${item.imgHeight || 800}`;

  return (
    <div
      className="overflow-hidden cursor-pointer relative group"
      style={{
        aspectRatio,
        transition: "aspect-ratio 0.3s ease",
        backgroundColor: "#f0f0f0",
      }}
      onClick={onImageClick}
    >
      <img
        src={optimizedUrl}
        alt={item.title}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-110",
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

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    (items ?? []).forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  useEffect(() => {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    setDisplayItems(sorted);
    setLoadedCount(Math.min(BATCH, sorted.length));
  }, [items, activeTag]);

  const filteredItems = useMemo(() => {
    return activeTag
      ? displayItems.filter((item) => item.tags.some((t) => t.name === activeTag))
      : displayItems;
  }, [displayItems, activeTag]);

  const loadMore = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + BATCH, filteredItems.length));
  }, [filteredItems.length]);

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

  const openPhotoSwipe = useCallback(
    async (index: number) => {
      const images = filteredItems.slice(0, loadedCount);
      if (images.length === 0) return;

      const slides = await Promise.all(
        images.map(async (item) => {
          const originalUrl = getOriginalImageUrl(item.imageKey);
          const thumbUrl = getOptimizedImageUrl(item.imageKey, 800);
          let size = sizeCache.get(thumbUrl);
          if (!size) {
            size = await preloadImageSize(thumbUrl);
          }
          return {
            src: originalUrl,
            msrc: thumbUrl,
            w: size.w,
            h: size.h,
            title: item.title,
            description: item.description,
          };
        })
      );

      const pswp = new PhotoSwipe({
        dataSource: slides,
        index,
        bgOpacity: 0.95,
        wheelToZoom: true,
        zoom: true,
        closeOnVerticalDrag: true,
        showHideAnimationType: "fade",
      });

      pswp.on("afterInit", () => {
        if (!pswp.element) return;
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
            font-family: Georgia, "Times New Roman", serif;
          `;
          pswp.element.appendChild(captionEl);
        }
        const updateCaption = () => {
          const slideData = pswp.currSlide?.data;
          const title = slideData?.title || "";
          const desc = slideData?.description || "";
          captionEl.textContent = title + (desc ? ` - ${desc}` : "");
          captionEl.style.display = title || desc ? "block" : "none";
        };
        pswp.on("change", updateCaption);
        updateCaption();
      });

      pswp.init();
    },
    [filteredItems, loadedCount]
  );

  if (isLoading) return <GallerySkeleton />;

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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="rotate-90" aria-hidden="true">
        <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
      </svg>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="fuwari-card-base p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold fuwari-text-90">{m.gallery_title?.() ?? "画廊"}</h1>
        <p className="text-sm fuwari-text-50">{m.gallery_intro?.() ?? "浏览摄影作品"}</p>
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
                  : "fuwari-text-50 border-border hover:border-(--fuwari-primary)"
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
                    : "fuwari-text-50 border-border hover:border-(--fuwari-primary)"
                )}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fuwari-card-base p-4 w-full">
        <div id="gallery-masonry" ref={masonryRef} className="flex gap-2 w-full">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-2">
              {col.map((item) => {
                const globalIndex = visibleItems.indexOf(item);
                return (
                  <GalleryImage
                    key={item.id}
                    item={item}
                    colWidth={colWidth}
                    onImageClick={() => openPhotoSwipe(globalIndex)}
                  />
                );
              })}
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
