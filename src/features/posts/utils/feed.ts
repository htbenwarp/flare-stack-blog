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

function prepareRssContent(contentJson: any, domain: string): string {
  let html = convertToHtml(contentJson);

  html = html.replace(
    /<img([^>]*?)src="(\/+[^"]*)"/g,
    (_, attrs, src) => {
      const resolved = src.startsWith("//") ? `https:${src}` : `https://${domain}${src}`;
      return `<img${attrs}src="${resolved}"`;
    }
  );

  html = expandFootnotes(html);

  html = html.replace(
    /<table[^>]*>/gi,
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%">'
  );
  html = html.replace(
    /<th[^>]*>/gi,
    '<th style="padding:6px; border:1px solid #ccc; background:#f5f5f5; font-weight:bold">'
  );
  html = html.replace(
    /<td[^>]*>/gi,
    '<td style="padding:6px; border:1px solid #ccc">'
  );

  html = html.replace(/<colgroup>[\s\S]*?<\/colgroup>/gi, "");

  return html;
}


function expandFootnotes(html: string): string {
  html = html.replace(
    /<span class="fn-tip-wrap">([^<]*)<span class="fn-tip">([\s\S]*?)<\/span><\/span>/gi,
    (_, text, note) => {
      return `<sup>${text}</sup><small>（${note}）</small>`;
    }
  );
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