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
export async function getSiteStats(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const [totalPv, contentList] = await Promise.all([
    getTotalPageviews(context.db),
    getPublishedContentList(context.db),
  ]);

  const totalChars = contentList.reduce((sum, content) => {
    return sum + countPlainTextChars(content);
  }, 0);

  return {
    totalPageviews: totalPv,
    articleCount: contentList.length,
    totalChars,
    startDate: siteConfig.startDate,   // 确保 blog.config.ts 中已定义
  };
}
