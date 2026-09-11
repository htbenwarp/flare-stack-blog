import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Image as ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { uploadImageFn } from "@/features/media/api/media.api";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { MEDIA_KEYS } from "@/features/media/queries";
import { getSizedImageUrl } from "@/features/media/utils/media.utils";
import { m } from "@/paraglide/messages";
import type { PostEditorCover } from "./types";

export function toEditorCover(media: MediaAsset): PostEditorCover {
  return {
    id: media.id,
    key: media.key,
    url: media.url,
    fileName: media.fileName,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cover: PostEditorCover) => void;
}

function MediaPickerModal({ open, onClose, onSelect }: MediaPickerModalProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    mediaItems,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
  } = useMediaPicker();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return await uploadImageFn({ data: formData });
    },
  });

  useEffect(() => {
    if (!open) return;
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
  }, [open, hasMore, isLoadingMore, loadMore]);

  if (!open) return null;

  const handleUpload = async (files: Array<File>) => {
    const file = files.find((item) => item.size <= MAX_FILE_SIZE);
    if (!file) {
      if (files.length > 0) toast.error(m.media_validation_file_too_large());
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadMutation.mutateAsync(file);
      if (result.error) {
        toast.error(m.media_upload_fail({ name: file.name }), {
          description: m.media_upload_error_db(),
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      onSelect(toEditorCover(result.data));
    } catch (error) {
      toast.error(m.media_upload_fail({ name: file.name }), {
        description:
          error instanceof Error
            ? error.message
            : m.request_error_unknown_title(),
      });
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-border bg-background text-foreground">
              <ImageIcon size={14} />
            </div>
            <div className="flex flex-col">
              <span className="mb-1 font-mono text-xs uppercase leading-none tracking-widest text-muted-foreground">
                MEDIA
              </span>
              <span className="font-mono text-base font-bold uppercase tracking-wider text-foreground">
                {m.editor_meta_cover_pick()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
            >
              {isUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {isUploading
                ? m.editor_meta_cover_uploading()
                : m.editor_meta_cover_upload()}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
              aria-label={m.common_close()}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="relative shrink-0 border-b border-border/50">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={m.editor_meta_cover_search_placeholder()}
            className="w-full border-none bg-transparent py-4 pl-12 pr-6 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:ring-0"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/5 p-6">
          {isPending ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse border border-border/20 bg-muted/20"
                />
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon size={24} className="opacity-20" />
              <span className="font-mono text-sm">
                {m.editor_meta_cover_empty()}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 content-start gap-4 pb-4 sm:grid-cols-3">
              {mediaItems.map((media) => (
                <button
                  key={media.key}
                  type="button"
                  onClick={() => onSelect(toEditorCover(media))}
                  className="group aspect-video overflow-hidden border border-border/50 transition-colors hover:border-foreground"
                >
                  <img
                    src={getSizedImageUrl(media.url, 480)}
                    alt={media.fileName}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              ))}
              <div
                ref={observerTarget}
                className="col-span-full flex h-8 items-center justify-center p-4"
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

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void handleUpload(files);
            event.target.value = "";
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

interface PostEditorCoverFieldProps {
  cover: PostEditorCover | null;
  onChange: (next: {
    coverMediaId: number | null;
    cover: PostEditorCover | null;
  }) => void;
}

export function PostEditorCoverField({
  cover,
  onChange,
}: PostEditorCoverFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="col-span-1 space-y-3 border-t border-border/30 pt-8 md:col-span-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
          {m.editor_meta_cover()}
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          {cover ? m.editor_meta_cover_change() : m.editor_meta_cover_pick()}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full max-w-xs overflow-hidden border border-border/30 bg-muted/10">
          {cover ? (
            <img
              src={getSizedImageUrl(cover.url, 640)}
              alt={cover.fileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon size={22} strokeWidth={1} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {cover ? cover.fileName : m.editor_meta_cover_none()}
          </p>
          <p className="max-w-sm text-[10px] font-mono leading-relaxed text-muted-foreground/60">
            {m.editor_meta_cover_hint()}
          </p>
          {cover ? (
            <button
              type="button"
              onClick={() => onChange({ coverMediaId: null, cover: null })}
              className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {m.editor_meta_cover_clear()}
            </button>
          ) : null}
        </div>
      </div>

      <ClientOnly>
        {pickerOpen ? (
          <MediaPickerModal
            open
            onClose={() => setPickerOpen(false)}
            onSelect={(next) => {
              onChange({ coverMediaId: next.id, cover: next });
              setPickerOpen(false);
            }}
          />
        ) : null}
      </ClientOnly>
    </div>
  );
}
