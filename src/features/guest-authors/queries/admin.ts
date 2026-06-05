import { queryOptions } from "@tanstack/react-query";
import { listGuestAuthorsFn } from "../api/guest-authors.admin.api";

export const guestAuthorsAdminQueryOptions = () =>
  queryOptions({
    queryKey: ["guest-authors", "admin-list"],
    queryFn: async () => {
      const result = await listGuestAuthorsFn();
      if (result.error) throw new Error(result.error.reason);
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  });