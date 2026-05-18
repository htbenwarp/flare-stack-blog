import * as CacheService from "@/features/cache/cache.service";
import * as PageviewRepo from "@/features/pageview/data/pageview.data";
import {
  PAGEVIEW_CACHE_KEYS,
  ViewCountsSchema,
} from "@/features/pageview/pageview.schema";
import * as PostRepo from "@/features/posts/data/posts.data";
import { PostItemSchema } from "@/features/posts/schema/posts.schema";
import { blogConfig } from "@/blog.config";
import { getTotalPageviews, getPublishedContentList } from "../data/pageview.data";

export async function getPopularPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  limit = 5,
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const version = await CacheService.getVersion(context, "posts:list");
  return CacheService.get(
    context,
    [version, ...PAGEVIEW_CACHE_KEYS.popular, limit],
    PostItemSchema.array(),
    async () => {
      const topPages = await PageviewRepo.getTopPages(
        context.db,
        thirtyDaysAgo,
        now,
        limit,
      );
      if (topPages.length === 0) return [];

      const slugs = topPages.map((p) => p.slug);
      const posts = await PostRepo.findPostsBySlugs(context.db, slugs);

      // Preserve popularity order
      const bySlug = new Map(posts.map((p) => [p.slug, p]));
      return slugs.flatMap((slug) => {
        const post = bySlug.get(slug);
        return post ? [post] : [];
      });
    },
    { ttl: "3h" },
  );
}

export async function getViewCounts(
  context: DbContext & { executionCtx: ExecutionContext },
  slugs: string[],
) {
  if (slugs.length === 0) return {};

  return CacheService.get(
    context,
    PAGEVIEW_CACHE_KEYS.viewCounts(slugs),
    ViewCountsSchema,
    () => PageviewRepo.getViewCountsBySlugs(context.db, slugs),
    { ttl: "5m" },
  );
}

// ---------------------------------------------------------------
// 工具：从 TipTap JSON 中提取纯文本并计算字数
// ---------------------------------------------------------------
function extractTextFromTipTap(json: any): string {
  if (typeof json === "string") return json;
  if (!json || typeof json !== "object") return "";
  if (json.text) return json.text;
  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractTextFromTipTap).join("");
  }
  return "";
}

function countPlainTextChars(jsonString: string): number {
  try {
    const doc = JSON.parse(jsonString);
    return extractTextFromTipTap(doc).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------
// 公开：获取站点统计信息（全站 PV、文章数、纯文本总字数）
// ---------------------------------------------------------------
export async function getSiteStats(context: DbContext) {
  let totalPv = 0;
  let contentList: string[] = [];
  let debugError = "";

  // 第一步：全站 PV
  try {
    totalPv = await getTotalPageviews(context.db);
  } catch (e: any) {
    debugError += `[PV] ${e.message ?? String(e)} `;
    console.error("getSiteStats getTotalPageviews error:", e);
  }

  // 第二步：文章内容 JSON 列表
  try {
    contentList = await getPublishedContentList(context.db);
  } catch (e: any) {
    debugError += `[Content] ${e.message ?? String(e)} `;
    console.error("getSiteStats getPublishedContentList error:", e);
  }

  // 第三步：纯文本字数统计
  let totalChars = 0;
  try {
    totalChars = contentList.reduce((sum, content) => {
      return sum + countPlainTextChars(content);
    }, 0);
  } catch (e: any) {
    debugError += `[Count] ${e.message ?? String(e)} `;
    console.error("getSiteStats countPlainTextChars error:", e);
  }

  return {
    totalPageviews: totalPv,
    articleCount: contentList.length,
    totalChars,
    startDate: blogConfig.startDate,
    debugError: debugError || undefined, // 有错误时暴露给前端
  };
}
