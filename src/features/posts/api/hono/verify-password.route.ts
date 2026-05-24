import { Hono } from "hono";
import { verifyPassword } from "@/lib/crypto";
import { getServiceContext } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { findPostBySlugAdmin } from "@/features/posts/services/posts.service";

const app = new Hono<{ Bindings: Env }>();
app.use("*", baseMiddleware);

app.post("/", async (c) => {
  try {
    const { slug, password } = await c.req.json();
    if (!slug || !password) {
      return c.json({ success: false, error: "Missing fields" }, 400);
    }

    const ctx = getServiceContext(c);
    const post = await findPostBySlugAdmin(ctx, { slug });

    if (!post) {
      return c.json({ success: false, error: "Post not found" }, 404);
    }
    if (!post.isEncrypted || !post.passwordHash) {
      return c.json({ success: false, error: "Not encrypted or no hash" }, 400);
    }

    const isValid = await verifyPassword(password, post.passwordHash);
    if (!isValid) {
      return c.json({ success: false, error: "Wrong password" }, 401);
    }

    // 构建安全返回对象，确保日期字段是 Date 对象
    const { passwordHash, ...rest } = post;
    const safePost = {
      ...rest,
      publishedAt: rest.publishedAt ? new Date(rest.publishedAt) : null,
      createdAt: rest.createdAt ? new Date(rest.createdAt) : null,
      updatedAt: rest.updatedAt ? new Date(rest.updatedAt) : null,
      isEncrypted: false,
    };

    return c.json({ success: true, post: safePost });
  } catch (err: any) {
    console.error("Verify error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
