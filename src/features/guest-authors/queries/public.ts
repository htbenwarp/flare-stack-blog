import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query";
import { getGuestAuthorsFn, getGuestAuthorBySlugFn, getGuestPostsCursorFn, getGuestHouseTagsFn, getGuestAuthorTagsFn, } from "../api/public.api";

function transformDates(item: any) {
  return { ...item, publishedAt: item.publishedAt ? new Date(item.publishedAt) : null, createdAt: item.createdAt ? new Date(item.createdAt) : null, updatedAt: item.updatedAt ? new Date(item.updatedAt) : null };
}

export const guestAuthorsQueryOptions = () => queryOptions({
  queryKey: ["guest-house", "authors"],
  queryFn: () => getGuestAuthorsFn(),
  staleTime: 60 * 60 * 1000,
});

export const guestHouseTagsQueryOptions = () =>
  queryOptions({
    queryKey: ["guest-house", "tags"],
    queryFn: () => getGuestHouseTagsFn(),
    staleTime: 0,
  });

export const guestAuthorBySlugQueryOptions = (slug: string) => queryOptions({
  queryKey: ["guest-house", "author", slug],
  queryFn: () => getGuestAuthorBySlugFn({ data: { slug } }),
});

export function guestPostsInfiniteQueryOptions(filters: { authorSlug?: string; tagName?: string; limit?: number } = {}) {
  const pageSize = filters.limit ?? 12;
  return infiniteQueryOptions({
    queryKey: ["guest-house", "posts", filters],
    queryFn: async ({ pageParam }) => {
      const result = await getGuestPostsCursorFn({
        data: { cursor: pageParam, limit: pageSize, authorSlug: filters.authorSlug, tagName: filters.tagName },
      });
      return { ...result, items: result.items.map(transformDates) };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });
}

export const guestAuthorTagsQueryOptions = (authorSlug: string) =>
  queryOptions({
    queryKey: ["guest-house", "author-tags", authorSlug],
    queryFn: () => getGuestAuthorTagsFn({ data: { authorSlug } }),
    staleTime: 0,
  });
