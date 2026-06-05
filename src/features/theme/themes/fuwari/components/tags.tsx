import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { tagsQueryOptions } from "@/features/tags/queries";
import {
  guestHouseTagsQueryOptions,
  guestAuthorTagsQueryOptions,
} from "@/features/guest-authors/queries/public";
import { postBySlugQuery } from "@/features/posts/queries";
import { m } from "@/paraglide/messages";

export function TagsSkeleton() {
  return (
    <div className="fuwari-card-base p-4">
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function Tags() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isGuestHouse = pathname.startsWith("/guest-house");
  const authorMatch = pathname.match(/\/guest-house\/author\/([^/]+)/);
  const authorSlug = authorMatch ? decodeURIComponent(authorMatch[1]) : null;

  // 判断是否在文章详情页，并获取 slug
  const postMatch = routerState.matches.find(
    (m) => m.routeId === "/_public/post/$slug"
  );
  const slug = (postMatch?.params as any)?.slug;

  // 查询文章数据（仅在可能为文章详情页时启用）
  const { data: postData } = useQuery({
    ...postBySlugQuery(slug),
    enabled: !!slug && !isGuestHouse,
  });

  // 从文章数据中提取客邸信息（直接、可靠）
  const isGuestPost = !!(postData?.isGuestPost);
  const guestAuthorSlug = postData?.guestAuthorSlug || postData?.guestAuthor?.slug;

  // 选择标签数据源
  let queryOptions;
  if (authorSlug) {
    // 在作者页，使用该作者标签
    queryOptions = guestAuthorTagsQueryOptions(authorSlug);
  } else if (isGuestPost && guestAuthorSlug) {
    // 客邸文章详情页，使用该作者专属标签
    queryOptions = guestAuthorTagsQueryOptions(guestAuthorSlug);
  } else if (isGuestHouse || isGuestPost) {
    // 客邸主页，或客邸文章但无作者信息，使用全客邸标签
    queryOptions = guestHouseTagsQueryOptions();
  } else {
    // 主站
    queryOptions = tagsQueryOptions;
  }

  const { data: tags } = useSuspenseQuery(queryOptions);

  // 生成标签链接
  const getTagLink = (tagName: string) => {
    const effectiveAuthorSlug = authorSlug || guestAuthorSlug;
    if (effectiveAuthorSlug) {
      return {
        to: "/guest-house/author/$slug",
        params: { slug: effectiveAuthorSlug },
        search: { tagName },
      };
    }
    if (isGuestHouse || isGuestPost) {
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

  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setShowToggle(containerRef.current.scrollHeight > 160);
    }
  }, [tags]);

  if (!tags || tags.length === 0) return null;

  return (
    <div className="fuwari-card-base pb-4 transition-all duration-300">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        {m.tags_title()}
      </div>

      <div
        ref={containerRef}
        className={`px-4 flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          isExpanded || !showToggle ? "max-h-250" : "max-h-40"
        }`}
      >
        {tags.map((tag: any) => {
          const link = getTagLink(tag.name);
          return (
            <Link
              key={tag.name ?? tag.id}
              to={link.to as any}
              params={'params' in link ? link.params : undefined}
              search={link.search}
              className="fuwari-btn-regular h-8 text-sm px-3 rounded-lg flex items-center gap-2"
            >
              <span>{tag.name}</span>
              <span className="bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 text-xs opacity-70">
                {tag.postCount ?? tag.count ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {showToggle && (
        <div className="px-4 pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 flex items-center justify-center gap-1 text-sm fuwari-text-50 hover:text-(--fuwari-primary) transition-colors"
          >
            {isExpanded ? (
              <>
                {m.tags_collapse()} <ChevronUp size={16} />
              </>
            ) : (
              <>
                {m.tags_expand()} <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}