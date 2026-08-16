import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type {
  GetPostsCountInput,
  GetPostsInput,
} from "@/features/posts/schema/posts.schema";
import {
  normalizePostTagName,
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
  PublicPostsPageResponseSchema,
} from "@/features/posts/schema/posts.schema";
import { apiClient } from "@/lib/api-client";
import { isSSR } from "@/lib/utils";
import {
  getPostRevisionFn,
  listPostRevisionsFn,
} from "../api/post-revisions.admin.api";
import { findPostByIdFn } from "../api/posts.admin.api";
import {
  findPostBySlugFn,
  getPinnedPostsFn,
  getPopularPostsFn,
  getPostsCursorFn,
  getPublicPostsPageFn,
  getRelatedPostsFn,
} from "../api/posts.public.api";
import { getPostGuestAuthorSlugFn } from "../api/posts.public.api";

export const POSTS_KEYS = {
  all: ["posts"] as const,

  // Parent keys (static arrays for prefix invalidation)
  pinned: ["posts", "pinned"] as const,
  lists: ["posts", "list"] as const,
  details: ["posts", "detail"] as const,
  recent: ["posts", "recent"] as const,
  popular: ["posts", "popular"] as const,
  publicPage: ["posts", "public-page"] as const,
  adminLists: ["posts", "admin-list"] as const,
  counts: ["posts", "count"] as const,
  revisions: ["posts", "revisions"] as const,
  revisionDetails: ["posts", "revision-detail"] as const,

  // Child keys (functions for specific queries)
  list: (filters: { tagName?: string; limit?: number } = {}) =>
    [
      "posts",
      "list",
      {
        ...filters,
        tagName: normalizePostTagName(filters.tagName),
      },
    ] as const,
  detail: (idOrSlug: number | string) => ["posts", "detail", idOrSlug] as const,
  related: (slug: string, limit?: number) =>
    ["posts", "related", slug, limit] as const,
  adminList: (params: GetPostsInput) =>
    ["posts", "admin-list", params] as const,
  count: (params: GetPostsCountInput) => ["posts", "count", params] as const,
  revisionList: (postId: number) => ["posts", "revisions", postId] as const,
  revisionDetail: (postId: number, revisionId: number) =>
    ["posts", "revision-detail", postId, revisionId] as const,
};

// ============ 公开文章分页查询 ============
export function publicPostsPageQuery(
  filters: { offset?: number; limit?: number; excludeIds?: number[] } = {},
) {
  const rawOffset = filters.offset ?? 0;
  const offset = Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0;
  const rawLimit = filters.limit ?? 10;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.floor(rawLimit), 50)
    : 10;
  const excludeIds = filters.excludeIds ?? [];

  return queryOptions({
    queryKey: [...POSTS_KEYS.publicPage, offset, limit, excludeIds],
    queryFn: async () => {
      return await getPublicPostsPageFn({ data: { offset, limit, excludeIds } });
    },
  });
}

// ============ 最近文章查询 ============

export function recentPostsQuery(limit: number) {
  return queryOptions({
    queryKey: [...POSTS_KEYS.recent, limit],
    queryFn: async () => {
      if (isSSR) {
        const result = await getPostsCursorFn({ data: { limit } });
        return result.items;
      }
      const res = await apiClient.posts.$get({
        query: { limit: String(limit) },
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return PostListResponseSchema.parse(await res.json()).items;
    },
  });
}

// ============ 无限滚动查询（游标分页） ============

export function postsInfiniteQueryOptions(
  filters: { tagName?: string; limit?: number } = {},
) {
  const pageSize = filters.limit ?? 12;
  const tagName = normalizePostTagName(filters.tagName);
  return infiniteQueryOptions({
    queryKey: POSTS_KEYS.list({ ...filters, tagName }),
    queryFn: async ({ pageParam }) => {
      if (isSSR) {
        return await getPostsCursorFn({
          data: {
            cursor: pageParam,
            limit: pageSize,
            tagName,
          },
        });
      }
      const res = await apiClient.posts.$get({
        query: {
          cursor: pageParam?.toString(),
          limit: String(pageSize),
          tagName,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return PostListResponseSchema.parse(await res.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as number | undefined,
  });
}

// ============ 文章详情查询 ============

export function postBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: POSTS_KEYS.detail(slug),
    queryFn: async () => {
      if (isSSR) {
        return await findPostBySlugFn({ data: { slug } });
      }

      const res = await apiClient.post[":slug"].$get({ param: { slug } });
      if (!res.ok) throw new Error("Failed to fetch post");
      const json = await res.json();

      // 尝试严格解析，失败时如果是加密文章则直接返回原始 JSON
      const parsed = PostWithTocSchema.safeParse(json);
      if (parsed.success) return parsed.data;

      if (json && json.isEncrypted) {
        // 确保返回对象包含必要字段，避免组件崩溃
        return {
          ...json,
          slug: slug,
          contentJson: json.contentJson ?? { type: "doc", content: [] },
          toc: json.toc ?? [],
          tags: json.tags ?? [],
        } as any;
      }

      throw new Error("Invalid post data");
    },
  });
}

// ============ 文章 ID 查询（管理后台） ============

export function postByIdQuery(id: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.detail(id),
    queryFn: async () => {
      const post = await findPostByIdFn({ data: { id } });
      if (!post) throw new Error("Post not found");
      return {
        ...post,
        isGuestPost: post.isGuestPost ?? false,
        guestAuthorId: post.guestAuthorId ?? null,
      };
    },
    staleTime: 0,
  });
}

// ============ 相关文章查询 ============

export function relatedPostsQuery(slug: string, limit?: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.related(slug, limit),
    queryFn: async () => {
      if (isSSR) {
        return await getRelatedPostsFn({ data: { slug, limit } });
      }
      const res = await apiClient.post[":slug"].related.$get({
        param: { slug },
        query: { limit: limit != null ? String(limit) : undefined },
      });
      if (!res.ok) throw new Error("Failed to fetch related posts");
      const json = await res.json();
      const result = PostItemSchema.array().safeParse(json);
      if (!result.success) {
        console.error(
          JSON.stringify({
            message: "related posts response parse failed",
            error: result.error.message,
            received: typeof json,
          }),
        );
        return [];
      }
      return result.data;
    },
  });
}

// ============ 文章版本查询 ============

export function postRevisionListQuery(postId: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.revisionList(postId),
    queryFn: () => listPostRevisionsFn({ data: { postId } }),
  });
}

export function postRevisionDetailQuery(postId: number, revisionId: number) {
  return queryOptions({
    queryKey: POSTS_KEYS.revisionDetail(postId, revisionId),
    queryFn: async () =>
      (await getPostRevisionFn({ data: { postId, revisionId } })) ?? null,
  });
}

// ============ 置顶文章查询 ============

export const pinnedPostsQuery = queryOptions({
  queryKey: POSTS_KEYS.pinned,
  queryFn: () => getPinnedPostsFn(),
});

// ============ 热门文章查询 ============

export function popularPostsQuery(limit?: number) {
  return queryOptions({
    queryKey: [...POSTS_KEYS.popular, limit],
    queryFn: () => getPopularPostsFn({ data: { limit } }),
  });
}

// ============ 客邸作者 Slug 查询 ============

export function postGuestAuthorSlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["posts", "guest-author-slug", slug],
    queryFn: () => getPostGuestAuthorSlugFn({ data: { slug } }),
    staleTime: 0,
  });
}