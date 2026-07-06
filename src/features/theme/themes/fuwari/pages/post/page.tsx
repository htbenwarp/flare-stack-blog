import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { PostMeta } from "./components/post-meta";
import { PostSummary } from "./components/post-summary";
import { RelatedPosts, RelatedPostsSkeleton } from "./components/related-posts";
import TableOfContents from "./components/table-of-contents";
import { getAdjacentPostsFn, getAdjacentGuestPostsFn } from "@/features/posts/api/posts.public.api";
import { findPostBySlugFn } from "@/features/posts/api/posts.public.api"; // 直接导入用于管理员解锁
import { postGuestAuthorSlugQuery } from "@/features/posts/queries";
import { cn } from "@/lib/utils";
import { LikeButton } from "@/features/theme/themes/fuwari/components/like-button";
import { BackToTop } from "@/features/theme/themes/fuwari/components/control/back-to-top";

function EncryptedPostGate({ post, slug, onUnlocked }: any) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/posts/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password: password.trim() }),
      });
      const result = await res.json();
      if (result.success && result.post) {
        const safePost = {
          ...result.post,
          publishedAt: result.post.publishedAt ? new Date(result.post.publishedAt) : null,
          createdAt: result.post.createdAt ? new Date(result.post.createdAt) : null,
          updatedAt: result.post.updatedAt ? new Date(result.post.updatedAt) : null,
        };
        onUnlocked(safePost);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full fuwari-onload-animation">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <PostMeta post={post} className="mb-4" />
      <p className="text-sm fuwari-text-50 mb-6">
        {m.post_encrypted_summary?.() ?? "此文章已加密，需要密码访问"}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder={m.post_password_placeholder_front?.() ?? "输入密码..."}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-(--fuwari-primary)"
        />
        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="px-4 py-2 text-sm font-medium rounded bg-(--fuwari-primary) text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "验证中..." : m.post_password_submit?.() ?? "验证"}
        </button>
        {error && (
          <p className="text-red-500 text-xs">
            {m.post_password_error?.() ?? "密码错误，请重试"}
          </p>
        )}
      </form>
    </div>
  );
}

function AdjacentPosts({
  prev,
  next,
  isLoading,
}: {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-between gap-4 mt-4">
        <div className="fuwari-card-base flex-1 flex items-center gap-3 p-4 animate-pulse">
          <div className="h-5 w-5 rounded bg-black/10 dark:bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-12 rounded bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
          </div>
        </div>
        <div className="fuwari-card-base flex-1 flex items-center justify-end gap-3 p-4 animate-pulse">
          <div className="space-y-2 flex-1 text-right">
            <div className="h-3 w-12 rounded bg-black/10 dark:bg-white/10 ml-auto" />
            <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10 ml-auto" />
          </div>
          <div className="h-5 w-5 rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-4 mt-4">
      {prev ? (
        <Link to="/post/$slug" params={{ slug: prev.slug }} className="fuwari-card-base flex-1 flex items-center gap-3 p-4 transition-all hover:shadow-lg hover:bg-(--fuwari-primary)/5">
          <ChevronLeft size={20} className="text-(--fuwari-primary)" />
          <div className="text-left min-w-0">
            <p className="text-xs text-muted-foreground">{m.post_prev_post?.() ?? "上一篇"}</p>
            <p className="text-sm font-medium truncate">{prev.title}</p>
          </div>
        </Link>
      ) : (<div className="flex-1" />)}
      {next ? (
        <Link to="/post/$slug" params={{ slug: next.slug }} className="fuwari-card-base flex-1 flex items-center justify-end gap-3 p-4 text-right transition-all hover:shadow-lg hover:bg-(--fuwari-primary)/5">
          <div className="text-right min-w-0">
            <p className="text-xs text-muted-foreground">{m.post_next_post?.() ?? "下一篇"}</p>
            <p className="text-sm font-medium truncate">{next.title}</p>
          </div>
          <ChevronRight size={20} className="text-(--fuwari-primary)" />
        </Link>
      ) : (<div className="flex-1" />)}
    </div>
  );
}

