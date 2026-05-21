import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
import {
  FindPostBySlugInputSchema,
  FindRelatedPostsInputSchema,
  GetPostsCursorInputSchema,
} from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { dbMiddleware, sessionMiddleware } from "@/lib/middlewares";
import { verifyToken } from "@/lib/auth/token";

export const getPostsCursorFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetPostsCursorInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.getPostsCursor(context, data);
  });

export const findPostBySlugFn = createServerFn()
  .middleware([dbMiddleware, sessionMiddleware])
  .inputValidator(FindPostBySlugInputSchema)
  .handler(async ({ data, context }) => {
    const { slug } = data;

    const isAdmin = context.session?.user?.role === "admin";

    const post = await PostService.findPostBySlug(context, { slug });
    if (!post) throw new Error("Post not found");

    console.log(`[findPostBySlugFn] slug: ${slug}, isAdmin: ${isAdmin}, isEncrypted: ${post.isEncrypted}`);

    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      return safePost;
    }

    // 检查 token
    const headers = getRequestHeaders();
    let token: string | null = null;
    const cookieHeader = headers["cookie"] || headers["Cookie"] || "";
    const match = cookieHeader.match(/post_token=([^;]+)/);
    if (match) token = match[1];
    if (!token) {
      const authHeader = headers["authorization"] || headers["Authorization"] || "";
      if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
    }

    if (token) {
      const payload = await verifyToken(context.env, token);
      if (payload && payload.slug === slug) {
        const { passwordHash, ...safePost } = post;
        safePost.isEncrypted = false;
        return safePost;
      }
    }

    // ✅ 显式构建加密元数据，确保 slug 绝不丢失
    const encryptedPost = {
      id: post.id,
      title: post.title,
      summary: post.summary ?? "",
      readTimeInMinutes: post.readTimeInMinutes,
      slug: post.slug,           // ← 强制包含
      status: post.status,
      isEncrypted: true,
      publishedAt: post.publishedAt,
      pinnedAt: post.pinnedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      contentJson: { type: "doc", content: [] },
      publicContentJson: null,
      toc: [] as { id: string; text: string; level: number }[],
      tags: post.tags ?? [],
    };

    console.log("[findPostBySlugFn] encryptedPost slug:", encryptedPost.slug);
    return encryptedPost;
  });

export const getRelatedPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(FindRelatedPostsInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.getRelatedPosts(context, data);
  });

export const getPinnedPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PostService.getPinnedPosts(context));

export const getPopularPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(
    z.object({ limit: z.number().int().min(1).max(20).optional() }),
  )
  .handler(({ data, context }) =>
    PageviewService.getPopularPosts(context, data.limit),
  );