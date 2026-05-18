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

// ---------------------------------------------------------------
// 工具：从 TipTap JSON 中递归提取纯文本
// ---------------------------------------------------------------
function extractText(json: any): string {
  if (typeof json === "string") return json;
  if (!json || typeof json !== "object") return "";
  if (json.text) return json.text;
  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractText).join("");
  }
  return "";
}

// ---------------------------------------------------------------
// 热门文章
// ---------------------------------------------------------------
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

      // 保持热门度顺序
      const bySlug = new Map(posts.map((p) => [p.slug, p]));
      return slugs.flatMap((slug) => {
        const post = bySlug.get(slug);
        return post ? [post] : [];
      });
    },
    { ttl: "3h" },
  );
}

// ---------------------------------------------------------------
// 批量获取文章浏览量
// ---------------------------------------------------------------
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
// 站点统计信息（全站 PV、文章数、纯文本总字数）
// ---------------------------------------------------------------
export async function getSiteStats(context: DbContext) {
  const [totalPv, contentList] = await Promise.all([
    getTotalPageviews(context.db),
    getPublishedContentList(context.db),
  ]);

  const totalChars = contentList.reduce((sum, doc) => {
    return sum + extractText(doc).length;
  }, 0);

  return {
    totalPageviews: totalPv,
    articleCount: contentList.length,
    totalChars,
    startDate: blogConfig.startDate,
  };
}
