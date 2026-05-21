import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { FindPostBySlugInputSchema, PostWithTocSchema } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { getServiceContext } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { getAuth } from "@/lib/auth/auth.server";

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

    // 检查管理员
    let isAdmin = false;
    try {
      const headers = c.req.raw.headers;
      const auth = getAuth({ db: ctx.db, env: c.env });
      const session = await auth.api.getSession({ headers });
      if (session?.user?.role === "admin") isAdmin = true;
    } catch {}

    // 管理员或非加密文章 → 返回完整内容
    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      return c.json(safePost);
    }

    // 加密文章 → 返回基础信息（不包含内容），前端会显示密码框
    const basicInfo = {
      id: post.id,
      title: post.title,
      summary: post.summary ?? "",
      readTimeInMinutes: post.readTimeInMinutes,
      slug: post.slug,
      status: post.status,
      isEncrypted: true,
      publishedAt: post.publishedAt,
      pinnedAt: post.pinnedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      contentJson: { type: "doc", content: [] },  // 空内容
      publicContentJson: null,
      toc: [],
      tags: post.tags ?? [],
    };
    const parsed = PostWithTocSchema.safeParse(basicInfo);
    return c.json(parsed.success ? parsed.data : basicInfo);
  }
);

export default route;