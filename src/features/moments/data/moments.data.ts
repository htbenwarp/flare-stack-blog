// src/features/moments/data/moments.data.ts
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { PostsTable, user } from "@/lib/db/schema";
import type { JSONContent } from "@tiptap/react";

const DEFAULT_PAGE_SIZE = 20;

export async function getMomentsByCursor(
  db: DB,
  options: { cursor?: number; limit?: number; date?: string } = {}
) {
  const { cursor, limit = DEFAULT_PAGE_SIZE, date: filterDate } = options;

  const whereClauses = [
    eq(PostsTable.postType, "moment"),
    eq(PostsTable.status, "published"),
  ];

  if (cursor) {
    whereClauses.push(lt(PostsTable.publishedAt, new Date(cursor)));
  }

  // 日期过滤：使用本地时区构造当天范围
  if (filterDate) {
    const [year, month, day] = filterDate.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day);
    const endOfDay = new Date(year, month - 1, day + 1);

    whereClauses.push(gte(PostsTable.publishedAt, startOfDay));
    whereClauses.push(lt(PostsTable.publishedAt, endOfDay));
  }

  const rows = await db
    .select({
      id: PostsTable.id,
      slug: PostsTable.slug,
      contentJson: PostsTable.contentJson,
      summary: PostsTable.summary,
      publishedAt: PostsTable.publishedAt,
      authorId: PostsTable.userId,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(PostsTable)
    .leftJoin(user, eq(PostsTable.userId, user.id))
    .where(and(...whereClauses))
    .orderBy(desc(PostsTable.publishedAt))
    .limit(Math.min(limit, 50));

  return rows.map((row) => {
    let location: string | undefined;
    let deviceInfo: Record<string, string> | undefined;
    try {
      if (row.summary) {
        const meta = JSON.parse(row.summary);
        location = meta.location;
        deviceInfo = meta.device;
      }
    } catch {}

    return {
      id: row.id,
      slug: row.slug,
      content: row.contentJson as JSONContent,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      location,
      deviceInfo,
      author: row.authorName
        ? { name: row.authorName, image: row.authorImage }
        : null,
    };
  });
}

export async function insertMoment(
  db: DB,
  data: {
    slug: string;
    content: JSONContent;
    summary?: string;
    publishedAt: Date;
    userId: string;
  }
) {
  const [moment] = await db
    .insert(PostsTable)
    .values({
      title: `Moment ${data.slug}`,
      slug: data.slug,
      contentJson: data.content,
      summary: data.summary ?? null,
      postType: "moment",
      status: "published",
      publishedAt: data.publishedAt,
      userId: data.userId,
    })
    .returning({ id: PostsTable.id, slug: PostsTable.slug });

  return moment;
}

export async function getMomentDateDistribution(db: DB) {
  const results = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', datetime(${PostsTable.publishedAt}, 'unixepoch', 'localtime'))`.as('date'),
      count: count().as('count'),
    })
    .from(PostsTable)
    .where(
      and(
        eq(PostsTable.postType, "moment"),
        eq(PostsTable.status, "published")
      )
    )
    .groupBy(({ date }) => date)
    .orderBy(({ date }) => date);

  return (results ?? []) as Array<{ date: string; count: number }>;
}

/**
 * 更新动态内容、位置、发布时间
 */
export async function updateMoment(
  db: DB,
  id: number,
  data: {
    content?: JSONContent;
    location?: string;
    publishedAt?: Date;
  }
) {
  // 获取原有 summary，以便合并 device 信息
  const existing = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.id, id),
    columns: { summary: true },
  });

  let meta: any = {};
  try {
    if (existing?.summary) {
      meta = JSON.parse(existing.summary);
    }
  } catch {}

  // 更新位置
  if (data.location !== undefined) {
    meta.location = data.location;
  }

  const updateData: Record<string, any> = {};
  if (data.content !== undefined) updateData.contentJson = data.content;
  if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
  updateData.summary = JSON.stringify(meta);

  const [updated] = await db
    .update(PostsTable)
    .set(updateData)
    .where(eq(PostsTable.id, id))
    .returning({ id: PostsTable.id, slug: PostsTable.slug });

  return updated;
}

/**
 * 删除动态
 */
export async function deleteMoment(db: DB, id: number) {
  await db.delete(PostsTable).where(and(eq(PostsTable.id, id), eq(PostsTable.postType, "moment")));
  return { success: true };
}