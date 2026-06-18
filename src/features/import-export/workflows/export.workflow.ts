import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import * as CacheService from "@/features/cache/cache.service";
import type {
  ExportManifest,
  PostFrontmatter,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import {
  EXPORT_MANIFEST_VERSION,
  IMPORT_EXPORT_CACHE_KEYS,
  IMPORT_EXPORT_R2_KEYS,
} from "@/features/import-export/import-export.schema";
import { stringifyFrontmatter } from "@/features/import-export/utils/frontmatter";
import {
  jsonContentToMarkdown,
  makeExportImageRewriter,
} from "@/features/import-export/utils/markdown-serializer";
import { buildZip } from "@/features/import-export/utils/zip";
import { getFromR2 } from "@/features/media/data/media.storage";
import * as PostRepo from "@/features/posts/data/posts.data"; // 保留导入，但实际可能不再需要 findFullPosts 在这个文件里直接使用？
import { extractAllImageKeys } from "@/features/posts/utils/content";
import { getDb } from "@/lib/db";
import { serverEnv } from "@/lib/env/server.env";
import { m } from "@/paraglide/messages";
import { GuestAuthorsTable, PostsTable } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

type BaseContext = { env: Env };

interface ExportWorkflowParams {
  taskId: string;
  postIds?: string[];
  status?: string;
  locale?: string;
}

const CONCURRENCY = 3;
const BATCH_SIZE = 5;

const tempPrefix = (taskId: string) => `temp/export/${taskId}`;

export class ExportWorkflow extends WorkflowEntrypoint<
  Env,
  ExportWorkflowParams
> {
  async run(event: WorkflowEvent<ExportWorkflowParams>, step: WorkflowStep) {
    const { taskId, postIds, status, locale: requestedLocale } = event.payload;
    const progressKey = IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId);
    const locale = requestedLocale ?? serverEnv(this.env).LOCALE;
    const env = this.env;

    console.log(JSON.stringify({ message: "export workflow started", taskId }));

    const allTagsSet = new Set<string>();
    const allWarnings: string[] = [];
    const allFilePaths: string[] = [];

    try {
      // 步骤1：仅获取文章 ID
      const postIdsResult = await step.do("fetch post ids", async () => {
        const db = getDb(env);
        let query = db.select({ id: PostsTable.id }).from(PostsTable);
        const conditions = [];
        if (postIds && postIds.length > 0) {
          conditions.push(inArray(PostsTable.id, postIds));
        }
        if (status) {
          conditions.push(eq(PostsTable.status, status));
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        const rows = await query.all();
        return {
          ids: rows.map((r) => r.id),
          totalCount: rows.length,
        };
      });

      if (postIdsResult.ids.length === 0) {
        await this.updateProgress(progressKey, {
          status: "completed",
          total: 0,
          completed: 0,
          current: "",
          errors: [],
          warnings: [m.import_export_export_warning_empty({}, { locale })],
        });
        return;
      }

      const allPostIds = postIdsResult.ids;
      const totalPosts = postIdsResult.totalCount;

      // 步骤2：获取客邸作者
      const guestAuthors = await step.do("fetch guest authors", async () => {
        const db = getDb(env);
        const authors = await db.select().from(GuestAuthorsTable).all();
        const authorPostMap: Record<number, string[]> = {};
        for (const author of authors) {
          const relatedPosts = await db
            .select({ slug: PostsTable.slug })
            .from(PostsTable)
            .where(
              and(
                eq(PostsTable.guestAuthorId, author.id),
                eq(PostsTable.isGuestPost, true),
                eq(PostsTable.status, "published"),
              ),
            )
            .all();
          authorPostMap[author.id] = relatedPosts.map((p) => p.slug);
        }
        return authors.map((a) => ({
          id: a.id,
          name: a.name,
          slug: a.slug,
          bio: a.bio,
          avatar: a.avatar,
          posts: authorPostMap[a.id] ?? [],
        }));
      });

      // 步骤3：分批处理文章，收集标签
      for (let batchStart = 0; batchStart < allPostIds.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, allPostIds.length);
        const batchIds = allPostIds.slice(batchStart, batchEnd);

        const batchResult = await step.do(
          `process batch ${batchStart}-${batchEnd}`,
          async () => {
            const db = getDb(env);
            // 查询本批文章的完整数据
            const posts = await db.query.PostsTable.findMany({
              where: inArray(PostsTable.id, batchIds),
              with: { postTags: { with: { tag: true } } },
            });

            const warnings: string[] = [];
            const filePaths: string[] = [];
            const batchTags = new Set<string>();

            const queue = [...posts];
            const worker = async () => {
              while (queue.length > 0) {
                const post = queue.shift()!;
                try {
                  const tags = post.postTags.map((pt) => pt.tag);
                  const postWithTags = { ...post, tags };

                  for (const tag of tags) {
                    batchTags.add(tag.name);
                  }

                  const res = await processPost(postWithTags, env, locale);
                  for (const [filePath, data] of Object.entries(res.zipFiles)) {
                    const tempKey = `${tempPrefix(taskId)}/${filePath}`;
                    const body =
                      typeof data === "string"
                        ? new TextEncoder().encode(data)
                        : data;
                    await env.R2.put(tempKey, body, {
                      httpMetadata: {
                        contentType: filePath.endsWith(".json")
                          ? "application/json"
                          : "application/octet-stream",
                      },
                    });
                    filePaths.push(filePath);
                  }
                  warnings.push(...res.warnings);
                } catch (err) {
                  warnings.push(
                    m.import_export_export_warning_post_failed(
                      { title: post.title, error: String(err) },
                      { locale },
                    ),
                  );
                }
              }
            };

            const workers = Array.from(
              { length: Math.min(CONCURRENCY, posts.length) },
              () => worker(),
            );
            await Promise.all(workers);

            return {
              warnings,
              filePaths,
              batchTags: Array.from(batchTags),
            };
          },
        );

        allWarnings.push(...batchResult.warnings);
        allFilePaths.push(...batchResult.filePaths);
        for (const tagName of batchResult.batchTags) {
          allTagsSet.add(tagName);
        }

        await this.updateProgress(progressKey, {
          status: "processing",
          total: totalPosts,
          completed: batchEnd,
          current: `batch ${batchStart}-${batchEnd}`,
          errors: [],
          warnings: allWarnings,
        });
      }

      // 步骤4：生成 metadata 文件（不再查询数据库）
      await step.do("write metadata files", async () => {
        // 直接从累积的标签集合生成 tags.json
        const tagsJson = JSON.stringify(
          Array.from(allTagsSet).map((name) => ({
            name,
            createdAt: new Date().toISOString(),
          })),
          null,
          2,
        );

        const guestAuthorsJson = JSON.stringify(guestAuthors, null, 2);

        const manifest: ExportManifest = {
          version: EXPORT_MANIFEST_VERSION,
          exportedAt: new Date().toISOString(),
          postCount: totalPosts,
          generator: "blog-cms",
        };
        const manifestJson = JSON.stringify(manifest, null, 2);

        const uploadMeta = async (path: string, content: string) => {
          await env.R2.put(`${tempPrefix(taskId)}/${path}`, content, {
            httpMetadata: { contentType: "application/json" },
          });
          allFilePaths.push(path);
        };

        await Promise.all([
          uploadMeta("tags.json", tagsJson),
          uploadMeta("guest_authors.json", guestAuthorsJson),
          uploadMeta("manifest.json", manifestJson),
        ]);
      });

      // 步骤5：构建最终 ZIP 并上传
      await step.do("build and upload zip", async () => {
        const files: Record<string, Uint8Array | string> = {};

        // 分批下载临时文件，避免内存峰值
        const DOWNLOAD_BATCH = 30;
        for (let i = 0; i < allFilePaths.length; i += DOWNLOAD_BATCH) {
          const batchPaths = allFilePaths.slice(i, i + DOWNLOAD_BATCH);
          const batchPromises = batchPaths.map(async (path) => {
            const tempKey = `${tempPrefix(taskId)}/${path}`;
            const obj = await env.R2.get(tempKey);
            if (obj) {
              const buffer = await obj.arrayBuffer();
              files[path] = new Uint8Array(buffer);
            }
          });
          await Promise.all(batchPromises);
        }

        const zipData = buildZip(files);
        const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);

        await env.R2.put(r2Key, zipData, {
          httpMetadata: { contentType: "application/zip" },
          customMetadata: { taskId },
        });

        // 清理临时文件
        await this.deleteAllTempFiles(tempPrefix(taskId));

        await this.updateProgress(progressKey, {
          status: "completed",
          total: totalPosts,
          completed: totalPosts,
          current: "",
          errors: [],
          warnings: allWarnings,
          downloadKey: r2Key,
        });
      });

      // 24小时后清理最终 ZIP
      const cleanupTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await step.sleepUntil("cleanup delay", cleanupTime);
      await step.do("cleanup export zip", async () => {
        const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);
        try {
          await env.R2.delete(r2Key);
        } catch {
          // ignore
        }
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "export workflow failed",
          taskId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await this.updateProgress(progressKey, {
        status: "failed",
        total: 0,
        completed: 0,
        current: "",
        errors: [
          {
            post: "workflow",
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
        warnings: [],
      });
    }
  }

  private async updateProgress(key: string, progress: TaskProgress) {
    await CacheService.set({ env: this.env }, key, JSON.stringify(progress), {
      ttl: "24h",
    });
  }

  private async deleteAllTempFiles(prefix: string) {
    let cursor: string | undefined;
    do {
      const list = await this.env.R2.list({ prefix, cursor, limit: 100 });
      const keys = list.objects.map((o) => o.key);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.env.R2.delete(key)));
      }
      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);
  }
}

