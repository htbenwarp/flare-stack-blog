import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, like, sql, ne, notInArray } from "drizzle-orm";
import type { PostStatus } from "@/lib/db/schema";
import { PostsTable } from "@/lib/db/schema";

export type SortField = "publishedAt" | "updatedAt";
export type SortDirection = "ASC" | "DESC";

export function buildPostWhereClause(options: {
  status?: PostStatus;
  publicOnly?: boolean;
  search?: string;
  excludeGuestPosts?: boolean;
  /**
   * 需要排除的文章类型，默认排除 'moment'（动态）
   * 传空数组可不过滤类型（用于查询动态或留言板）
   */
  excludePostTypes?: string[];
}) {
  const {
    status,
    publicOnly,
    search,
    excludeGuestPosts,
    excludePostTypes = ["moment"], // 默认排除动态
  } = options;

  const whereClauses = [];
  const shouldExcludeGuest = excludeGuestPosts ?? true;

  if (status) {
    whereClauses.push(eq(PostsTable.status, status));
  }

  // 公共页面：已发布且未加密的普通文章，排除留言板文章，并检查发布时间
  if (publicOnly) {
    whereClauses.push(eq(PostsTable.status, "published"));
    if (shouldExcludeGuest) {
      whereClauses.push(eq(PostsTable.isGuestPost, false));
    }
    whereClauses.push(ne(PostsTable.slug, "guestbook")); // 排除留言板文章
    whereClauses.push(
      sql`date(${PostsTable.publishedAt}, 'unixepoch') <= date('now')`,
    );
  }

  // 搜索
  if (search) {
    const searchTerm = search.trim();
    if (searchTerm) {
      whereClauses.push(like(PostsTable.title, `%${searchTerm}%`));
    }
  }

  // 排除特定文章类型（默认排除动态）
  if (excludePostTypes.length === 1) {
    whereClauses.push(ne(PostsTable.postType, excludePostTypes[0]));
  } else if (excludePostTypes.length > 1) {
    whereClauses.push(notInArray(PostsTable.postType, excludePostTypes));
  }

  return whereClauses.length > 0 ? and(...whereClauses) : undefined;
}

export function buildPostOrderByClause(
  sortDir?: SortDirection,
  sortBy?: SortField,
): SQL {
  const direction = sortDir ?? "DESC";
  const field = sortBy ?? "updatedAt";
  const orderFn = direction === "DESC" ? desc : asc;
  return orderFn(PostsTable[field]);
}