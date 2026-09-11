import type { JSONContent } from "@tiptap/react";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { extractAllImageKeys } from "@/features/posts/utils/content";
import { MediaTable, PostMediaTable, PostsTable } from "@/lib/db/schema";

export async function syncPostMedia(
  db: DB,
  postId: number,
  contentJson: JSONContent | null,
) {
  // 1. 获取文章中使用的图片 key
  const usedKeys = extractAllImageKeys(contentJson);

  // 2. 准备sql语句
  const batchQueries: Array<BatchItem<"sqlite">> = [];

  // 2.1 准备删除文章中已有的图片关联语句
  const deleteQuery = db
    .delete(PostMediaTable)
    .where(eq(PostMediaTable.postId, postId));

  // 3. 如果有引用的图片，先查询图片是否存在
  if (usedKeys.length > 0) {
    const mediaRecords = await db
      .select({ id: MediaTable.id })
      .from(MediaTable)
      .where(inArray(MediaTable.key, usedKeys));

    if (mediaRecords.length > 0) {
      const newRelations = mediaRecords.map((media) => ({
        postId,
        mediaId: media.id,
      }));

      batchQueries.push(db.insert(PostMediaTable).values(newRelations));
    }
  }

  // 4. 执行批量操作
  await db.batch([deleteQuery, ...batchQueries]);
}

export async function getPostsByMediaKey(db: DB, key: string) {
  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      readTimeInMinutes: PostsTable.readTimeInMinutes,
      slug: PostsTable.slug,
      status: PostsTable.status,
    })
    .from(PostsTable)
    .innerJoin(PostMediaTable, eq(PostsTable.id, PostMediaTable.postId))
    .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(eq(MediaTable.key, key));

  // Posts that use this media as their cover are usages too, even when the
  // image never appears in the body.
  const coverPosts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      readTimeInMinutes: PostsTable.readTimeInMinutes,
      slug: PostsTable.slug,
      status: PostsTable.status,
    })
    .from(PostsTable)
    .innerJoin(MediaTable, eq(MediaTable.id, PostsTable.coverMediaId))
    .where(eq(MediaTable.key, key));

  const byId = new Map<number, (typeof posts)[number]>();
  for (const post of [...posts, ...coverPosts]) {
    byId.set(post.id, post);
  }

  return [...byId.values()];
}

/**
 * 检查媒体是否被文章使用（正文引用或作为文章封面）
 */
export async function isMediaInUse(db: DB, key: string): Promise<boolean> {
  const result = await db
    .select({ id: PostMediaTable.postId })
    .from(PostMediaTable)
    .innerJoin(MediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(eq(MediaTable.key, key))
    .limit(1);

  if (result.length > 0) return true;

  const coverResult = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .innerJoin(MediaTable, eq(MediaTable.id, PostsTable.coverMediaId))
    .where(eq(MediaTable.key, key))
    .limit(1);

  return coverResult.length > 0;
}

/**
 * 批量检查
 */
export async function getLinkedMediaKeys(
  db: DB,
  keys: Array<string>,
): Promise<Array<string>> {
  if (keys.length === 0) return [];

  // 查询哪些 keys 存在于中间表中
  const results = await db
    .selectDistinct({ key: MediaTable.key }) // 只需要 key
    .from(MediaTable)
    .innerJoin(PostMediaTable, eq(MediaTable.id, PostMediaTable.mediaId))
    .where(inArray(MediaTable.key, keys));

  // 作为文章封面被引用的媒体同样算作已使用
  const coverResults = await db
    .selectDistinct({ key: MediaTable.key })
    .from(MediaTable)
    .innerJoin(PostsTable, eq(PostsTable.coverMediaId, MediaTable.id))
    .where(inArray(MediaTable.key, keys));

  return [...new Set([...results, ...coverResults].map((r) => r.key))];
}