export function PostPage({ post }: PostPageProps) {
  const { data: session } = authClient.useSession();
  const { slug } = useParams({ from: "/_public/post/$slug" });
  const [unlockedPost, setUnlockedPost] = useState<any>(null);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => { setUnlockedPost(null); }, [slug]);

  // 音乐 iframe 替换逻辑（保留）
  useEffect(() => {
    const container = document.querySelector('.fuwari-custom-md');
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const toReplace: any[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent && node.textContent.includes('data-netease-id')) {
        toReplace.push(node);
      }
    }
    for (const textNode of toReplace) {
      let content = textNode.textContent || '';
      const idMatch = content.match(/data-netease-id=&(?:quot|#34);(\d+)&(?:quot|#34);/) ||
                      content.match(/data-netease-id=["'](\d+)["']/);
      const typeMatch = content.match(/data-netease-type=&(?:quot|#34);(\d+)&(?:quot|#34);/) ||
                        content.match(/data-netease-type=["'](\d+)["']/);
      if (idMatch) {
        const id = idMatch[1];
        const type = typeMatch ? typeMatch[1] : '2';
        const iframe = document.createElement('iframe');
        iframe.src = `//music.163.com/outchain/player?type=${type}&id=${id}&auto=0&height=66`;
        iframe.width = '100%';
        iframe.height = '86';
        iframe.frameBorder = '0';
        iframe.style.maxWidth = '409px';
        iframe.style.display = 'block';
        textNode.parentNode?.replaceChild(iframe, textNode);
      }
    }
  }, [post.id]);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "manager";

  // ✅ 管理员自动解锁：如果当前文章加密但正文为空（占位），且为管理员，则主动获取完整文章
  useEffect(() => {
    if (isAdmin && post.isEncrypted && !post.contentJson?.content?.length) {
      findPostBySlugFn({ data: { slug } }).then((fullPost) => {
        if (fullPost && fullPost.contentJson?.content?.length) {
          setUnlockedPost(fullPost);
        }
      }).catch(() => {});
    }
  }, [isAdmin, post.isEncrypted, slug]);

  const displayPost = unlockedPost || post;
  const safeDisplayPost = {
    ...displayPost,
    publishedAt: displayPost.publishedAt ? new Date(displayPost.publishedAt) : null,
    createdAt: displayPost.createdAt ? new Date(displayPost.createdAt) : null,
    updatedAt: displayPost.updatedAt ? new Date(displayPost.updatedAt) : null,
  };

  const isGuestPost = safeDisplayPost.isGuestPost || !!safeDisplayPost.guestAuthor;
  const { data: guestInfo } = useQuery({
    ...postGuestAuthorSlugQuery(slug),
    enabled: isGuestPost,
  });
  const currentGuestAuthorSlug = guestInfo?.guestAuthorSlug;

  const { data: adjacentData, isLoading: adjacentLoading } = useQuery({
    queryKey: ["adjacent-posts", slug, isGuestPost],
    queryFn: () =>
      isGuestPost
        ? getAdjacentGuestPostsFn({ data: { slug } })
        : getAdjacentPostsFn({ data: { slug } }),
    staleTime: 60 * 60 * 1000,
  });

  const needPassword = !isAdmin && safeDisplayPost.isEncrypted && !safeDisplayPost.contentJson?.content?.length;

  const breadcrumb = isGuestPost && currentGuestAuthorSlug ? (
    <div className="mb-4 text-sm fuwari-text-50">
      <Link to="/guest-house" className="hover:text-(--fuwari-primary)">{m.guest_house_breadcrumb()}</Link>
      <span className="mx-1">/</span>
      <Link to={`/guest-house/author/${encodeURIComponent(currentGuestAuthorSlug)}`} className="hover:text-(--fuwari-primary)">
        {safeDisplayPost.guestAuthor?.name ?? "作者"}
      </Link>
    </div>
  ) : null;

  const guestFooter = isGuestPost && safeDisplayPost.guestAuthor ? (
    <div className="mt-8 pt-5 border-t border-dashed border-black/10 dark:border-white/[0.15] flex items-center justify-end gap-2 text-50">
      <span className="font-serif text-sm opacity-70">{m.guest_house_resident?.() ?? "寄存于客邸 ·"}</span>
      <span className="font-medium uppercase tracking-wide">{safeDisplayPost.guestAuthor.name}</span>
    </div>
  ) : null;

  if (needPassword) {
    return (
      <>
        <BackToTop showCommentButton isGuestPost={isGuestPost} />
        <div className="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
          <EncryptedPostGate post={safeDisplayPost} slug={slug} onUnlocked={(full) => setUnlockedPost(full)} />
          <div id="adjacent-posts">
            <AdjacentPosts prev={adjacentData?.prev} next={adjacentData?.next} isLoading={adjacentLoading} />
          </div>
          {!isGuestPost && (
            <div id="comment-section" className="fuwari-card-base p-6 fuwari-onload-animation" style={{ animationDelay: "450ms" }}>
              <FuwariCommentSection postId={safeDisplayPost.id} />
            </div>
          )}
        </div>
      </>
    );
  }

  const wordCount = safeDisplayPost.readTimeInMinutes * 300;
  const metaPost = {
    ...safeDisplayPost,
    isGuestPost,
    guestAuthor: safeDisplayPost.guestAuthor,
    guestAuthorSlug: safeDisplayPost.guestAuthor?.slug,
  };

  return (
    <>
      <BackToTop showCommentButton isGuestPost={isGuestPost} />
      <div className="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
        {!isGuestPost && safeDisplayPost.toc?.length > 0 && (
          <div className="hidden 2xl:block absolute top-0 h-full pl-4" style={{ right: "calc(var(--fuwari-toc-width) * -1)", width: "var(--fuwari-toc-width)" }}>
            <TableOfContents headers={safeDisplayPost.toc} />
          </div>
        )}

        <div className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-10 relative w-full fuwari-onload-animation overflow-visible">
          {breadcrumb}

          {!isGuestPost && safeDisplayPost.toc?.length > 0 && (
            <div className="mb-6 2xl:hidden">
              <button onClick={() => setTocOpen(!tocOpen)} className="text-sm font-medium fuwari-text-90 cursor-pointer flex items-center gap-1 w-full text-left">
                <span className="w-1 h-4 rounded-md bg-(--fuwari-primary) transition-colors duration-200" />
                <span>{m.table_of_contents_title?.() ?? "目录"}</span>
                <ChevronRight size={14} className={cn("transition-transform duration-200", tocOpen && "rotate-90")} />
              </button>
              <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", tocOpen ? "max-h-[60vh] overflow-y-auto mt-3" : "max-h-0")}>
                <div className="ml-4 border-l border-(--fuwari-primary)/20 pl-4">
                  <TableOfContents headers={safeDisplayPost.toc} variant="inline" />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-row flex-wrap fuwari-text-30 gap-5 mb-3 transition">
            <div className="flex flex-row items-center">
              <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                <FileText strokeWidth={1.5} size={16} />
              </div>
              <div className="text-sm">{m.post_word_count({ count: wordCount })}</div>
            </div>
            <div className="flex flex-row items-center">
              <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                <Clock strokeWidth={1.5} size={16} />
              </div>
              <div className="text-sm">{m.read_time({ count: safeDisplayPost.readTimeInMinutes })}</div>
            </div>
            {isAdmin && (
              <Link to="/admin/posts/edit/$id" params={{ id: String(safeDisplayPost.id) }} className="flex flex-row items-center fuwari-text-30 hover:fuwari-text-90 transition animate-in fade-in duration-500">
                <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                  <Pencil strokeWidth={1.5} size={16} />
                </div>
                <div className="text-sm">{m.post_edit()}</div>
              </Link>
            )}
          </div>

          <h1 className="transition w-full block font-bold mb-3 text-3xl md:text-[2.25rem]/[2.75rem] fuwari-text-90" style={{ viewTransitionName: `post-title-${safeDisplayPost.slug}` }}>
            {safeDisplayPost.title}
          </h1>

          <PostMeta post={metaPost as any} className="mb-5" />
          <PostSummary summary={safeDisplayPost.summary} />
          <div className="mb-6 prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
            <ContentRenderer content={safeDisplayPost.contentJson} />
          </div>

          {guestFooter}

          <div className="my-8 flex items-center justify-center w-full">
            <div className="h-px w-full bg-linear-to-r from-transparent via-(--fuwari-meta-divider) to-transparent opacity-20" />
            <span className="mx-4 text-sm font-mono tracking-widest text-(--fuwari-meta-divider) opacity-50 whitespace-nowrap">END</span>
            <div className="h-px w-full bg-linear-to-r from-(--fuwari-meta-divider) via-transparent to-transparent opacity-20" />
          </div>

          <LikeButton />
        </div>

        <div id="adjacent-posts">
          <AdjacentPosts prev={adjacentData?.prev} next={adjacentData?.next} isLoading={adjacentLoading} />
        </div>

        {!isGuestPost && (
          <Suspense fallback={<RelatedPostsSkeleton />}>
            <RelatedPosts slug={safeDisplayPost.slug} />
          </Suspense>
        )}

        {!isGuestPost && (
          <div id="comment-section" className="fuwari-card-base p-6 fuwari-onload-animation" style={{ animationDelay: "450ms" }}>
            <FuwariCommentSection postId={safeDisplayPost.id} />
          </div>
        )}
      </div>
    </>
  );
}