import { queryOptions } from "@tanstack/react-query";
import { listGuestAuthorsFn } from "../api/guest-authors.admin.api";

export const guestAuthorsAdminQueryOptions = () =>
  queryOptions({
    queryKey: ["guest-authors", "admin-list"],
    queryFn: () => listGuestAuthorsFn(),
    staleTime: 5 * 60 * 1000,
  });