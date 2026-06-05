import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import theme from "@theme";
import {
  guestAuthorBySlugQueryOptions,
  guestPostsInfiniteQueryOptions,
} from "@/features/guest-authors/queries/public";
import { m } from "@/paraglide/messages";
import { FileText } from "lucide-react";
import { GuestHousePageSkeleton } from "./skeleton";

export function GuestAuthorPage() {
  const { slug } = useParams({ from: "/_public/guest-house/author/$slug" });
  const search = useSearch({ from: "/_public/guest-house/author/$slug" }) as {
    tagName?: string;
  };

  const { data: author, isLoading: authorLoading } = useQuery(
    guestAuthorBySlugQueryOptions(slug),
  );

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
  } = useInfiniteQuery(
    guestPostsInfiniteQueryOptions({ authorSlug: slug, tagName: search.tagName }),
  );

  const allPosts = postsData?.pages.flatMap((page) => page.items) ?? [];

  if (authorLoading || postsLoading) {
    return <GuestHousePageSkeleton />;
  }

  if (!author) return <div className="text-center py-8 fuwari-text-50">作者不存在</div>;

  const avatarSrc = author.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='24'%3E?%3C/text%3E%3C/svg%3E";

  return (
    <div className="flex flex-col gap-4">
      <div className="fuwari-card-base p-6">
        <Link
          to="/guest-house"
          className="text-sm fuwari-text-50 hover:text-(--fuwari-primary) inline-flex items-center gap-1 mb-3"
        >
          ← {m.guest_house_breadcrumb()}
        </Link>
        <div className="flex items-center gap-4">
          <img src={avatarSrc} alt={author.name} className="w-16 h-16 rounded-full object-cover border border-(--fuwari-primary)/20" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold fuwari-text-90">{author.name}</h1>
            {author.bio && <p className="text-sm fuwari-text-50 mt-1">{author.bio}</p>}
          </div>
          <div className="text-sm fuwari-text-50 flex items-center gap-1">
            <FileText size={14} />
            <span>{author.postCount} 篇</span>
          </div>
        </div>
      </div>
      <theme.PostsPage
        posts={allPosts}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}