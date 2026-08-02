import { Feed } from "feed";
import type { SiteConfig } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { convertToHtml } from "@/features/posts/utils/content";
import { getDb } from "@/lib/db";
import { PostsTable, GuestAuthorsTable } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env/server.env";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPublicFeedEmail(social: SiteConfig["social"]) {
  const emailUrl = social.find((link) => link.platform === "email")?.url.trim();
  if (!emailUrl) return undefined;

  const rawAddress = emailUrl
    .replace(/^mailto:/i, "")
    .split("?")[0]
    ?.trim();
  if (!rawAddress) return undefined;

  const address = decodeURIComponent(rawAddress);
  return EMAIL_PATTERN.test(address) ? address : undefined;
}

// ============================================================
// RSS 内容预处理
// ============================================================

/**
 * 将 TipTap JSON 转为适合 RSS 的 HTML：
 * 1. 图片路径 → 绝对路径
 * 2. 脚注 tooltip → 内联括号注释
 * 3. 表格添加基础属性
 */
function prepareRssContent(contentJson: any, domain: string): string {
  let html = convertToHtml(contentJson);

  // 图片相对路径 → 绝对路径
  html = html.replace(
    /<img([^>]*?)src="(\/[^"]*)"/g,
    `<img$1src="https://${domain}$2"`
  );

  // 脚注展开
  html = expandFootnotes(html);

  // 表格添加基础属性（RSS 阅读器忽略 CSS）
  html = html.replace(
    /<table>/g,
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%">'
  );

  return html;
}

/**
 * 将脚注 tooltip 展开为 RSS 可读的内联文本
 *
 * 原始：
 *   <sup class="fn-tip-wrap"><a href="#fn-1">[1]</a><span class="fn-tip">内容</span></sup>
 *
 * 转换后：
 *   <sup>[1]</sup><small>（内容）</small>
 *
 * 同时移除文末脚注列表区
 */
function expandFootnotes(html: string): string {
  const footnoteDefs = new Map<string, string>();
  const defRegex = /<li\s+id="fn-(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  // 1. 收集脚注定义
  while ((match = defRegex.exec(html)) !== null) {
    const num = match[1];
    const content = match[2].replace(/<[^>]*>/g, "").trim();
    footnoteDefs.set(num, content);
  }

  // 2. 替换内文脚注引用
  const refRegex =
    /<sup[^>]*class="[^"]*fn-tip-wrap[^"]*"[^>]*>([\s\S]*?)<\/sup>/gi;
  html = html.replace(refRegex, (full, inner) => {
    const numMatch = inner.match(/#fn-(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      const text = footnoteDefs.get(num);
      if (text) {
        return ` <sup>[${num}]</sup><small>（${text}）</small>`;
      }
    }
    return full;
  });

  // 3. 移除文末脚注列表
  html = html.replace(/<div\s+class="footnotes"[^>]*>[\s\S]*?<\/div>/gi, "");

  return html;
}

// ============================================================
// 主函数
// ============================================================

export async function buildFeed(env: Env, executionCtx: ExecutionContext) {
  const db = getDb(env);
  const siteConfig = await ConfigService.getSiteConfig({
    env,
    db,
    executionCtx,
  });

  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      contentJson: PostsTable.contentJson,
      slug: PostsTable.slug,
      publishedAt: PostsTable.publishedAt,
      updatedAt: PostsTable.updatedAt,
      isEncrypted: PostsTable.isEncrypted,
      isGuestPost: PostsTable.isGuestPost,
      guestAuthorName: GuestAuthorsTable.name,
      guestAuthorSlug: GuestAuthorsTable.slug,
    })
    .from(PostsTable)
    .leftJoin(
      GuestAuthorsTable,
      eq(PostsTable.guestAuthorId, GuestAuthorsTable.id)
    )
    .where(
      and(
        eq(PostsTable.status, "published"),
        lte(PostsTable.publishedAt, new Date()),
        sql`${PostsTable.isEncrypted} = 0`,
        ne(PostsTable.postType, "moment"),
        ne(PostsTable.slug, "guestbook"),
      )
    )
    .orderBy(desc(PostsTable.publishedAt))

  const { DOMAIN } = serverEnv(env);
  const year = new Date().getFullYear();

  const defaultAuthor = {
    name: siteConfig.author,
    email: getPublicFeedEmail(siteConfig.social),
    link: `https://${DOMAIN}/`,
  };

  const feed = new Feed({
    title: siteConfig.title,
    description: siteConfig.description,
    id: `https://${DOMAIN}/`,
    link: `https://${DOMAIN}/`,
    favicon: `https://${DOMAIN}/favicon.ico`,
    copyright: `All rights reserved ${year}, ${siteConfig.author}`,
    generator: siteConfig.title,
    author: defaultAuthor,
  });

  posts.forEach((post) => {
    if (post.isEncrypted) return;

    const itemAuthor =
      post.isGuestPost && post.guestAuthorName
        ? {
            name: post.guestAuthorName,
            link: `https://${DOMAIN}/_public/guest-house/author/${post.guestAuthorSlug || ""}`,
          }
        : defaultAuthor;

    feed.addItem({
      title: post.title,
      id: post.id.toString(),
      link: `https://${DOMAIN}/post/${encodeURIComponent(post.slug)}`,
      description: post.summary ?? "",
      content: prepareRssContent(post.contentJson, DOMAIN),
      author: [itemAuthor],
      date: post.publishedAt ?? post.updatedAt,
    });
  });

  return feed;
}