import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import * as CacheService from "@/features/cache/cache.service";
import type {
  ImportReport,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import { IMPORT_EXPORT_CACHE_KEYS } from "@/features/import-export/import-export.schema";
import { parseZip } from "@/features/import-export/utils/zip";
import {
  enumerateMarkdownPosts,
  enumerateNativePosts,
  importSinglePost,
} from "@/features/import-export/workflows/import-helpers";
import { serverEnv } from "@/lib/env/server.env";
import { m } from "@/paraglide/messages";
import { getDb } from "@/lib/db";
import { GuestAuthorsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class ImportWorkflow extends WorkflowEntrypoint<
  Env,
  ImportWorkflowParams
> {
  async run(event: WorkflowEvent<ImportWorkflowParams>, step: WorkflowStep) {
    const { taskId, r2Key, mode, locale: requestedLocale } = event.payload;
    const progressKey = IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId);
    const locale = requestedLocale ?? serverEnv(this.env).LOCALE;

    console.log(
      JSON.stringify({ message: "import workflow started", taskId, mode }),
    );

    try {
      // 0. 提前获取 zip 文件列表（后续步骤会多次用到）
      const zipFiles = await step.do("read zip", () =>
        this.fetchZipFiles(r2Key, locale),
      );

      // 1. 导入客邸作者（如果存在 guest_authors.json）
      const authorSlugToId = await step.do("import guest authors", async () => {
        const db = getDb(this.env);
        const authorJson = zipFiles["guest_authors.json"];
        if (!authorJson) return {};

        const authors: Array<{
          name: string;
          slug: string;
          bio?: string;
          avatar?: string;
        }> = JSON.parse(new TextDecoder().decode(authorJson));

        const slugToId: Record<string, number> = {};

        for (const author of authors) {
          try {
            // 尝试查找已有作者，存在则更新，否则创建
            const existing = await db.query.GuestAuthorsTable.findFirst({
              where: eq(GuestAuthorsTable.slug, author.slug),
            });
            if (existing) {
              await db
                .update(GuestAuthorsTable)
                .set({
                  name: author.name,
                  bio: author.bio ?? null,
                  avatar: author.avatar ?? null,
                })
                .where(eq(GuestAuthorsTable.slug, author.slug));
              slugToId[author.slug] = existing.id;
            } else {
              const [created] = await db
                .insert(GuestAuthorsTable)
                .values({
                  name: author.name,
                  slug: author.slug,
                  bio: author.bio ?? null,
                  avatar: author.avatar ?? null,
                })
                .returning({ id: GuestAuthorsTable.id });
              slugToId[author.slug] = created.id;
            }
          } catch (error) {
            console.error(
              `Failed to import author ${author.slug}: ${error}`,
            );
            // 单个作者失败不影响整体
          }
        }

        return slugToId;
      });

      // 2. 枚举文章
      const postEntries = await step.do("enumerate posts", async () => {
        if (mode === "native") {
          return enumerateNativePosts(zipFiles);
        }
        return enumerateMarkdownPosts(zipFiles);
      });

      console.log(
        JSON.stringify({
          message: "posts enumerated",
          taskId,
          count: postEntries.length,
        }),
      );

      if (postEntries.length === 0) {
        await this.updateProgress(progressKey, {
          status: "completed",
          total: 0,
          completed: 0,
          current: "",
          errors: [],
          warnings: [m.import_export_import_warning_empty({}, { locale })],
          report: { succeeded: [], failed: [], warnings: [] },
        });
        return;
      }

      // 3. 逐篇导入文章，传递作者映射
      const report: ImportReport = {
        succeeded: [],
        failed: [],
        warnings: [],
      };

      for (let i = 0; i < postEntries.length; i++) {
        const entry = postEntries[i];

        const delta = await step.do(
          `import post ${i + 1}/${postEntries.length}: ${entry.title || entry.dir}`,
          async () => {
            const stepReport: ImportReport = {
              succeeded: [],
              failed: [],
              warnings: [],
            };

            try {
              // 每次重新读取 zip（因为 step.do 不支持直接传递二进制）
              const zipFiles = await this.fetchZipFiles(r2Key, locale);
              const result = await importSinglePost(
                this.env,
                zipFiles,
                entry,
                mode,
                locale,
                authorSlugToId, // ✅ 传递作者映射
              );
              if (result.skipped) {
                stepReport.warnings.push(
                  m.import_export_import_warning_slug_skipped(
                    { title: result.title },
                    { locale },
                  ),
                );
              } else {
                stepReport.succeeded.push({
                  title: result.title,
                  slug: result.slug,
                });
              }
              for (const w of result.warnings) {
                stepReport.warnings.push(
                  m.import_export_import_warning_scoped(
                    { title: result.title, warning: w },
                    { locale },
                  ),
                );
              }
            } catch (error) {
              const reason =
                error instanceof Error ? error.message : String(error);
              stepReport.failed.push({
                title: entry.title || entry.dir,
                reason,
              });
            }

            return stepReport;
          },
        );

        report.succeeded.push(...delta.succeeded);
        report.failed.push(...delta.failed);
        report.warnings.push(...delta.warnings);

        console.log(
          JSON.stringify({
            message: "post import step completed",
            taskId,
            step: i + 1,
            total: postEntries.length,
            title: entry.title || entry.dir,
            succeeded: delta.succeeded.length,
            failed: delta.failed.length,
          }),
        );

        await this.updateProgress(progressKey, {
          status: "processing",
          total: postEntries.length,
          completed: i + 1,
          current: entry.title || entry.dir,
          errors: report.failed.map((f) => ({
            post: f.title,
            reason: f.reason,
          })),
          warnings: report.warnings,
        });
      }

      // 4. 清理并完成
      await step.do("finalize", async () => {
        try {
          await this.env.R2.delete(r2Key);
        } catch {
          // Ignore cleanup errors
        }

        await this.updateProgress(progressKey, {
          status: "completed",
          total: postEntries.length,
          completed: postEntries.length,
          current: "",
          errors: report.failed.map((f) => ({
            post: f.title,
            reason: f.reason,
          })),
          warnings: report.warnings,
          report,
        });
      });

      console.log(
        JSON.stringify({
          message: "import workflow completed",
          taskId,
          succeeded: report.succeeded.length,
          failed: report.failed.length,
          warnings: report.warnings.length,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "import workflow failed",
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

  private async fetchZipFiles(
    r2Key: string,
    locale: "zh" | "en",
  ): Promise<Record<string, Uint8Array>> {
    const r2Object = await this.env.R2.get(r2Key);
    if (!r2Object) {
      throw new Error(m.import_export_import_error_zip_missing({}, { locale }));
    }
    const arrayBuffer = await r2Object.arrayBuffer();
    return parseZip(new Uint8Array(arrayBuffer));
  }

  private async updateProgress(key: string, progress: TaskProgress) {
    const context: BaseContext = { env: this.env };
    await CacheService.set(context, key, JSON.stringify(progress), {
      ttl: "24h",
    });
  }
}