import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createMediaFolderFn,
  deleteImageFn,
  deleteMediaFoldersFn,
  moveMediaFilesFn,
  renameMediaFolderFn,
  updateMediaNameFn,
} from "@/features/media/api/media.api";
import {
  MEDIA_KEYS,
  mediaDirectoryInfiniteQueryOptions,
  mediaDirectoryLookupQuery,
  totalMediaSizeQuery,
} from "@/features/media/queries";
import { normalizeFolderPath } from "@/features/media/utils/media.utils";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";

/** Folder entries are just R2 keys ending in a slash. */
const isFolderKey = (key: string) => key.endsWith("/");

export function useMediaLibrary() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/admin/media/" });
  const { search, unused, folder: folderParam } = useSearch({
    from: "/admin/media/",
  });

  // Search Param Handlers
  const setSearchQuery = (term: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: term }),
      replace: true,
    });
  };

  const setUnusedOnly = (val: boolean) => {
    navigate({
      search: (prev) => ({ ...prev, unused: val }),
    });
  };

  const currentFolder = normalizeFolderPath(folderParam ?? "");

  const setFolder = (next: string) => {
    navigate({
      search: (prev) => ({ ...prev, folder: normalizeFolderPath(next) }),
      replace: true,
    });
  };

  const debouncedSearch = useDebounce(search, 300);

  // Selection & Deletion State (使用 key 作为唯一标识；文件夹 key 以 "/" 结尾)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteTarget, setDeleteTarget] = useState<Array<string> | null>(null);

  // Infinite Query for the current directory (folders + files)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    ...mediaDirectoryInfiniteQueryOptions(
      currentFolder,
      debouncedSearch ?? "",
      unused ?? false,
    ),
  });

  // Folders come from every page (R2 repeats them per page), files accumulate.
  const folders = useMemo(() => {
    const byKey = new Map<string, { key: string; name: string }>();
    for (const page of data?.pages ?? []) {
      for (const folder of page.folders) {
        if (!byKey.has(folder.key)) byKey.set(folder.key, folder);
      }
    }
    return [...byKey.values()];
  }, [data]);

  const files = useMemo(
    () => data?.pages.flatMap((page) => page.files) ?? [],
    [data],
  );

  // Compatibility alias: the grid and the header stats read `mediaItems`.
  const mediaItems = files;

  const { data: totalMediaSize } = useQuery(totalMediaSizeQuery);

  // `isLinked` now ships with the directory listing, so no extra round trip.
  const linkedMediaIds = useMemo(
    () => new Set(files.filter((file) => file.isLinked).map((file) => file.key)),
    [files],
  );

  // Clear selections when the visible set changes.
  // We use the DEBOUNCED search here because that's what triggers the query.
  useEffect(() => {
    setSelectedKeys(new Set());
    setDeleteTarget(null);
  }, [debouncedSearch, unused, currentFolder]);

  // Delete mutation — folders are removed via the folder endpoint, files one by
  // one so a protected file stops the batch with a partial result.
  const deleteMutation = useMutation({
    mutationFn: async (keys: Array<string>) => {
      const folderKeys = keys.filter(isFolderKey);
      const fileKeys = keys.filter((key) => !isFolderKey(key));
      const deletedKeys: Array<string> = [];

      for (const key of fileKeys) {
        const result = await deleteImageFn({ data: { key } });
        if (result.error) {
          return { deletedKeys, error: result.error };
        }
        deletedKeys.push(key);
      }

      if (folderKeys.length > 0) {
        const result = await deleteMediaFoldersFn({
          data: { keys: folderKeys },
        });
        if (result.error) {
          return { deletedKeys, error: result.error };
        }
        deletedKeys.push(...folderKeys);
      }

      return { deletedKeys, error: null };
    },
    onSuccess: (result) => {
      const deletedKeys = result.deletedKeys;

      if (deletedKeys.length > 0) {
        // 刷新列表
        queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        // 清除选择
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          deletedKeys.forEach((key) => next.delete(key));
          return next;
        });
      }

      if (result.error) {
        if (deletedKeys.length > 0) {
          toast.warning(m.media_toast_partial_delete(), {
            description: m.media_toast_partial_delete_desc({
              count: deletedKeys.length,
            }),
          });
        } else {
          toast.warning(m.media_toast_delete_fail(), {
            description: m.media_toast_delete_fail_desc(),
          });
        }
        return;
      }

      if (deletedKeys.some(isFolderKey)) {
        toast.success(m.media_toast_folder_deleted());
        return;
      }

      toast.success(m.media_toast_delete_success(), {
        description: m.media_toast_delete_success_desc({
          count: deletedKeys.length,
        }),
      });
    },
    onSettled: () => {
      setDeleteTarget(null);
    },
  });

  // Update name mutation
  const updateAsset = useMutation({
    mutationFn: (payload: Parameters<typeof updateMediaNameFn>[0]) =>
      updateMediaNameFn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_metadata_updated(), {
        description: m.media_toast_metadata_updated_desc(),
      });
    },
  });

  /* ============================ Folder mutations ============================ */

  const createFolder = useMutation({
    mutationFn: (payload: { name: string; parent: string }) =>
      createMediaFolderFn({ data: payload }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(
          result.error.reason === "MEDIA_INVALID_FOLDER_NAME"
            ? m.media_folder_invalid_name()
            : m.request_error_unknown_title(),
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_folder_created());
    },
  });

  const renameFolder = useMutation({
    mutationFn: (payload: { key: string; name: string }) =>
      renameMediaFolderFn({ data: payload }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(
          result.error.reason === "MEDIA_INVALID_FOLDER_NAME"
            ? m.media_folder_invalid_name()
            : m.request_error_unknown_title(),
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_folder_renamed());
    },
  });

  const deleteFolders = useMutation({
    mutationFn: (keys: Array<string>) =>
      deleteMediaFoldersFn({ data: { keys } }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.request_error_unknown_title());
        return;
      }
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_folder_deleted());
    },
  });

  const moveFiles = useMutation({
    mutationFn: (payload: { keys: Array<string>; targetFolder: string }) =>
      moveMediaFilesFn({ data: payload }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.request_error_unknown_title());
        return;
      }
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      toast.success(m.media_toast_move_success());
      setSelectedKeys(new Set());
    },
  });

  /** Inline create used by the folder picker; resolves to the new folder key. */
  const createFolderInline = async (name: string, parent: string) => {
    try {
      const result = await createFolder.mutateAsync({ name, parent });
      return result.error ? undefined : result.data.key;
    } catch {
      return undefined;
    }
  };

  /** One level of sub-folders, used for drill-down in the folder picker. */
  const loadFolders = useCallback(
    async (folder: string) => {
      const directory = await queryClient.fetchQuery(
        mediaDirectoryLookupQuery(normalizeFolderPath(folder)),
      );
      return directory.folders;
    },
    [queryClient],
  );

  // Load more handler - memoized to prevent IntersectionObserver recreation
  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Selection handlers
  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allKeys = [...folders.map((folder) => folder.key), ...files.map((file) => file.key)];
    if (selectedKeys.size === allKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  // Request delete - use cached linkedMediaIds for instant validation
  const requestDelete = (keys: Array<string>) => {
    const fileKeys = keys.filter((key) => !isFolderKey(key));
    const folderKeys = keys.filter(isFolderKey);

    // 使用已缓存的 linkedMediaIds 直接判断，无需额外 API 请求
    const blockedKeys = fileKeys.filter((key) => linkedMediaIds.has(key));
    const allowedFileKeys = fileKeys.filter((key) => !linkedMediaIds.has(key));

    // 如果选中了任何受保护资源，只显示 toast 警告，不弹出确认框
    if (blockedKeys.length > 0) {
      toast.warning(m.media_toast_protected_delete(), {
        description: m.media_toast_protected_delete_desc({
          count: blockedKeys.length,
        }),
      });
      return [];
    }

    // 文件夹无需引用检查：其中的受保护文件会在服务端被跳过
    if (allowedFileKeys.length > 0 || folderKeys.length > 0) {
      setDeleteTarget([...allowedFileKeys, ...folderKeys]);
    }

    return allowedFileKeys;
  };

  // Confirm delete
  const confirmDelete = (keys?: Array<string>) => {
    const target = keys ?? deleteTarget;
    if (!target || target.length === 0) return;
    deleteMutation.mutate(target);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  // Folder rename / move targets handled by modals in the page component.
  const renameFolderByKey = (key: string, name: string) =>
    renameFolder.mutate({ key, name });

  return {
    mediaItems,
    files,
    folders,
    folder: currentFolder,
    setFolder,
    totalCount: folders.length + files.length,
    searchQuery: search ?? "", // Ensure compatibility with string type
    setSearchQuery,
    unusedOnly: unused ?? false,
    setUnusedOnly,
    selectedIds: selectedKeys, // 保持接口兼容
    toggleSelection,
    selectAll,
    deleteTarget,
    deleteTargetHasFolders: (deleteTarget ?? []).some(isFolderKey),
    isDeleting: deleteMutation.isPending,
    requestDelete,
    confirmDelete,
    cancelDelete,
    refetch,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    isPending,
    linkedMediaIds,
    totalMediaSize,
    updateAsset,
    // Folders
    loadFolders,
    createFolder,
    createFolderInline,
    renameFolder,
    renameFolderByKey,
    deleteFolders,
    moveFiles,
  };
}
