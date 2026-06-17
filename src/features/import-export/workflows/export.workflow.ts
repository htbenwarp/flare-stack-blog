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
import * as PostRepo from "@/features/posts/data/posts.data";
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

const CONCURRENCY = 5;
const BATCH_SIZE = 5;

// 临时文件存放路径前缀
const tempPrefix = (taskId: string) => `temp/export/${taskId}`;

export class ExportWorkflow extends WorkflowEntrypoint<Env, ExportWorkflowParams> {
  async run(event: WorkflowEvent<ExportWorkflowParams>, step: WorkflowStep) {
    const { taskId, postIds, status, locale: requestedLocale } = event.payload;
    const progressKey = IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId);
    const locale = requestedLocale ?? serverEnv(this.env).LOCALE;

    console.log(JSON.stringify({ message: "export workflow started", taskId }));

    try {
      // 步骤1：获取文章列表
      const posts = await step.do("fetch posts", async () => {
        const db = getDb(this.env);
        return await PostRepo.findFullPosts(db, {
          ids: postIds && postIds.length > 0 ? postIds : undefined,
          status: status ?? undefined,
        });
      });

      console.log(JSON.stringify({ message: "posts fetched", taskId, count: posts.length }));

      if (posts.length === 0) {
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

      // 步骤2：获取客邸作者
      const guestAuthors = await step.do("fetch guest authors", async () => {
        const db = getDb(this.env);
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

      // 步骤3：分批处理文章，每批直接上传到 R2 临时目录
      const allWarnings: string[] = [];
      let fileCount = 0;

      for (let batchStart = 0; batchStart < posts.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, posts.length);
        const batchPosts = posts.slice(batchStart, batchEnd);

        const batchResult = await step.do(
          `process batch ${batchStart}-${batchEnd}`,
          async () => {
            const warnings: string[] = [];
            let batchFileCount = 0;

            const queue = [...batchPosts];
            const worker = async () => {
              while (queue.length > 0) {
                const post = queue.shift()!;
                try {
                  const res = await processPost(post, this.env, locale);
                  // 将生成的文件直接写入 R2 临时目录
                  for (const [filePath, data] of Object.entries(res.zipFiles)) {
                    const tempKey = `${tempPrefix(taskId)}/${filePath}`;
                    // 支持 Uint8Array 和 string
                    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;
                    await this.env.R2.put(tempKey, body, {
                      httpMetadata: { contentType: filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream' },
                    });
                    batchFileCount++;
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

            const workers = Array.from({ length: Math.min(CONCURRENCY, batchPosts.length) }, () => worker());
            await Promise.all(workers);

            return { warnings, batchFileCount };
          },
        );

        allWarnings.push(...batchResult.warnings);
        fileCount += batchResult.batchFileCount;

        await this.updateProgress(progressKey, {
          status: "processing",
          total: posts.length,
          completed: batchEnd,
          current: posts[batchEnd - 1]?.title ?? "",
          errors: [],
          warnings: allWarnings,
        });
      }

      // 步骤4：生成 ZIP 并上传到最终位置，同时清理临时文件
      await step.do("build and upload zip", async () => {
        // 收集临时文件列表
        const tempPrefixKey = tempPrefix(taskId);
        const allTempFiles = await this.env.R2.list({ prefix: tempPrefixKey });
        const files: Record<string, Uint8Array | string> = {};

        // 下载所有临时文件（如果文件太多或太大，仍可能触及内存限制，但这是为了兼容现有 buildZip）
        for (const obj of allTempFiles.objects) {
          const body = await this.env.R2.get(obj.key);
          if (body) {
            const arrayBuffer = await body.arrayBuffer();
            const relativePath = obj.key.slice(tempPrefixKey.length + 1); // 去掉前缀及斜杠
            // 对于 JSON 文件，尝试转为字符串以便 buildZip 识别（但 buildZip 可能期望 Uint8Array）
            files[relativePath] = new Uint8Array(arrayBuffer);
          }
        }

        // 添加其他 JSON 文件
        const uniqueTagsMap = new Map<string, (typeof posts)[0]["tags"][0]>();
        for (const post of posts) {
          for (const tag of post.tags ?? []) {
            uniqueTagsMap.set(tag.name, tag);
          }
        }
        files["tags.json"] = JSON.stringify(
          Array.from(uniqueTagsMap.values()).map((t) => ({
            name: t.name,
            createdAt: t.createdAt?.toISOString() ?? new Date().toISOString(),
          })),
          null,
          2,
        );

        files["guest_authors.json"] = JSON.stringify(guestAuthors, null, 2);

        const manifest: ExportManifest = {
          version: EXPORT_MANIFEST_VERSION,
          exportedAt: new Date().toISOString(),
          postCount: posts.length,
          generator: "blog-cms",
        };
        files["manifest.json"] = JSON.stringify(manifest, null, 2);

        const zipData = buildZip(files);
        const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);

        await this.env.R2.put(r2Key, zipData, {
          httpMetadata: { contentType: "application/zip" },
          customMetadata: { taskId },
        });

        // 清理临时文件
        await this.deleteAllTempFiles(tempPrefixKey);

        await this.updateProgress(progressKey, {
          status: "completed",
          total: posts.length,
          completed: posts.length,
          current: "",
          errors: [],
          warnings: allWarnings,
          downloadKey: r2Key,
        });
      });

      console.log(JSON.stringify({ message: "export workflow completed", taskId, postCount: posts.length }));

      // 24小时后清理最终的 ZIP
      const cleanupTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await step.sleepUntil("cleanup delay", cleanupTime);
      await step.do("cleanup export zip", async () => {
        const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);
        try {
          await this.env.R2.delete(r2Key);
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
        errors: [],
        warnings: [
          error instanceof Error
            ? error.message
            : m.import_export_common_unknown_error({}, { locale }),
        ],
      });
    }
  }

  private async updateProgress(key: string, progress: TaskProgress) {
    await CacheService.set({ env: this.env }, key, JSON.stringify(progress), { ttl: "24h" });
  }

  private async deleteAllTempFiles(prefix: string) {
    let cursor: string | undefined;
    do {
      const list = await this.env.R2.list({ prefix, cursor, limit: 100 });
      const keys = list.objects.map(o => o.key);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.env.R2.delete(key)));
      }
      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);
  }
}

// ---------- 辅助函数 ----------

async function processPost(
  post: Awaited<ReturnType<typeof PostRepo.findFullPosts>>[0],
  env: Env,
  locale: string,
): Promise<{ zipFiles: Record<string, Uint8Array | string>; warnings: string[] }> {
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
    zipFiles[`${prefix}/content.json`] = JSON.stringify(post.contentJson, null, 2);
  }

  // 下载图片
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
