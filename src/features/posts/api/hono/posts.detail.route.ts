import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { FindPostBySlugInputSchema, PostWithTocSchema } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { getServiceContext } from "@/lib/hono/helper";
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

    let isAdmin = false;
    try {
      const headers = c.req.raw.headers;
      const auth = getAuth({ db: ctx.db, env: c.env });
      const session = await auth.api.getSession({ headers });
      if (session?.user?.role === "admin") isAdmin = true;
    } catch {}

    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      c.header("Cache-Control", "private");
      return c.json(safePost);
    }

    let token: string | null = null;
    const authHeader = c.req.raw.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
    if (!token) {
      const cookie = c.req.raw.headers.get("cookie") || "";
      const match = cookie.match(/post_auth=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      const payload = await verifyToken(c.env, token);
      if (payload && payload.slug === slug) {
        const { passwordHash, ...safePost } = post;
        safePost.isEncrypted = false;
        c.header("Cache-Control", "private, no-store");
        return c.json(safePost);
      }
    }

    const encrypted = {
      id: post.id, title: post.title, summary: post.summary ?? "",
      readTimeInMinutes: post.readTimeInMinutes, slug: post.slug,
      status: post.status, isEncrypted: true,
      publishedAt: post.publishedAt, pinnedAt: post.pinnedAt,
      createdAt: post.createdAt, updatedAt: post.updatedAt,
      contentJson: { type: "doc", content: [] },
      publicContentJson: null, toc: [], tags: post.tags ?? [],
    };
    const parsed = PostWithTocSchema.safeParse(encrypted);
    c.header("Cache-Control", "private, no-store");
    return c.json(parsed.success ? parsed.data : encrypted);
  }
);

export default route;