import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useViewCounts } from "@/features/pageview/queries";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { Pagination } from "../../components/pagination";
import { PostCard } from "../../components/post-card";
import { getLikeCountFn } from "@/features/likes/api/likes.public.api";

interface MergedPost {
  post: PostItem;
  pinned: boolean;
  popular: boolean;
}

export function HomePage({
  posts,
  pinnedPosts,
  popularPosts,
  page,
  pageSize,
  total,
  hasPrevPage,
  hasNextPage,
  onPageChange,
}: HomePageProps) {
  const delayOffset = 50;

  const mergedPosts = useMemo(() => {
    if (page !== 1) {
      return posts.map((p) => ({ post: p, pinned: false, popular: false }));
    }

    const seen = new Set<string>();
    const result: MergedPost[] = [];
    const popularSlugs = new Set((popularPosts ?? []).map((p) => p.slug));

    for (const post of pinnedPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: true, popular: popularSlugs.has(post.slug) });
    }

    for (const post of popularPosts ?? []) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false, popular: true });
    }

    for (const post of posts) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      result.push({ post, pinned: false, popular: false });
    }

    return result;
  }, [posts, pinnedPosts, popularPosts, page]);

  const allSlugs = useMemo(
    () => mergedPosts.map((m) => m.post.slug),
    [mergedPosts],
  );

  const { data: viewCounts, isPending: isPendingViewCounts } =
    useViewCounts(allSlugs);

  const paths = useMemo(
    () => allSlugs.map((slug) => `/post/${slug}`),
    [allSlugs],
  );

  const likeQueries = useQueries({
    queries: paths.map((path) => ({
      queryKey: ["likeCount", path],
      queryFn: () => getLikeCountFn({ data: { path } }),
      staleTime: 60 * 1000,
    })),
  });

  const likeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    likeQueries.forEach((query, index) => {
      if (query.data) {
        const path = paths[index];
        if (path) {
          map[path] = query.data.count;
        }
      }
    });
    return map;
  }, [likeQueries, paths]);

  const isPendingLikeCounts = likeQueries.some((q) => q.isPending);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:gap-4 bg-transparent">
        {mergedPosts.map(({ post, pinned, popular }, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation md:mb-0 mb-4"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * delayOffset}ms)`,
            }}
          >
            <PostCard
              post={post}
              pinned={pinned}
              popular={!pinned && popular}
              views={viewCounts?.[post.slug]}
              isLoadingViews={isPendingViewCounts}
              likeCount={likeCountMap[`/post/${post.slug}`] ?? 0}
              isLoadingLikeCount={isPendingLikeCounts}
            />
            <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 last:border-t-0 md:hidden" />
          </div>
        ))}
      </div>

      <div className="fuwari-card-base fuwari-onload-animation px-5 py-4 md:px-6 md:py-5">
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}