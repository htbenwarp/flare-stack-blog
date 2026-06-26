// themes/fuwari/pages/gallery/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Shuffle } from "lucide-react";
import { getGalleryItemsFn } from "@/features/gallery/api/gallery.public.api";
import {
  getOptimizedImageUrl,
  getOriginalImageUrl,
  getResponsiveSrcSet,
} from "@/features/media/utils/media.utils";
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

  // 所有标签及数量
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    (items ?? []).forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }));
  }, [items]);

  // 当前过滤后的列表
  const filteredItems = useMemo(() => {
    return activeTag
      ? displayItems.filter((item) => item.tags.some((t) => t.name === activeTag))
      : displayItems;
  }, [displayItems, activeTag]);

  // 初始化 / 标签切换
  useEffect(() => {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    setDisplayItems(sorted);
    const filtered = activeTag
      ? sorted.filter((item) => item.tags.some((t) => t.name === activeTag))
      : sorted;
    setLoadedCount(Math.min(BATCH, filtered.length));
  }, [items, activeTag]);

  const loadMore = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + BATCH, filteredItems.length));
  }, [filteredItems.length]);

  // 洗牌
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

  // 瀑布流列数及宽度
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

  // ---------- 瀑布流列数据（增量追加） ----------
  const [columnsData, setColumnsData] = useState<GalleryItem[][]>([]);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);

  const calcItemHeight = useCallback(
    (item: GalleryItem) => {
      if (item.imgWidth && item.imgHeight) {
        return colWidth * (item.imgHeight / item.imgWidth);
      }
      return (colWidth * 3) / 4;
    },
    [colWidth]
  );

  // 重置列数据（全量分配），在标签切换、洗牌、窗口列数变化时触发
  useEffect(() => {
    if (!filteredItems.length) {
      setColumnsData([]);
      setColumnHeights([]);
      return;
    }
    const currentCount = Math.min(loadedCount, filteredItems.length);
    const cols: GalleryItem[][] = Array.from({ length: colCount }, () => []);
    const heights = new Array(colCount).fill(0);
    const itemsToShow = filteredItems.slice(0, currentCount);
    itemsToShow.forEach((item) => {
      const imgH = calcItemHeight(item);
      const minIdx = heights.indexOf(Math.min(...heights));
      cols[minIdx].push(item);
      heights[minIdx] += imgH + GAP;
    });
    setColumnsData(cols);
    setColumnHeights(heights);
  }, [filteredItems, colCount, loadedCount, calcItemHeight]);

  // 增量追加：当 loadedCount 增加时，只追加新项
  useEffect(() => {
    if (!filteredItems.length || columnsData.length === 0) return;
    const currentLoaded = columnsData.reduce((sum, col) => sum + col.length, 0);
    if (currentLoaded >= loadedCount) return;
    const newItems = filteredItems.slice(currentLoaded, loadedCount);
    if (newItems.length === 0) return;
    const newHeights = [...columnHeights];
    const newCols = columnsData.map((col) => [...col]);
    newItems.forEach((item) => {
      const imgH = calcItemHeight(item);
      const minIdx = newHeights.indexOf(Math.min(...newHeights));
      newCols[minIdx].push(item);
      newHeights[minIdx] += imgH + GAP;
    });
    setColumnsData(newCols);
    setColumnHeights(newHeights);
  }, [loadedCount, filteredItems, columnsData, columnHeights, calcItemHeight]);

  // 窗口宽度变化时（colWidth 变化），仅重新计算高度，不改变图片顺序
  useEffect(() => {
    if (!columnsData.length) return;
    const newHeights = columnsData.map((col) =>
      col.reduce((sum, item) => sum + calcItemHeight(item) + GAP, 0)
    );
    setColumnHeights(newHeights);
  }, [colWidth, columnsData, calcItemHeight]);

  // ---------- PhotoSwipe 灯箱（只初始化一次） ----------
  const lbRef = useRef<PhotoSwipeLightbox | null>(null);

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

        // 移动端隐藏箭头
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

      // 使用 data-msrc 作为预览图（800px），data-src 作为原图
      lb.addFilter("domItemData", (itemData: any, element: HTMLElement) => {
        const img = element.querySelector("img") as HTMLImageElement | null;
        const previewSrc = element.dataset.msrc || img?.src || "";
        const fullSrc = element.dataset.src || previewSrc;
        itemData.msrc = previewSrc;
        itemData.src = fullSrc;

        // 强制使用 data-width/data-height 作为灯箱尺寸（避免缩略图尺寸干扰）
        let w = Number(element.dataset.width);
        let h = Number(element.dataset.height);
        if (!w || !h) {
          w = 1200;
          h = 800;
        }
        itemData.w = w;
        itemData.h = h;
        return itemData;
      });

      lb.init();
      lbRef.current = lb;
    } catch (error) {
      console.error("PhotoSwipe 初始化失败:", error);
    }

    return () => {
      lbRef.current?.destroy();
      lbRef.current = null;
    };
  }, []); // 仅初始化一次

  // 当加载更多图片后，刷新 lightbox 以绑定新元素的点击事件
  useEffect(() => {
    if (lbRef.current) {
      lbRef.current.refresh();
    }
  }, [loadedCount]);

  // 加载骨架屏
  if (isLoading) return <GallerySkeleton />;

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
    <div className="flex flex-col gap-4 max-w-(--fuwari-page-width) mx-auto">
      {/* 标题 */}
      <div className="fuwari-card-base p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold fuwari-text-90">
          {m.gallery_title?.() ?? "画廊"}
        </h1>
        <p className="text-sm fuwari-text-50">
          {m.gallery_intro?.() ?? "浏览摄影作品"}
        </p>
      </div>

      {/* 洗牌按钮 */}
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

      {/* 瀑布流 */}
      <div className="fuwari-card-base p-4">
        <div id="gallery-masonry" ref={masonryRef} className="flex gap-2">
          {columnsData.map((col, colIdx) => (
            <div key={colIdx} className="flex-1 flex flex-col gap-2">
              {col.map((item) => (
                <div
                  key={item.id}
                  className="gallery-item overflow-hidden cursor-pointer"
                  data-title={item.title || undefined}
                  data-description={item.description || undefined}
                  data-msrc={getOptimizedImageUrl(item.imageKey, 800)}
                  data-src={getOriginalImageUrl(item.imageKey)}
                  data-width={item.imgWidth || 1200}
                  data-height={item.imgHeight || 800}
                >
                  <img
                    src={getOptimizedImageUrl(item.imageKey, 200)}
                    srcSet={getResponsiveSrcSet(item.imageKey)}
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
              {colIdx === columnsData.length - 1 && hasMore && <LoadMoreBtn />}
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