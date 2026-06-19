import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useViewCounts } from "@/features/pageview/queries";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { PostCard } from "../../components/post-card";
import { getLikeCountFn } from "@/features/likes/api/likes.public.api";

interface MergedPost {
  post: PostItem;
  pinned: boolean;
  popular: boolean;
}

export function HomePage({ posts, pinnedPosts, popularPosts }: HomePageProps) {
  const delayOffset = 50;

  const mergedPosts = useMemo(() => {
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
  }, [posts, pinnedPosts, popularPosts]);

  const allSlugs = useMemo(
    () => mergedPosts.map((m) => m.post.slug),
    [mergedPosts],
  );

  const { data: viewCounts, isPending: isPendingViewCounts } =
    useViewCounts(allSlugs);

  // 为每篇文章构建路径
  const paths = useMemo(
    () => allSlugs.map((slug) => `/post/${slug}`),
    [allSlugs],
  );

  // 并行获取每个路径的点赞数（与详情页同一函数）
  const likeQueries = useQueries({
    queries: paths.map((path) => ({
      queryKey: ["likeCount", path],
      queryFn: () => getLikeCountFn({ data: { path } }),
      staleTime: 60 * 1000,
    })),
  });

  // 安全地建立映射，不再依赖 query.queryKey
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
      <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
        {mergedPosts.map(({ post, pinned, popular }, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation"
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
        <div
          className="fuwari-onload-animation"
          style={{
            animationDelay: `calc(var(--fuwari-content-delay) + ${mergedPosts.length * delayOffset}ms)`,
          }}
        >
          <Link
            to="/posts"
            className="fuwari-btn-regular mx-6 rounded-lg h-10 px-6 mt-4 flex items-center justify-center mb-4 md:mb-0 md:mx-auto"
          >
            {m.home_view_all_posts()}
          </Link>
        </div>
      </div>
    </div>
  );
}
