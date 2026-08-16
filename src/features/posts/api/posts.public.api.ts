import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
import {
  FindPostBySlugInputSchema,
  FindRelatedPostsInputSchema,
  GetPostsCursorInputSchema,
  GetPublicPostsPageInputSchema,
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

    const rawPost = isAdmin
      ? await PostRepo.findPostBySlug(context.db, slug, {
          publicOnly: true,
          excludeGuestPosts: false,
        })
      : null;

    const post = rawPost || await PostService.findPostBySlug(context, { slug });
    if (!post) throw new Error("Post not found");

    if (isAdmin || !post.isEncrypted) {
      const { passwordHash, ...safePost } = post;
      return safePost;
    }

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
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    const post = await PostRepo.findPostBySlug(context.db, data.slug, {
      publicOnly: true,
      excludeGuestPosts: false,
    });
    if (!post) return null;

    if (post.isEncrypted) {
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        contentJson: { type: "doc", content: [] },
        isEncrypted: true,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        tags: post.tags ?? [],
        guestAuthor: post.guestAuthor ?? null,
        guestAuthorSlug: post.guestAuthor?.slug ?? null,
        isGuestPost: post.isGuestPost ?? false,
        guestAuthorId: post.guestAuthorId ?? null,
      };
    }

    const { passwordHash, ...safePost } = post;
    return safePost;
  });


export const getGuestbookPostFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
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

export const getPublicPostsPageFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetPublicPostsPageInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.getPublicPostsPage(context, data);
  });