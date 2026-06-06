import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listGuestAuthorsFn,
  createGuestAuthorFn,
  updateGuestAuthorFn,
  deleteGuestAuthorFn,
} from "../api/guest-authors.admin.api";

export const guestAuthorsListQueryOptions = () =>
  queryOptions({
    queryKey: ["guest-authors", "list"],
    queryFn: () => listGuestAuthorsFn(),   // 直接返回数组
  });

export function useCreateGuestAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string; bio?: string; avatar?: string }) =>
      createGuestAuthorFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
    },
  });
}

export function useUpdateGuestAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; name?: string; slug?: string; bio?: string; avatar?: string }) =>
      updateGuestAuthorFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
    },
  });
}

export function useDeleteGuestAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGuestAuthorFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
    },
  });
}