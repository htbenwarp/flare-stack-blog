// src/features/friend-links/api/random-read.api.ts
import { createServerFn } from "@tanstack/react-start";
import { dbMiddleware } from "@/lib/middlewares";
import { FriendLinksTable } from "@/lib/db/schema/friend-links.table";
import { eq } from "drizzle-orm";

function parseFeed(xml: string): Array<{ title: string; link: string }> {
  const items: Array<{ title: string; link: string }> = [];
  // RSS 2.0
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const content = match[1];
    const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "无标题";
    const link = content.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "";
    if (link) items.push({ title: cleanText(title), link: cleanText(link) });
  }
  // Atom (fallback)
  if (items.length === 0) {
    for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
      const content = match[1];
      const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "无标题";
      const linkMatch = content.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      const link = linkMatch?.[1] || "";
      if (link) items.push({ title: cleanText(title), link: cleanText(link) });
    }
  }
  return items;
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export const getRandomReadFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    // ✅ 全选所有已有字段，不引用不存在的列
    const allLinks = await context.db
      .select()
      .from(FriendLinksTable)
      .where(eq(FriendLinksTable.status, "approved")); // 只取已批准的友链

    // 手动构建列表，目前没有 RSS 字段，所以全部过滤掉
    // 如果将来加了 rss_url 字段，可以在这里读取
    const links = allLinks.map((link: any) => ({
      name: link.siteName || link.name,
      url: link.siteUrl || link.url,
      // 目前没有 rssUrl，预留兼容
      rssUrl: link.rssUrl || link.rss_url || null,
    }));

    const activeLinks = links.filter((l) => l.rssUrl);
    if (activeLinks.length === 0) {
      return { success: false, message: "暂无可用的 RSS 源，请先为友链添加 RSS 订阅地址" };
    }

    const pick = activeLinks[Math.floor(Math.random() * activeLinks.length)];

    try {
      const res = await fetch(pick.rssUrl!, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BlogBot/1.0)" },
        cf: { cacheTtl: 3600 },
      });
      if (!res.ok) {
        return { success: false, message: `无法获取 ${pick.name} 的 RSS` };
      }
      const items = parseFeed(await res.text());
      if (items.length === 0) {
        return { success: false, message: `${pick.name} 暂无文章` };
      }
      const article = items[Math.floor(Math.random() * items.length)];
      return {
        success: true,
        article: {
          title: article.title,
          link: article.link,
          source: pick.name,
          sourceUrl: pick.url,
        },
      };
    } catch {
      return { success: false, message: `获取 ${pick.name} 的文章失败` };
    }
  });