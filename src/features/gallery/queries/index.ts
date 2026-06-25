import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listGalleryItemsFn,
  createGalleryItemFn,
  updateGalleryItemFn,
  deleteGalleryItemFn,
} from "../api/gallery.admin.api";

// 列表查询
export const galleryItemsAdminQueryOptions = () =>
  queryOptions({
    queryKey: ["gallery", "admin", "list"],
    queryFn: () => listGalleryItemsFn().then(res => res.data ?? []),
    staleTime: 60 * 1000,
  });

// 创建 hook
export function useCreateGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; description?: string; imageKey: string; sortOrder?: number }) =>
      createGalleryItemFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery", "admin"] }),
  });
}

// 更新 hook
export function useUpdateGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; data: { title?: string; description?: string; imageKey?: string; sortOrder?: number } }) =>
      updateGalleryItemFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery", "admin"] }),
  });
}

// 删除 hook
export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGalleryItemFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery", "admin"] }),
  });
}