import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
import {
  FindPostBySlugInputSchema,
  FindRelatedPostsInputSchema,
  GetPostsCursorInputSchema,
} from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { dbMiddleware, sessionMiddleware } from "@/lib/middlewares";
import * as PostRepo from "@/features/posts/data/posts.data";
import { eq, and } from "drizzle-orm";
import { PostsTable } from "@/lib/db/schema";

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

    const isAdmin =
      context.session?.user?.role === "admin" ||
      context.session?.user?.role === "manager";

    // 管理员：直接从数据层获取原始文章，完全避免服务层的加密占位逻辑
    const rawPost = isAdmin
      ? await PostRepo.findPostBySlug(context.db, slug, {
          publicOnly: true,
          excludeGuestPosts: false,
        })
      : null;

    // 普通用户或管理员未获取到数据时，走服务层（安全兜底）
    const post = rawPost || await PostService.findPostBySlug(context, { slug });
    if (!post) throw new Error("Post not found");

    // 管理员或非加密文章 → 返回完整内容
    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      return safePost;
    }

    // 加密占位（仅普通用户会走到这里）
    return {
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
      contentJson: { type: "doc", content: [] },
      publicContentJson: null,
      toc: [] as { id: string; text: string; level: number }[],
      tags: post.tags ?? [],
      guestAuthor: post.guestAuthor ?? null,
      guestAuthorSlug: post.guestAuthor?.slug ?? null,
      isGuestPost: post.isGuestPost ?? false,
      guestAuthorId: post.guestAuthorId ?? null,
    };
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

export const getAdjacentPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    return await PostService.getAdjacentPosts(context, data.slug);
  });

export const getAdjacentGuestPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    return await PostService.getAdjacentGuestPosts(context, data.slug);
  });

export const getPostGuestAuthorSlugFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    return await PostRepo.getPostGuestAuthorSlug(context.db, data.slug);
  });

export const getPublicPostBySlugFn = createServerFn()
  .middleware([dbMiddleware]) // 无需 sessionMiddleware
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    const post = await PostRepo.findPostBySlug(context.db, data.slug, {
      publicOnly: true,
      excludeGuestPosts: false,
    });
    if (!post) return null;

    // 加密文章返回占位信息，防止正文泄露
    if (post.isEncrypted) {
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        contentJson: { type: "doc", content: [] },
        isEncrypted: true,
        // 补充必要字段，防止前端崩溃
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        tags: post.tags ?? [],
        guestAuthor: post.guestAuthor ?? null,
        guestAuthorSlug: post.guestAuthor?.slug ?? null,
        isGuestPost: post.isGuestPost ?? false,
        guestAuthorId: post.guestAuthorId ?? null,
      };
    }

    // 非加密文章返回完整内容（移除 passwordHash）
    const { passwordHash, ...safePost } = post;
    return safePost;
  });


export const getGuestbookPostFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    // 直接查询，不使用 publicOnly，避免被 ne(slug, 'guestbook') 排除
    const post = await context.db.query.PostsTable.findFirst({
      where: and(
        eq(PostsTable.slug, "guestbook"),
        eq(PostsTable.status, "published"),
      ),
    });

    if (!post) return null;
    return {
      id: post.id,
      title: post.title,
      contentJson: post.contentJson,
    };
  });