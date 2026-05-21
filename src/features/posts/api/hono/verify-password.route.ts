import { Hono } from "hono";
import { verifyPassword } from "@/lib/crypto";
import { createPostAccessToken } from "@/lib/auth/token";
import { getServiceContext } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { findPostBySlugAdmin } from "@/features/posts/services/posts.service";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

app.post("/", async (c) => {
  const { slug, password } = await c.req.json();

  if (!slug || !password) {
    return c.json({ success: false, reason: "missing fields" }, 400);
  }

  const ctx = getServiceContext(c);
  const post = await findPostBySlugAdmin(ctx, { slug });

  if (!post || !post.isEncrypted || !post.passwordHash) {
    return c.json({ success: false, reason: "invalid post" });
  }

  const valid = await verifyPassword(password, post.passwordHash);
  if (!valid) {
    return c.json({ success: false, reason: "wrong password" });
  }

  const token = await createPostAccessToken(c.env, slug);
  return c.json({ success: true, token });
});

export default app;