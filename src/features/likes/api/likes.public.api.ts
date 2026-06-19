import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, sql, inArray } from "drizzle-orm";
import { dbMiddleware } from "@/lib/middlewares";
import { PageLikesTable, PageLikesIpTable } from "@/lib/db/schema";

export const getLikeCountFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ path: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const row = await context.db.query.PageLikesTable.findFirst({
      where: eq(PageLikesTable.path, data.path),
    });
    return { count: row?.count ?? 0 };
  });

export const postLikeFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ path: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    // 获取客户端 IP
    let ip = "0.0.0.0";
    try {
      const request = (context as any).request as Request | undefined;
      if (request) {
        ip =
          request.headers.get("CF-Connecting-IP") ||
          request.headers.get("X-Forwarded-For") ||
          request.headers.get("X-Real-IP") ||
          "0.0.0.0";
      }
    } catch {}

    const path = data.path;

    // 24 小时前的 Unix 时间戳（秒）
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    // 检查 IP 是否在 24 小时内已点赞
    const existing = await context.db.query.PageLikesIpTable.findFirst({
      where: and(
        eq(PageLikesIpTable.ip, ip),
        eq(PageLikesIpTable.path, path),
        sql`${PageLikesIpTable.createdAt} > ${twentyFourHoursAgo}`,
      ),
    });

    if (existing) {
      const row = await context.db.query.PageLikesTable.findFirst({
        where: eq(PageLikesTable.path, path),
      });
      return { count: row?.count ?? 0, alreadyLiked: true };
    }

    // 更新或插入点赞计数
    const likeRow = await context.db.query.PageLikesTable.findFirst({
      where: eq(PageLikesTable.path, path),
    });

    let newCount: number;
    const now = new Date();
    if (likeRow) {
      await context.db
        .update(PageLikesTable)
        .set({
          count: likeRow.count + 1,
          updatedAt: now,
        })
        .where(eq(PageLikesTable.id, likeRow.id));
      newCount = likeRow.count + 1;
    } else {
      await context.db.insert(PageLikesTable).values({
        path,
        count: 1,
        createdAt: now,
        updatedAt: now,
      });
      newCount = 1;
    }

    // 记录 IP（仅当有效 IP 时）
    if (ip !== "0.0.0.0") {
      await context.db.insert(PageLikesIpTable).values({
        ip,
        path,
        createdAt: new Date(),
      });
    }

    return { count: newCount, alreadyLiked: false };
  });

// 批量获取多个路径的点赞数
export const getLikeCountsByPathsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ paths: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    if (data.paths.length === 0) return [];
    const rows = await context.db
      .select({
        path: PageLikesTable.path,
        count: PageLikesTable.count,
      })
      .from(PageLikesTable)
      .where(inArray(PageLikesTable.path, data.paths))
      .all();
    return rows;
  });