import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq, desc, lt, gt, or, inArray, count } from "drizzle-orm";
import { dbMiddleware } from "@/lib/middlewares";
import {
  GuestAuthorsTable,
  PostsTable,
  PostTagsTable,
  TagsTable,
} from "@/lib/db/schema";

// ========== 获取所有作者（含文章数） ==========
export const getGuestAuthorsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const authors = await context.db.query.GuestAuthorsTable.findMany();
    const result = await Promise.all(
      authors.map(async (author) => {
        const [row] = await context.db
          .select({ count: count() })
          .from(PostsTable)
          .where(
            and(
              eq(PostsTable.isGuestPost, true),
              eq(PostsTable.guestAuthorId, author.id),
              eq(PostsTable.status, "published"),
            ),
          );
        return { ...author, postCount: row?.count ?? 0 };
      }),
    );
    return result.filter((a) => a.postCount > 0);
  });

// ========== 通过 Slug 获取单个作者 ==========
export const getGuestAuthorBySlugFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    const author = await context.db.query.GuestAuthorsTable.findFirst({
      where: eq(GuestAuthorsTable.slug, data.slug),
    });
    if (!author) return null;

    const [row] = await context.db
      .select({ count: count() })
      .from(PostsTable)
      .where(
        and(
          eq(PostsTable.isGuestPost, true),
          eq(PostsTable.guestAuthorId, author.id),
          eq(PostsTable.status, "published"),
        ),
      );
    return { ...author, postCount: row?.count ?? 0 };
  });

// ========== 客邸文章分页查询（游标 + 标签过滤） ==========
export const getGuestPostsCursorFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(
    z.object({
      cursor: z.number().optional(),
      limit: z.number().optional().default(12),
      authorSlug: z.string().optional(),
      tagName: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { cursor, limit, authorSlug, tagName } = data;

    // 基础条件：必须是客邸已发布文章
    const conditions: any[] = [
      eq(PostsTable.isGuestPost, true),
      eq(PostsTable.status, "published"),
    ];

    if (authorSlug) {
      const author = await context.db.query.GuestAuthorsTable.findFirst({
        where: eq(GuestAuthorsTable.slug, authorSlug),
        columns: { id: true },
      });
      if (!author) return { items: [], nextCursor: null };
      conditions.push(eq(PostsTable.guestAuthorId, author.id));
    }

    // 游标条件（基于 publishedAt 降序，与主站一致）
    if (cursor) {
      const reference = await context.db.query.PostsTable.findFirst({
        where: eq(PostsTable.id, cursor),
        columns: { publishedAt: true, id: true },
      });
      if (reference?.publishedAt) {
        conditions.push(
          or(
            lt(PostsTable.publishedAt, reference.publishedAt),
            and(
              eq(PostsTable.publishedAt, reference.publishedAt),
              lt(PostsTable.id, reference.id),
            ),
          ),
        );
      } else if (reference) {
        conditions.push(lt(PostsTable.id, cursor));
      }
    }

    // 标签过滤（通过 join 实现）
    if (tagName) {
      conditions.push(eq(TagsTable.name, tagName));
    }

    let query = context.db
      .select({
        id: PostsTable.id,
        title: PostsTable.title,
        summary: PostsTable.summary,
        readTimeInMinutes: PostsTable.readTimeInMinutes,
        slug: PostsTable.slug,
        status: PostsTable.status,
        publishedAt: PostsTable.publishedAt,
        pinnedAt: PostsTable.pinnedAt,
        createdAt: PostsTable.createdAt,
        updatedAt: PostsTable.updatedAt,
        isGuestPost: PostsTable.isGuestPost,
        guestAuthorId: PostsTable.guestAuthorId,
      })
      .from(PostsTable)
      .$dynamic();

    if (tagName) {
      query = query
        .innerJoin(PostTagsTable, eq(PostsTable.id, PostTagsTable.postId))
        .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id));
    }

    const itemsWithPotentialNext = await query
      .where(and(...conditions))
      .orderBy(desc(PostsTable.publishedAt), desc(PostsTable.id))
      .limit(limit + 1);

    const hasMore = itemsWithPotentialNext.length > limit;
    const items = itemsWithPotentialNext.slice(0, limit) as any[];

    // 补充标签信息
    if (items.length > 0) {
      const postIds = items.map((p) => p.id);
      const tagsResults = await context.db
        .select({
          postId: PostTagsTable.postId,
          tag: { id: TagsTable.id, name: TagsTable.name },
        })
        .from(PostTagsTable)
        .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id))
        .where(inArray(PostTagsTable.postId, postIds));

      const tagsByPostId = new Map();
      for (const r of tagsResults) {
        const list = tagsByPostId.get(r.postId) ?? [];
        list.push(r.tag);
        tagsByPostId.set(r.postId, list);
      }
      items.forEach((item: any) => {
        item.tags = tagsByPostId.get(item.id) ?? [];
      });
    }

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  });

// ========== 获取指定作者的标签 ==========
export const getGuestAuthorTagsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ authorSlug: z.string() }))
  .handler(async ({ data, context }) => {
    const author = await context.db.query.GuestAuthorsTable.findFirst({
      where: eq(GuestAuthorsTable.slug, data.authorSlug),
      columns: { id: true },
    });
    if (!author) return [];

    return await context.db
      .selectDistinct({ name: TagsTable.name, count: count() })
      .from(PostTagsTable)
      .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id))
      .innerJoin(PostsTable, eq(PostTagsTable.postId, PostsTable.id))
      .where(
        and(
          eq(PostsTable.isGuestPost, true),
          eq(PostsTable.guestAuthorId, author.id),
          eq(PostsTable.status, "published"),
        ),
      )
      .groupBy(TagsTable.name);
  });

// ========== 获取客邸全站标签 ==========
export const getGuestHouseTagsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    return await context.db
      .selectDistinct({ name: TagsTable.name, count: count() })
      .from(PostTagsTable)
      .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id))
      .innerJoin(PostsTable, eq(PostTagsTable.postId, PostsTable.id))
      .where(
        and(
          eq(PostsTable.isGuestPost, true),
          eq(PostsTable.status, "published"),
        ),
      )
      .groupBy(TagsTable.name);
  });