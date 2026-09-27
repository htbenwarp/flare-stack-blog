// src/features/moments/data/moments.data.ts
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { PostsTable, user } from "@/lib/db/schema";
import type { JSONContent } from "@tiptap/react";

const DEFAULT_PAGE_SIZE = 20;

/**
 * 客户端时区偏移（分钟，即 `Date.prototype.getTimezoneOffset()` 的值）。
 * 约定 `本地时间 = UTC - offset`，例如东八区 offset 为 -480。
 */
type TimezoneOffset = number | undefined;

/** 规范并夹取时区偏移，非法或未传时退回 UTC(0)。 */
function normalizeTimezoneOffset(offset: TimezoneOffset): number {
  if (offset === undefined || !Number.isFinite(offset)) return 0;
  return Math.max(-840, Math.min(840, Math.trunc(offset)));
}

export async function getMomentsByCursor(
  db: DB,
  options: {
    cursor?: number;
    limit?: number;
    date?: string;
    timezoneOffset?: number;
  } = {}
) {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    date: filterDate,
    timezoneOffset,
  } = options;

  const whereClauses = [
    eq(PostsTable.postType, "moment"),
    eq(PostsTable.status, "published"),
  ];

  if (cursor) {
    whereClauses.push(lt(PostsTable.publishedAt, new Date(cursor)));
  }

  // 日期过滤：按「客户端本地时区」构造当天范围。
  // Workers 上服务端时区恒为 UTC，因此不能直接用 new Date(y, m-1, d)，
  // 否则东八区凌晨发布的动态会被算到前一天。
  // 本地 = UTC - offset  ⇒  UTC = 本地挂钟 + offset
  if (filterDate) {
    const [year, month, day] = filterDate.split("-").map(Number);
    const offsetMs = normalizeTimezoneOffset(timezoneOffset) * 60_000;
    const startOfDay = new Date(Date.UTC(year, month - 1, day) + offsetMs);
    const endOfDay = new Date(Date.UTC(year, month - 1, day + 1) + offsetMs);

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

export async function getMomentDateDistribution(
  db: DB,
  timezoneOffset?: number
) {
  // 按客户端本地时区分组：把存储的 UTC 秒数加上「-offset」分钟即为本地挂钟。
  // 例如东八区 offset=-480 → '+480 minutes'；服务端自身的 'localtime' 是 UTC，
  // 用它会导致日历圆点按 UTC 日期落位，与本地日历格错位。
  const localMinutes = -normalizeTimezoneOffset(timezoneOffset);
  const modifier = `${localMinutes} minutes`;

  const results = await db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', datetime(${PostsTable.publishedAt}, 'unixepoch', ${modifier}))`.as('date'),
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