import { ClientOnly, Link } from "@tanstack/react-router";
import { Calendar, Edit, Tag } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface PostMetaProps {
  post: any;
  className?: string;
}

export function PostMeta({ post, className }: PostMetaProps) {
  const published = post.publishedAt;
  const updated = post.updatedAt;
  const isUpdated = Boolean(published && updated && published.getTime() !== updated.getTime());

const getTagLink = (tagName: string) => {
  // 健壮判断：满足任一条件即为客邸文章
  const isGuest = post.isGuestPost || post.guestAuthorId != null || post.guestAuthor != null;

  if (isGuest) {
    // 优先跳转到客邸主页过滤标签（避免因缺少作者slug而失败）
    return {
      to: "/guest-house",
      search: { tagName },
    };
  }
  return {
    to: "/posts",
    search: { tagName },
  };
};

  return (
    <div className={cn("flex flex-wrap text-black/50 dark:text-white/40 items-center gap-4 gap-x-4 gap-y-2", className)}>
      <div className="flex items-center">
        <div className="fuwari-meta-icon">
          <Calendar strokeWidth={1.5} size={20} />
        </div>
        <span className="text-sm font-medium fuwari-text-50">
          <ClientOnly fallback="-">{formatDate(published)}</ClientOnly>
        </span>
      </div>

      {isUpdated && (
        <div className="flex items-center">
          <div className="fuwari-meta-icon">
            <Edit strokeWidth={1.5} size={20} />
          </div>
          <span className="text-sm font-medium fuwari-text-50">
            <ClientOnly fallback="-">{formatDate(updated)}</ClientOnly>
          </span>
        </div>
      )}

      <div className="flex items-center">
        <div className="fuwari-meta-icon">
          <Tag strokeWidth={1.5} size={20} />
        </div>
        <div className="flex flex-row flex-nowrap items-center gap-x-1.5">
          {post.tags && post.tags.length > 0 ? (
            post.tags.map((tag: any, i: number) => {
              const link = getTagLink(tag.name);
              return (
                <span key={tag.name} className="flex items-center">
                  {i > 0 && (
                    <span className="mx-1.5 text-(--fuwari-meta-divider) text-sm">/</span>
                  )}
                  <Link
                    to={link.to as any}
                    params={link.params}
                    search={link.search}
                    className="transition fuwari-text-50 text-sm font-medium hover:text-(--fuwari-primary) whitespace-nowrap"
                  >
                    {tag.name}
                  </Link>
                </span>
              );
            })
          ) : (
            <span className="transition fuwari-text-50 text-sm font-medium">{m.post_no_tags()}</span>
          )}
        </div>
      </div>
    </div>
  );
}