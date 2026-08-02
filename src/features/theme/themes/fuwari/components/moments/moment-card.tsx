import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";
import { LikeButton } from "@/features/theme/themes/fuwari/components/like-button";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { deleteMomentFn } from "@/features/moments/api/moments.api";
import type { JSONContent } from "@tiptap/react";
import { createPortal } from 'react-dom';

// ---------- 工具函数 ----------

/** 提取所有图片 src */
function extractImageSrcs(doc: JSONContent | null): string[] {
  if (!doc) return [];
  const srcs: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "image" && node.attrs?.src) {
      srcs.push(node.attrs.src);
    }
    if (node.content) node.content.forEach(walk);
  };
  walk(doc);
  return srcs;
}

/** 提取纯文本，跳过图片 alt */
function extractTextWithoutImageAlt(doc: JSONContent | null): string {
  if (!doc) return "";
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "text" && node.text) {
      parts.push(node.text);
    }
    if (node.content) node.content.forEach(walk);
  };
  walk(doc);
  return parts.join("").trim();
}

/** GIF 图片添加 no-transform 参数，避免 Cloudflare 转换失败 */
function getImageSrc(src: string): string {
  if (src.toLowerCase().endsWith(".gif")) {
    return `${src}?no-transform=1`;
  }
  return src;
}

// ---------- 画廊灯箱 ----------
function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // 键盘事件
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // 隐藏导航栏 & 禁止滚动（使用 useLayoutEffect 确保在绘制前执行）
  useLayoutEffect(() => {
    // 查找导航栏元素
    const navbar =
      document.getElementById("fuwari-navbar-wrapper") ||
      document.querySelector('[id*="fuwari-navbar"]');

    if (navbar) {
      // 强制隐藏并禁用过渡/动画，避免闪烁
      const el = navbar as HTMLElement;
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("pointer-events", "none", "important");
      el.style.setProperty("transition", "none", "important");
      el.style.setProperty("animation", "none", "important");
    }

    // 禁止页面滚动
    document.body.style.overflow = "hidden";

    // 恢复样式
    return () => {
      if (navbar) {
        const el = navbar as HTMLElement;
        el.style.visibility = "";
        el.style.pointerEvents = "";
        el.style.transition = "";
        el.style.animation = "";
      }
      document.body.style.overflow = "";
    };
  }, []);

  // 触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev();
      else next();
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 背景关闭层 */}
      <div
        className="absolute inset-0 z-[9997] cursor-zoom-out"
        onClick={onClose}
        onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* 左箭头 */}
      {images.length > 1 && (
        <button
          onClick={prev}
          onTouchEnd={(e) => { e.preventDefault(); prev(); }}
          className="absolute left-4 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-full transition active:scale-95"
          style={{ touchAction: "manipulation" }}
          aria-label="上一张"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {/* 图片容器 */}
      <div
        className="relative z-[9998]"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <img
          src={getImageSrc(images[current])}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          draggable={false}
        />
      </div>

      {/* 右箭头 */}
      {images.length > 1 && (
        <button
          onClick={next}
          onTouchEnd={(e) => { e.preventDefault(); next(); }}
          className="absolute right-4 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-full transition active:scale-95"
          style={{ touchAction: "manipulation" }}
          aria-label="下一张"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* 计数 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full z-[10001]">
        {current + 1} / {images.length}
      </div>

      {/* Portal 关闭按钮（确保可点击） */}
      {createPortal(
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="fixed top-4 right-4 z-[10003] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition active:scale-95"
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            pointerEvents: "auto",
            cursor: "pointer",
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="关闭"
        >
          <X className="w-6 h-6 text-white" />
        </button>,
        document.body
      )}
    </div>
  );
}

// ---------- 图片网格 ----------

function ImageGrid({
  images,
  onImageClick,
}: {
  images: string[];
  onImageClick: (index: number) => void;
}) {
  const displayImages = images.slice(0, 9);
  const remaining = images.length - 9;

  return (
    <div className="grid grid-cols-3 gap-1 rounded-none">
      {displayImages.map((src, idx) => {
        const isLast = idx === 8;
        return (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-none cursor-pointer"
            onClick={() => onImageClick(idx)}
          >
            <img
              src={getImageSrc(src)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-none"
              loading="lazy"
            />
            {isLast && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-none">
                <span className="text-white text-lg font-bold">
                  +{remaining}
                </span>
              </div>
            )}
          </div>
        );
      })}
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

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
    if (window.confirm("确定删除这条动态吗？此操作不可撤销。")) {
      deleteMutation.mutate();
    }
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
    ? [
        moment.deviceInfo.browser,
        moment.deviceInfo.os,
        moment.deviceInfo.device,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const likePath = `/moment/${moment.id}`;

  const images = extractImageSrcs(moment.content);
  const plainText = extractTextWithoutImageAlt(moment.content);

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const renderImages = () => {
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div
          className="cursor-pointer overflow-hidden rounded-none"
          onClick={() => openGallery(0)}
        >
          <img
            src={getImageSrc(images[0])}
            alt=""
            className="w-full h-auto max-h-[80vh] object-contain rounded-none"
            loading="lazy"
          />
        </div>
      );
    }

    return <ImageGrid images={images} onImageClick={openGallery} />;
  };

  return (
    <div className="fuwari-card-base p-4 md:p-6 space-y-4 w-full relative">
      {/* 管理员操作按钮 */}
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

      {/* 作者信息 */}
      <div className="flex items-center gap-3">
        {moment.author?.image ? (
          <img
            src={moment.author.image}
            alt={moment.author.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-(--fuwari-primary) flex items-center justify-center text-white text-xs font-bold">
            {(moment.author?.name ?? "博主").charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium fuwari-text-90">
            {moment.author?.name ?? "博主"}
          </p>
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

      {/* 动态内容 */}
      <div className="fuwari-custom-md text-sm moment-content">
        {images.length > 0 ? (
          <>
            {renderImages()}
            {plainText && (
              <p className="mt-2 whitespace-pre-wrap break-words">
                {plainText}
              </p>
            )}
          </>
        ) : (
          <ContentRenderer content={moment.content} />
        )}
      </div>

      {/* 互动栏 */}
      <div className="flex items-center gap-4 pt-2 border-t border-black/5 dark:border-white/5">
        <LikeButton path={likePath} simple />
      </div>

      {/* 评论区（评论在上，输入框在下，折叠带过渡动画） */}
      <FuwariCommentSection postId={moment.id} collapsed />

      {/* 画廊灯箱 */}
      {galleryOpen && (
        <GalleryLightbox
          images={images}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
