import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMomentFn } from "@/features/moments/api/moments.api";
import { FuwariCommentEditor } from "@/features/theme/themes/fuwari/components/comments/editor/comment-editor"; // 复用评论的编辑器？或者使用 Tiptap 简化版
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";

export function MomentEditor() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<JSONContent | null>(null);
  const [location, setLocation] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16)); // datetime-local 格式

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error("Content required");
      const deviceInfo = {
        browser: navigator.userAgentData?.brands?.[0]?.brand ?? navigator.userAgent.split("/")[0],
        os: navigator.userAgentData?.platform ?? navigator.platform,
        device: navigator.userAgentData?.mobile ? "mobile" : "desktop",
      };
      return createMomentFn({
        data: {
          content,
          location: location || undefined,
          deviceInfo,
          publishedAt: new Date(publishedAt).toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("动态发布成功");
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      setContent(null);
      setLocation("");
    },
    onError: () => toast.error("发布失败"),
  });

  return (
    <div className="fuwari-card-base p-4 space-y-3">
      <h3 className="text-lg font-bold fuwari-text-90">发布动态</h3>
      <div className="space-y-2">
        <FuwariCommentEditor
          onSubmit={(content) => setContent(content)}
          isSubmitting={false}
          placeholder="说点什么..."
        />
        <input
          type="text"
          placeholder="地点（可选）"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full text-sm fuwari-input px-3 py-2 rounded-lg"
        />
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className="w-full text-sm fuwari-input px-3 py-2 rounded-lg"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!content || createMutation.isPending}
          className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg disabled:opacity-50"
        >
          {createMutation.isPending ? "发布中..." : "发布"}
        </button>
      </div>
    </div>
  );
}