import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MEDIA_KEYS } from "@/features/media/queries";
import { updatePostFn as adminUpdatePostFn } from "@/features/posts/api/posts.admin.api";
import { PostEditor } from "@/features/posts/components/post-editor";
import { PostEditorSkeleton } from "@/features/posts/components/post-editor/post-editor-skeleton";
import type { PostEditorData } from "@/features/posts/components/post-editor/types";
import { POSTS_KEYS, postByIdQuery } from "@/features/posts/queries";
import { setPostTagsFn } from "@/features/tags/api/tags.api";
import {
  TAGS_KEYS,
  tagsAdminQueryOptions,
  tagsByPostIdQueryOptions,
} from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts/edit/$id")({
  ssr: "data-only",
  component: EditPost,
  pendingComponent: PostEditorSkeleton,
  loader: async ({ context, params }) => {
    const postId = Number(params.id);
    const [post, _] = await Promise.all([
      context.queryClient.ensureQueryData(postByIdQuery(postId)),
      context.queryClient.ensureQueryData(tagsByPostIdQueryOptions(postId)),
      context.queryClient.prefetchQuery(tagsAdminQueryOptions()),
    ]);
    return { title: post?.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function EditPost() {
  const { id } = Route.useParams();
  const postId = Number(id);
  const queryClient = useQueryClient();

  const { data: post } = useQuery(postByIdQuery(postId));
  const { data: tags } = useQuery(tagsByPostIdQueryOptions(postId));

  if (!post || !tags) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-serif font-medium">
            {m.admin_post_edit_not_found_title()}
          </h2>
          <p className="text-zinc-400 font-light text-sm">
            {m.admin_post_edit_not_found_desc({ id: String(postId) })}
          </p>
        </div>
      </div>
    );
  }

  // ✅ 包含加密字段
  const initialData = {
    id: post.id,
    title: post.title,
    summary: post.summary ?? "",
    slug: post.slug,
    status: post.status,
    readTimeInMinutes: post.readTimeInMinutes,
    contentJson: post.contentJson,
    publishedAt: post.publishedAt,
    tagIds: tags.map((t) => t.id),
    pinnedAt: post.pinnedAt,
    isSynced: post.isSynced,
    hasPublicCache: post.hasPublicCache,
    isEncrypted: (post as any).isEncrypted ?? false, // 从接口获取加密状态
    password: "", // 密码永远不回显
  };

  const handleSave = async (data: PostEditorData) => {
    const publishedAt =
      data.status === "published" && !post.publishedAt
        ? new Date()
        : data.publishedAt;

    // ✅ 过滤密码字段：空字符串改为 undefined，防止清空密码
    const cleanData = {
      ...data,
      password: data.password?.trim() || undefined,
      publishedAt,
    };

    const [updateResult] = await Promise.all([
      adminUpdatePostFn({
        data: {
          id: post.id,
          data: cleanData,
        },
      }),
      setPostTagsFn({
        data: {
          postId: post.id,
          tagIds: data.tagIds,
        },
      }),
    ]);

    if (updateResult.error) {
      throw new Error(m.admin_post_edit_error_not_found());
    }

    queryClient.invalidateQueries({ queryKey: POSTS_KEYS.detail(postId) });
    queryClient.invalidateQueries({ queryKey: POSTS_KEYS.lists });
    queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
    queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });

    queryClient.invalidateQueries({ queryKey: TAGS_KEYS.postTags(postId) });
    queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
    queryClient.invalidateQueries({
      queryKey: MEDIA_KEYS.linked,
    });
  };

  return <PostEditor initialData={initialData} onSave={handleSave} />;
}