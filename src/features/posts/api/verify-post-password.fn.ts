import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyPassword } from "@/lib/crypto";
import { createPostAccessToken } from "@/lib/auth/token";
import { dbMiddleware } from "@/lib/middlewares";
import { findPostBySlugAdmin } from "@/features/posts/services/posts.service";

export const verifyPostPasswordFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(
    z.object({
      slug: z.string(),
      password: z.string().min(1),
    })
  )
  .handler(async ({ input, context }) => {
    const post = await findPostBySlugAdmin(context, { slug: input.slug });
    
    // 强制输出到终端，确保可见
    console.error("[VERIFY DEBUG]", {
      slug: input.slug,
      inputPassword: input.password,
      postExists: !!post,
      isEncrypted: post?.isEncrypted,
      hasPasswordHash: !!post?.passwordHash,
      passwordHash: post?.passwordHash ? (post.passwordHash.substring(0, 20) + "...") : "null",
    });

    if (!post || !post.isEncrypted || !post.passwordHash) {
      return { success: false, debug: { reason: "no_post_or_hash" } };
    }

    const valid = await verifyPassword(input.password, post.passwordHash);
    
    console.error("[VERIFY DEBUG] passwordMatch:", valid);

    if (!valid) {
      return { success: false, debug: { reason: "wrong_password", hashPreview: post.passwordHash.substring(0, 20) + "..." } };
    }

    const token = await createPostAccessToken(context.env, input.slug);
    return { success: true, token, debug: { reason: "ok" } };
  });