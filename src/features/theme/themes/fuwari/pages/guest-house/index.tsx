import { Link, useSearch } from "@tanstack/react-router";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import theme from "@theme";
import {
  guestAuthorsQueryOptions,
  guestPostsInfiniteQueryOptions,
} from "@/features/guest-authors/queries/public";
import { m } from "@/paraglide/messages";
import { FileText } from "lucide-react";
import { useEffect, useRef } from "react";

export function GuestHousePage() {
  const search = useSearch({ from: "/_public/guest-house/" }) as {
    tagName?: string;
  };

  const { data: authors = [], isLoading: authorsLoading } = useQuery(
    guestAuthorsQueryOptions()
  );
  const totalPosts = authors.reduce((sum, a) => sum + a.postCount, 0);

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    guestPostsInfiniteQueryOptions({ tagName: search.tagName, limit: 12 })
  );

  const allPosts = postsData?.pages.flatMap((page) => page.items) ?? [];
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 选中标签时，使用卡片包裹返回链接与文章列表
  if (search.tagName) {
    return (
      <div className="fuwari-card-base p-4">
        <Link
          to="/guest-house"
          className="text-sm fuwari-text-50 hover:text-(--fuwari-primary) inline-flex items-center gap-1 mb-4"
        >
          ← {m.guest_house_breadcrumb()}
        </Link>

        <theme.PostsPage
          posts={allPosts}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />

        <div ref={sentinelRef} className="h-4" />
      </div>
    );
  }

  // 默认作者网格
  return (
    <div className="flex flex-col gap-4">
      <div className="fuwari-card-base p-6 fuwari-onload-animation">
        <h1 className="text-2xl font-bold mb-2 fuwari-text-90">
          {m.guest_house_breadcrumb?.() ?? "客邸"}
        </h1>
        <p className="text-sm fuwari-text-50 mb-4">
          {m.guest_house_intro?.() ?? "收藏好友的字句"}
        </p>
        <div className="text-sm fuwari-text-50">
          {m.guest_house_total({
            authorCount: authors.length.toString(),
            postCount: totalPosts.toString(),
          })}
        </div>
      </div>

      {authorsLoading ? (
        <div className="text-center py-8 fuwari-text-50">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authors.map((author, idx) => (
            <Link
              key={author.id}
              to="/guest-house/author/$slug"
              params={{ slug: author.slug }}
              className="fuwari-card-base p-5 flex items-center gap-4 hover:shadow-lg transition-shadow hover:bg-(--fuwari-primary)/5 fuwari-onload-animation"
              style={{ animationDelay: `${100 + idx * 50}ms` }}
            >
              <img
                src={
                  author.avatar ||
                  "data:image/svg+xml,..." // 省略长字符串，保持原样
                }
                alt={author.name}
                className="w-14 h-14 rounded-full object-cover border border-(--fuwari-primary)/20"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold fuwari-text-90 truncate">
                  {author.name}
                </h2>
                {author.bio && (
                  <p className="text-sm fuwari-text-50 mt-1 truncate">
                    {author.bio}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm fuwari-text-50">
                <FileText size={14} />
                <span>{author.postCount}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}