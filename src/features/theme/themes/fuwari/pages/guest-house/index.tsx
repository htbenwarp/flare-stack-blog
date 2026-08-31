import { Link, useSearch } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import theme from "@theme";
import {
  guestAuthorsQueryOptions,
  guestPostsInfiniteQueryOptions,
} from "@/features/guest-authors/queries/public";
import { m } from "@/paraglide/messages";
import { FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import { GuestHousePageSkeleton } from "./skeleton";
import { PageHeader } from "@/features/theme/themes/fuwari/components/page-header";

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
    isLoading: postsLoading,
  } = useInfiniteQuery(
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

  // 手动加载态：显示骨架屏
  if (authorsLoading || postsLoading) {
    return <GuestHousePageSkeleton />;
  }

  // 选中标签时，显示文章列表（归档样式）
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
      <PageHeader
        title={m.guest_house_breadcrumb?.() ?? "客邸"}
        subtitle={m.guest_house_intro?.() ?? "收藏好友的字句"}
      >
        <div className="text-sm fuwari-text-50">
          {m.guest_house_total({
            authorCount: authors.length.toString(),
            postCount: totalPosts.toString(),
          })}
        </div>
      </PageHeader>

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
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='24'%3E?%3C/text%3E%3C/svg%3E"
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
    </div>
  );
}