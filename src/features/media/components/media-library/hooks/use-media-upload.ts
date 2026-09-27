import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadImageFn } from "@/features/media/api/media.api";
import { MEDIA_KEYS } from "@/features/media/queries";
import { normalizeFolderPath } from "@/features/media/utils/media.utils";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { UploadItem } from "../types";

/**
 * How many files may be in flight at once. Uploads are network-bound, so a
 * small pool already keeps the connection busy without hammering the worker.
 */
const MAX_CONCURRENT_UPLOADS = 3;

interface UseMediaUploadOptions {
  /** Folder (R2 key prefix) newly queued items upload into by default. */
  folder?: string;
}

/** One file read out of a dropped folder tree. */
interface DroppedEntry {
  file: File;
  /** Containing folders relative to the drop root, slash-joined (`""` = root). */
  relativeFolder: string;
}

const readFileEntry = (entry: FileSystemFileEntry): Promise<File | null> =>
  new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });

const readDirectoryEntries = (
  reader: FileSystemDirectoryReader,
): Promise<Array<FileSystemEntry>> =>
  new Promise((resolve) => {
    reader.readEntries(
      (entries) => resolve(entries),
      () => resolve([]),
    );
  });

/** Depth-first walk that preserves the path of nested folders. */
async function collectEntry(
  entry: FileSystemEntry,
  relativeFolder: string,
  out: Array<DroppedEntry>,
): Promise<void> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry);
    if (file) out.push({ file, relativeFolder });
    return;
  }

  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const dirPath = relativeFolder
    ? `${relativeFolder}/${entry.name}`
    : entry.name;

  // `readEntries` yields at most ~100 entries per call, so it must be drained
  // until it returns an empty batch.
  for (;;) {
    const entries = await readDirectoryEntries(reader);
    if (entries.length === 0) break;
    for (const child of entries) {
      await collectEntry(child, dirPath, out);
    }
  }
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<Array<UploadItem>>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isMountedRef = useRef(true);
  /** Ids currently uploading, so the pool can never start one item twice. */
  const inFlightRef = useRef<Set<string>>(new Set());
  /** Latest option value, read from the stable drain loop below. */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 监听组件挂载和卸载
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const formData = new FormData();
      formData.append("image", file);
      const normalized = normalizeFolderPath(folder);
      if (normalized) formData.append("folder", normalized);
      return await uploadImageFn({ data: formData });
    },
  });

  // Keeps `runUpload` stable: the mutation result object changes every render.
  const mutateAsyncRef = useRef(uploadMutation.mutateAsync);
  mutateAsyncRef.current = uploadMutation.mutateAsync;

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const runUpload = useCallback(
    async (item: UploadItem) => {
      const file = item.file;
      if (!file) {
        patchItem(item.id, {
          status: "ERROR",
          log: m.media_upload_log_error_no_data(),
        });
        inFlightRef.current.delete(item.id);
        return;
      }

      patchItem(item.id, {
        status: "UPLOADING",
        progress: 50,
        log: m.media_upload_log_stream_sending(),
      });

      try {
        const result = await mutateAsyncRef.current({
          file,
          folder: item.folder ?? optionsRef.current.folder ?? "",
        });

        if (result.error) {
          if (isMountedRef.current) {
            const message = m.media_upload_error_db();
            patchItem(item.id, {
              status: "ERROR",
              progress: 0,
              log: m.media_upload_log_error({ message }),
            });
            toast.error(m.media_upload_fail({ name: item.name }), {
              description: message,
            });
          }
          return;
        }

        if (isMountedRef.current) {
          patchItem(item.id, {
            status: "COMPLETE",
            progress: 100,
            log: m.media_upload_log_complete(),
          });
          toast.success(m.media_upload_success({ name: item.name }));
          queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : m.request_error_unknown_title();
          patchItem(item.id, {
            status: "ERROR",
            progress: 0,
            log: m.media_upload_log_error({ message }),
          });
          toast.error(m.media_upload_fail({ name: item.name }), {
            description: message,
          });
        }
      } finally {
        // Released on success *and* failure so the pool keeps draining.
        inFlightRef.current.delete(item.id);
      }
    },
    [patchItem, queryClient],
  );

  /**
   * Concurrency pool: starts waiting items until `MAX_CONCURRENT_UPLOADS` are
   * in flight and is re-evaluated as each one releases its slot. Slots are
   * claimed by id, so a re-render can never start an item twice, and the effect
   * does nothing once every waiting item has been claimed — no busy loop.
   */
  useEffect(() => {
    const slots = MAX_CONCURRENT_UPLOADS - inFlightRef.current.size;
    if (slots <= 0) return;

    const nextItems = queue
      .filter(
        (item) => item.status === "WAITING" && !inFlightRef.current.has(item.id),
      )
      .slice(0, slots);

    for (const item of nextItems) {
      inFlightRef.current.add(item.id);
      void runUpload(item);
    }
  }, [queue, runUpload]);

  const buildItems = (
    files: Array<File>,
    folder: string,
  ): Array<UploadItem> =>
    files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: file.name,
      size: formatBytes(file.size),
      progress: 0,
      status: "WAITING" as const,
      log: m.media_upload_log_init(),
      file,
      folder,
    }));

  const processFiles = (files: Array<File>, folder?: string) => {
    if (files.length === 0) return;
    const targetFolder = folder ?? optionsRef.current.folder ?? "";
    setQueue((prev) => [...prev, ...buildItems(files, targetFolder)]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const transfer = e.dataTransfer;
    const entries: Array<FileSystemEntry> = [];

    // `webkitGetAsEntry` is the only way to see dropped folders; when it is
    // unavailable a plain multi-file drop still works through `files`.
    for (const item of Array.from(transfer.items ?? [])) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    const collected: Array<DroppedEntry> = [];
    for (const entry of entries) {
      await collectEntry(entry, "", collected);
    }

    if (collected.length === 0) {
      if (transfer.files.length > 0) {
        processFiles(Array.from(transfer.files));
      }
      return;
    }

    // A dropped tree keeps its shape beneath the folder currently open, so a
    // dropped `photos/` lands in `<current>/photos/`.
    const baseFolder = normalizeFolderPath(optionsRef.current.folder ?? "");
    const newItems = collected.flatMap(({ file, relativeFolder }) => {
      const relative = normalizeFolderPath(relativeFolder);
      const targetFolder = [baseFolder, relative].filter(Boolean).join("/");
      return buildItems([file], targetFolder);
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const reset = () => {
    setQueue([]);
    inFlightRef.current.clear();
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    queue,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    processFiles,
    reset,
  };
}