// ---------- 辅助函数 ----------

async function processPost(
  post: any,
  env: Env,
  locale: string,
): Promise<{
  zipFiles: Record<string, Uint8Array | string>;
  warnings: string[];
}> {
  const zipFiles: Record<string, Uint8Array | string> = {};
  const warnings: string[] = [];
  const slug = post.slug;
  const prefix = `posts/${slug}`;

  const safeDate = (date: unknown): string | null => {
    if (date instanceof Date) return date.toISOString();
    return null;
  };

  const frontmatter: PostFrontmatter = {
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? undefined,
    status: post.status,
    publishedAt: safeDate(post.publishedAt),
    createdAt: safeDate(post.createdAt),
    updatedAt: safeDate(post.updatedAt),
    readTimeInMinutes: post.readTimeInMinutes,
    tags: (post.tags ?? []).map((t) => t.name),
    isGuestPost: post.isGuestPost ?? false,
    guestAuthorId: post.guestAuthorId ?? undefined,
  };

  const rewriter = makeExportImageRewriter();
  const markdown = post.contentJson
    ? jsonContentToMarkdown(post.contentJson, { rewriteImageSrc: rewriter })
    : "";

  zipFiles[`${prefix}/index.md`] = stringifyFrontmatter(frontmatter, markdown);

  if (post.contentJson) {
    zipFiles[`${prefix}/content.json`] = JSON.stringify(
      post.contentJson,
      null,
      2,
    );
  }

  if (post.contentJson) {
    const imageKeys = extractAllImageKeys(post.contentJson);
    const downloadPromises = imageKeys.map(async (key) => {
      try {
        const r2Object = await getFromR2(env, key);
        if (r2Object) {
          const arrayBuffer = await r2Object.arrayBuffer();
          zipFiles[`${prefix}/images/${key}`] = new Uint8Array(arrayBuffer);
        } else {
          warnings.push(
            m.import_export_export_warning_image_missing(
              { key, title: post.title },
              { locale },
            ),
          );
        }
      } catch (error) {
        warnings.push(
          m.import_export_export_warning_image_download_failed(
            {
              key,
              title: post.title,
              error: error instanceof Error ? error.message : String(error),
            },
            { locale },
          ),
        );
      }
    });
    await Promise.all(downloadPromises);
  }

  return { zipFiles, warnings };
}
