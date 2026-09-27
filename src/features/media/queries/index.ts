import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  getLinkedMediaKeysFn,
  getMediaDirectoryFn,
  getMediaFn,
  getTotalMediaSizeFn,
} from "../api/media.api";

export const MEDIA_KEYS = {
  all: ["media"] as const,

  // Parent keys (static arrays for prefix invalidation)
  lists: ["media", "list"] as const,
  totalSize: ["media", "total-size"] as const,
  linked: ["media", "linked-keys"] as const,
  directory: ["media", "directory"] as const,

  // Child keys (functions for specific queries)
  list: (search: string = "", unusedOnly: boolean = false) =>
    ["media", "list", search, unusedOnly] as const,
  linkedKeys: (keys: string) => ["media", "linked-keys", keys] as const,
  linkedPosts: (key: string) => ["media", "linked-posts", key] as const,
  dir: (folder: string, search: string, unusedOnly: boolean) =>
    ["media", "directory", folder, search, unusedOnly] as const,
  // Single-level lookup used by folder pickers; deliberately separate from the
  // page-shaped infinite query cache above.
  dirLookup: (folder: string) =>
    ["media", "directory", "lookup", folder] as const,
};

export function mediaInfiniteQueryOptions(
  search: string = "",
  unusedOnly: boolean = false,
) {
  return infiniteQueryOptions({
    queryKey: MEDIA_KEYS.list(search, unusedOnly),
    queryFn: ({ pageParam }) =>
      getMediaFn({
        data: {
          cursor: pageParam,
          search: search || undefined,
          unusedOnly: unusedOnly || undefined,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });
}

/**
 * Delimited, cursor-paged listing of one virtual folder. Folders come back in
 * `folders` and the files directly inside the folder in `files`.
 */
export function mediaDirectoryInfiniteQueryOptions(
  folder: string,
  search: string,
  unusedOnly: boolean,
) {
  return infiniteQueryOptions({
    queryKey: MEDIA_KEYS.dir(folder, search, unusedOnly),
    queryFn: ({ pageParam }) =>
      getMediaDirectoryFn({
        data: {
          folder,
          cursor: pageParam,
          search: search || undefined,
          unusedOnly: unusedOnly || undefined,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

/** One-level folder lookup for the folder pickers. */
export function mediaDirectoryLookupQuery(folder: string) {
  return queryOptions({
    queryKey: MEDIA_KEYS.dirLookup(folder),
    queryFn: () =>
      getMediaDirectoryFn({
        data: { folder, limit: 500 },
      }),
    staleTime: 0,
  });
}

export function linkedMediaKeysQuery(keys: Array<string>) {
  // Stable key for linked media; use joined keys to avoid referential changes
  const joinedKeys = keys.join("|");
  return queryOptions({
    queryKey: MEDIA_KEYS.linkedKeys(joinedKeys),
    queryFn: () => getLinkedMediaKeysFn({ data: { keys } }),
    staleTime: 30000,
  });
}

export const totalMediaSizeQuery = queryOptions({
  queryKey: MEDIA_KEYS.totalSize,
  queryFn: () => getTotalMediaSizeFn(),
});
