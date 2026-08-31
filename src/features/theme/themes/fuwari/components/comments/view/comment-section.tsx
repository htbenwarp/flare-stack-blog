// src/features/theme/themes/fuwari/components/comments/view/comment-section.tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";
import { useComments } from "@/features/comments/hooks/use-comments";
import { rootCommentsByPostIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { FuwariCommentEditor } from "../editor/comment-editor";
import { FuwariCommentList } from "./comment-list";
import FuwariConfirmationModal from "./confirmation-modal";

interface FuwariCommentSectionProps {
  postId: number;
  slug?: string;
  rootId?: number;
  highlightCommentId?: number;
  collapsed?: boolean;
}

export function FuwariCommentSection({
  postId,
  slug: _slug,
  rootId,
  highlightCommentId,
  collapsed = false,
}: FuwariCommentSectionProps) {
  const { data: session } = authClient.useSession();
  const [expanded, setExpanded] = useState(!collapsed);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      rootCommentsByPostIdInfiniteQuery(postId, session?.user.id),
    );

  const rootComments = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(postId);

  const [replyTarget, setReplyTarget] = useState<{
    rootId: number;
    commentId: number;
    userName: string;
  } | null>(null);

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("comment");

  const requireTurnstile = () => {
    if (!turnstilePending) return false;
    toast.error(m.comments_turnstile_required());
    turnstileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    throw new Error("TURNSTILE_PENDING");
  };

  const handleCreateComment = async (content: JSONContent) => {
    requireTurnstile();
    try {
      await createComment({
        data: {
          postId,
          content,
        },
      });
    } finally {
      resetTurnstile();
    }
  };

  const handleCreateReply = async (content: JSONContent) => {
    if (!replyTarget) return;
    requireTurnstile();
    try {
      await createComment({
        data: {
          postId,
          content,
          rootId: replyTarget.rootId,
          replyToCommentId: replyTarget.commentId,
        },
      });
      setReplyTarget(null);
    } finally {
      resetTurnstile();
    }
  };

  const handleDelete = async () => {
    if (commentToDelete) {
      await deleteComment({ data: { id: commentToDelete } });
      setCommentToDelete(null);
    }
  };

  // 锚点滚动功能
  useEffect(() => {
    if (isLoading || !data) return;

    const handleAnchor = () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith("#comment-")) return;

      const commentId = parseInt(hash.replace("#comment-", ""), 10);
      if (isNaN(commentId)) return;

      let retries = 0;
      const maxRetries = 20;

      const attemptScroll = () => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptScroll, 200);
        }
      };

      attemptScroll();
    };

    handleAnchor();
    window.addEventListener("hashchange", handleAnchor);
    return () => window.removeEventListener("hashchange", handleAnchor);
  }, [isLoading, data]);

  if (isLoading || !data) {
    return <FuwariCommentSectionSkeleton collapsed={collapsed} />;
  }

  return (
    <div className="space-y-6">
      {/* 折叠按钮 */}
      {collapsed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm fuwari-text-50 hover:text-(--fuwari-primary) transition-colors text-left"
        >
          {expanded ? "收起评论 ▾" : `查看评论 (${totalCount}) ▸`}
        </button>
      )}

      {/* 评论区内容（带动画） */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          collapsed
            ? expanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="space-y-6">
            <h2 className="text-xl font-bold fuwari-text-90">
              {m.comments_count({ count: totalCount })}
            </h2>

            <div ref={turnstileRef}>
              <Turnstile {...turnstileProps} />
            </div>

            {/* 评论列表（在上） */}
            <FuwariCommentList
              rootComments={rootComments}
              postId={postId}
              onReply={(rootIdArg, commentId, userName) =>
                setReplyTarget({ rootId: rootIdArg, commentId, userName })
              }
              onDelete={(id) => setCommentToDelete(id)}
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              onSubmitReply={handleCreateReply}
              isSubmittingReply={isCreating}
              initialExpandedRootId={rootId}
              highlightCommentId={highlightCommentId}
            />

            {/* Load More Root Comments */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="fuwari-btn-regular h-10 px-6 text-sm rounded-lg disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? m.comments_loading()
                    : m.comments_load_more()}
                </button>
              </div>
            )}

            {/* 评论输入框（在下） */}
            {session ? (
              <FuwariCommentEditor
                onSubmit={handleCreateComment}
                isSubmitting={isCreating && !replyTarget}
              />
            ) : (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm fuwari-text-30">
                  {m.comments_join_discussion()}
                </p>
                <Link to="/login">
                  <button className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg gap-2">
                    <LogIn size={14} />
                    {m.comments_login()}
                  </button>
                </Link>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            <FuwariConfirmationModal
              isOpen={!!commentToDelete}
              onClose={() => setCommentToDelete(null)}
              onConfirm={handleDelete}
              title={m.comments_delete_title()}
              message={m.comments_delete_desc()}
              confirmLabel={m.comments_delete_confirm()}
              isDanger={true}
              isLoading={isDeleting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FuwariCommentSectionSkeleton({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="space-y-6">
        <BubbleSkeleton index={0} className="h-5 w-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BubbleSkeleton index={0} className="h-7 w-24" />
      <BubbleSkeleton index={1} className="h-32 w-full" />
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="py-6 flex gap-4 border-b border-black/5 dark:border-white/5"
          >
            <BubbleSkeleton index={2 + i * 4} isStatic className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <BubbleSkeleton index={2 + i * 4 + 1} className="h-4 w-20" />
                <BubbleSkeleton index={2 + i * 4 + 2} className="h-3 w-16" />
              </div>
              <div className="space-y-1.5">
                <BubbleSkeleton index={2 + i * 4 + 3} className="h-3.5 w-full" />
                <BubbleSkeleton index={2 + i * 4 + 3} className="h-3.5 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}