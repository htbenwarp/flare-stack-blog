import { ClientOnly, Link } from "@tanstack/react-router";
import {
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Heart,
  Pin,
  Tag,
} from "lucide-react";
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { getSizedImageUrl } from "@/features/media/utils/media.utils";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useQuery } from "@tanstack/react-query";
import { getLikeCountFn } from "@/features/likes/api/likes.public.api";

interface PostCardProps {
  post: PostItem;
  pinned?: boolean;
  popular?: boolean;
  views?: number;
  isLoadingViews?: boolean;
}

export function PostCard({
  post,
  pinned,
  popular,
  views,
  isLoadingViews,
}: PostCardProps) {
  const tagNames = (post.tags ?? []).map((t) => t.name);
  const hasCover = Boolean(post.cover);
  const coverWidth = "28%";

  // 编码 slug，确保中英文路径一致
  const encodedSlug = encodeURIComponent(post.slug);
  const likePath = `/post/${encodedSlug}`;

  const { data: likeData, isPending: isLoadingLikeCount } = useQuery({
    queryKey: ["likeCount", likePath],
    queryFn: () => getLikeCountFn({ data: { path: likePath } }),
    staleTime: 0,
  });

  const likeCount = likeData?.count ?? 0;

  return (
    <div
      className={`fuwari-card-base ${
        hasCover ? "flex flex-col-reverse lg:flex-col" : "flex flex-col"
      } w-full rounded-(--fuwari-radius-large) overflow-hidden relative ${
        pinned ? "border-2 border-(--fuwari-primary)/20 shadow-sm" : ""
      }`}
      style={{ ["--coverWidth" as string]: coverWidth }}
    >
      {pinned && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--fuwari-primary) opacity-5 rounded-bl-[100px] -z-10 pointer-events-none" />
      )}

      <div
        className={`pl-6 md:pl-9 pr-6 pt-6 md:pt-7 pb-6 relative ${
          hasCover
            ? "w-full lg:w-[calc(100%_-_var(--coverWidth)_-_12px)] lg:pr-2"
            : "w-full md:pr-24"
        }`}
      >
        {/* Badge */}
        {(pinned || popular) && (
          <div className="flex items-center gap-1.5 font-medium text-sm mb-3">
            {pinned ? (
              <>
                <Pin
                  size={16}
                  className="fill-current text-(--fuwari-primary)"
                />
                <span className="text-(--fuwari-primary)">
                  {m.home_pinned_posts()}
                </span>
              </>
            ) : (
              <>
                <Flame size={16} className="text-orange-500" />
                <span className="text-orange-500">
                  {m.home_popular_posts()}
                </span>
              </>
            )}
          </div>
        )}

        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          className="transition group w-full block font-bold mb-3 text-3xl fuwari-text-90 hover:text-(--fuwari-primary) active:text-(--fuwari-primary) relative before:w-1 before:h-5 before:rounded-md before:absolute before:-left-5 before:top-1/2 before:-translate-y-1/2 before:hidden md:before:block before:bg-(--fuwari-primary)"
        >
          {post.title}
          {
            <>
              <ChevronRight className="inline-block md:hidden text-[2rem] text-(--fuwari-primary) align-middle -mt-1 ml-1" />
              <ChevronRight className="text-(--fuwari-primary) text-[2rem] transition hidden md:inline absolute translate-y-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
            </>
          }
        </Link>

        {/* Metadata */}
        <div className="flex flex-wrap fuwari-text-50 items-center gap-4 gap-x-4 gap-y-2 mb-4">
          <div className="flex items-center">
            <div className="fuwari-meta-icon">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <time
              dateTime={post.publishedAt?.toISOString()}
              className="text-sm font-medium"
            >
              <ClientOnly fallback="-">
                {formatDate(post.publishedAt)}
              </ClientOnly>
            </time>
          </div>
          {tagNames.length > 0 && (
            <div className="flex items-center">
              <div className="fuwari-meta-icon">
                <Tag size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-row flex-wrap items-center gap-x-1.5">
                {tagNames.map((name, i) => {
                  const separator = i > 0 ? (
                    <span className="mx-1.5 text-(--fuwari-meta-divider) text-sm">
                      /
                    </span>
                  ) : null;

                  // 客邸文章：标签链接到客邸作者页并携带 tagName 参数
                  if (post.isGuestPost && (post as any).guestAuthorSlug) {
                    return (
                      <span key={name} className="flex items-center">
                        {separator}
                        <Link
                          to="/guest-house/author/$slug"
                          params={{ slug: (post as any).guestAuthorSlug }}
                          search={{ tagName: name }}
                          className="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary)"
                        >
                          {name}
                        </Link>
                      </span>
                    );
                  }

                  // 普通文章：标签链接到 /posts
                  return (
                    <span key={name} className="flex items-center">
                      {separator}
                      <Link
                        to="/posts"
                        search={{ tagName: name }}
                        className="fuwari-expand-animation rounded-md px-1.5 py-1 -m-1.5 text-sm font-medium hover:text-(--fuwari-primary)"
                      >
                        {name}
                      </Link>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div
          className={`fuwari-text-75 pr-4 wrap-break-word ${
            pinned
              ? "mb-4 line-clamp-3 md:line-clamp-2 text-lg leading-relaxed"
              : "mb-3.5 line-clamp-2 md:line-clamp-1"
          }`}
        >
          {post.summary ?? ""}
        </div>

        {/* Read time, Views, and Likes */}
        <div className="text-sm fuwari-text-50 flex items-center gap-4 [&_svg]:shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} />
            {m.read_time({ count: post.readTimeInMinutes })}
          </span>
          {isLoadingViews ? (
            <span className="inline-flex items-center gap-1.5">
              <Eye size={15} />
              <BubbleSkeleton index={0} isStatic className="h-3.5 w-8" />
            </span>
          ) : (
            views !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Eye size={15} />
                {views.toLocaleString()}
              </span>
            )
          )}

          {/* 点赞数 – 仅当 > 0 时显示 */}
          {isLoadingLikeCount ? (
            <span className="inline-flex items-center gap-1.5">
              <Heart size={14} />
              <BubbleSkeleton index={0} isStatic className="h-3.5 w-8" />
            </span>
          ) : (
            likeCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Heart size={14} />
                {likeCount.toLocaleString()}
              </span>
            )
          )}
        </div>
      </div>

      {/* Cover, or the plain enter button when the post has no cover */}
      {hasCover && post.cover ? (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="group relative block mx-4 mt-4 -mb-2 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 active:scale-95 lg:m-0 lg:w-(--coverWidth) lg:absolute lg:top-3 lg:bottom-3 lg:right-3"
        >
          <div className="absolute pointer-events-none z-10 w-full h-full group-hover:bg-black/30 group-active:bg-black/50 transition" />
          <div className="absolute pointer-events-none z-20 w-full h-full flex items-center justify-center">
            <ChevronRight className="transition opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 text-white text-5xl" />
          </div>
          {/* 小屏/窄屏完整展示整张封面（object-contain，超高图按 60vh 缩放）；lg 以上作为卡片右侧缩略图 */}
          <img
            src={getSizedImageUrl(post.cover.url, 640)}
            alt={post.title}
            width={post.cover.width ?? undefined}
            height={post.cover.height ?? undefined}
            loading="lazy"
            className="block mx-auto w-auto max-w-full max-h-[60vh] object-contain lg:w-full lg:h-full lg:max-w-none lg:max-h-none lg:object-cover"
          />
        </Link>
      ) : (
        <Link
          to="/post/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
          className="hidden md:flex fuwari-btn-regular w-13 absolute right-3 top-3 bottom-3 rounded-xl active:scale-95"
        >
          <ChevronRight
            className="text-(--fuwari-primary) text-4xl mx-auto"
            strokeWidth={2}
          />
        </Link>
      )}
    </div>
  );
}
