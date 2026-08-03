// src/features/theme/themes/fuwari/components/moments/moment-card.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
    if (node.type === "text" && node.text) {
      lines.push(node.text);
    }
    if (node.content) {
      node.content.forEach(walk);
    }
    if (["paragraph", "heading", "blockquote", "listItem"].includes(node.type || "")) {
      lines.push("\n");
    }
  };
  walk(doc);
  return lines.join("").trim();
}

function getImageSrc(src: string): string {
  return src.toLowerCase().endsWith(".gif") ? `${src}?no-transform=1` : src;
}

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

// ---------- 图片网格（修复外边距 + 背景色） ----------
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
            />
            {isLast && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-none">
                <span className="text-white text-lg font-bold">
                  +{images.length - 9}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- MomentCard ----------
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
  const plainText = extractTextWithLineBreaks(moment.content);

  const openGallery = async (index: number) => {
    if (images.length === 0) return;
    const slides = await Promise.all(
      images.map(async (src) => {
        const url = getImageSrc(src);
        const size = await preloadImageSize(url);
        return { src: url, msrc: url, w: size.w, h: size.h };
      }),
    );
    new PhotoSwipe({
      dataSource: slides,
      index,
      bgOpacity: 0.95,
      wheelToZoom: true,
      zoom: true,
      closeOnVerticalDrag: true,
      showHideAnimationType: "fade",
    }).init();
  };

  const renderImages = () => {
    if (images.length === 0) return null;
    if (images.length === 1) {
      const originalUrl = getImageSrc(images[0]);
      return (
        <div
          className="cursor-pointer overflow-hidden rounded-none block"  // 让单张图片块级显示
          onClick={() => openGallery(0)}
        >
          <img
            src={originalUrl}
            alt=""
            className="w-full h-auto max-h-[80vh] object-contain rounded-none !m-0"
            loading="lazy"
          />
        </div>
      );
    }
    return <ImageGrid images={images} onImageClick={openGallery} />;
  };

  return (
    <div className="fuwari-card-base p-4 md:p-6 space-y-4 w-full relative">
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
            {moment.location && <><span>·</span><span>{moment.location}</span></>}
            {deviceString && <><span>·</span><span>{deviceString}</span></>}
          </div>
        </div>
      </div>

      {/* 内容区域（初版逻辑：文字在上，图片在下） */}
      <div className="fuwari-custom-md text-sm moment-content whitespace-pre-wrap">
        {images.length > 0 ? (
          <>
            {plainText && (
              <p className="mb-2 whitespace-pre-wrap break-words">{plainText}</p>
            )}
            {renderImages()}
          </>
        ) : (
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