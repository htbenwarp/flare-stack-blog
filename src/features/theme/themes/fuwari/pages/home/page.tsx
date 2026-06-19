import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useViewCounts } from "@/features/pageview/queries";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { PostCard } from "../../components/post-card";
import { useQuery } from "@tanstack/react-query";
import { getLikeCountsByPathsFn } from "@/features/likes/api/likes.public.api";

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

  // 批量获取点赞数
  const paths = useMemo(
    () => allSlugs.map((slug) => `/post/${slug}`),
    [allSlugs],
  );
  const { data: likeCounts, isPending: isPendingLikeCounts } = useQuery({
    queryKey: ["likeCounts", paths],
    queryFn: () => getLikeCountsByPathsFn({ data: { paths } }),
    staleTime: 60 * 1000, // 1分钟内不重复请求
  });

  const likeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (likeCounts) {
      for (const item of likeCounts) {
        // 路径是 /post/slug，需要提取 slug 作为 key 或直接使用 path
        map[item.path] = item.count;
      }
    }
    return map;
  }, [likeCounts]);

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