import { Hono } from "hono";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PostsTable } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/crypto";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  try {
    const { slug, password } = await c.req.json();
    if (!slug || !password) {
      return c.json({ success: false, error: "Missing fields" }, 400);
    }

    const db = getDb(c.env);
    const posts = await db
      .select()
      .from(PostsTable)
      .where(eq(PostsTable.slug, slug))
      .limit(1);
    const post = posts[0];

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }
    // 注意：数据库中 is_encrypted 是整数 0/1，需要转换为布尔值
    const isEncrypted = !!post.isEncrypted;
    if (!isEncrypted || !post.passwordHash) {
      return c.json({ success: false, error: "Not encrypted or no hash" }, 400);
    }

    const isValid = await verifyPassword(password, post.passwordHash);
    if (!isValid) {
      return c.json({ success: false, error: "Wrong password" }, 401);
    }

    // 手动构建返回的文章对象，确保结构与前端期望一致
    // 特别注意：contentJson 需要解析为对象（数据库中可能是 JSON 字符串）
    let contentJsonObj = post.contentJson;
    if (typeof contentJsonObj === "string") {
      try {
        contentJsonObj = JSON.parse(contentJsonObj);
      } catch (e) {
        contentJsonObj = { type: "doc", content: [] };
      }
    }
    if (!contentJsonObj || typeof contentJsonObj !== "object") {
      contentJsonObj = { type: "doc", content: [] };
    }

    const safePost = {
      id: post.id,
      title: post.title,
      summary: post.summary,
      readTimeInMinutes: post.readTimeInMinutes,
      slug: post.slug,
      status: post.status,
      isEncrypted: false,         // 关键：强制设为 false，让前端跳过密码框
      publishedAt: post.publishedAt,
      pinnedAt: post.pinnedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      contentJson: contentJsonObj,
      publicContentJson: post.publicContentJson,
      toc: [],                    // 如果需要目录，可以从 post.toc 获取
      tags: post.tags ?? [],
    };

    return c.json({ success: true, post: safePost });
  } catch (err: any) {
    console.error("Verify error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;