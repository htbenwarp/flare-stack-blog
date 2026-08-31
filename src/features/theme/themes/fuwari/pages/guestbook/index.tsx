import { useQuery } from "@tanstack/react-query";
import { getGuestbookPostFn } from "@/features/posts/api/posts.public.api";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";
import { LikeButton } from "@/features/theme/themes/fuwari/components/like-button";
import { GuestbookPageSkeleton } from "./skeleton";
import { m } from "@/paraglide/messages";

export function GuestbookPage() {
  const { data: post, isLoading } = useQuery({
    queryKey: ["guestbook-post"],
    queryFn: () => getGuestbookPostFn(),
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) return <GuestbookPageSkeleton />;
  if (!post) return <p className="text-center py-10 fuwari-text-50">{m.guestbook_not_found?.() ?? "留言板未初始化"}</p>;

  return (
    <div className="flex flex-col gap-6 max-w-(--fuwari-page-width) mx-auto">
      {/* 介绍卡片 */}
      <div className="fuwari-card-base p-10 md:p-10 space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold fuwari-text-90">{post.title}</h1>
        <div className="prose dark:prose-invert max-w-none!">
          <ContentRenderer content={post.contentJson} />
        </div>
        {/* 点赞按钮内置于卡片底部 */}
        <div className="flex justify-center pt-4">
          <LikeButton />
        </div>
      </div>

      {/* 评论区 */}
      <div className="fuwari-card-base p-6">
        <FuwariCommentSection postId={post.id} />
      </div>
    </div>
  );
}
