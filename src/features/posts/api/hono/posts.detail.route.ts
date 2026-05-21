import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { FindPostBySlugInputSchema } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { getServiceContext, setCacheHeaders } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { getAuth } from "@/lib/auth/auth.server";
import { verifyToken } from "@/lib/auth/token";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

const route = app.get(
  "/:slug",
  zValidator("param", FindPostBySlugInputSchema),
  async (c) => {
    const { slug } = c.req.valid("param");
    const ctx = getServiceContext(c);
    const post = await PostService.findPostBySlug(ctx, { slug });

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // 管理员检测
    let isAdmin = false;
    try {
      const headers = c.req.raw.headers;
      const auth = getAuth({ db: ctx.db, env: c.env });
      const session = await auth.api.getSession({ headers });
      if (session?.user?.role === "admin") {
        isAdmin = true;
      }
    } catch {}

    // 管理员或非加密 → 返回全文（移除 passwordHash）
    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      setCacheHeaders(c.res.headers, "private");
      return c.json(safePost);
    }

    // 检查 token
    let token: string | null = null;
    const cookieHeader = c.req.raw.headers.get("cookie") || "";
    const match = cookieHeader.match(/post_token=([^;]+)/);
    if (match) token = match[1];
    if (!token) {
      const authHeader = c.req.raw.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
    }

    if (token) {
      const payload = await verifyToken(c.env, token);
      if (payload && payload.slug === slug) {
        const { passwordHash, ...safePost } = post;
        safePost.isEncrypted = false;
        setCacheHeaders(c.res.headers, "private");
        return c.json(safePost);
      }
    }

    // 未授权：显式构建加密元数据（确保所有字段存在）
    const encryptedResponse = {
      id: post.id,
      title: post.title,
      summary: post.summary ?? "",
      readTimeInMinutes: post.readTimeInMinutes,
      slug: post.slug,                // ✅ 显式包含
      status: post.status,
      isEncrypted: true as boolean,
      publishedAt: post.publishedAt,
      pinnedAt: post.pinnedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      contentJson: { type: "doc", content: [] },
      publicContentJson: null,
      toc: [] as { id: string; text: string; level: number }[],
      tags: post.tags ?? [],
    };

    setCacheHeaders(c.res.headers, "public");
    return c.json(encryptedResponse);
  },
);

export default route;