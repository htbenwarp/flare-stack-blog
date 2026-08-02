// src/features/theme/themes/fuwari/pages/moments/index.tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { getMomentsFn } from "@/features/moments/api/moments.api";
import { MomentList } from "@/features/theme/themes/fuwari/components/moments/moment-list";
import { MomentEditorModal } from "@/features/theme/themes/fuwari/components/moments/moment-editor-modal";
import { authClient } from "@/lib/auth/auth.client";

interface MomentsSearch {
  date?: string;
}

export function MomentsPage() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const [editorOpen, setEditorOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const search = useSearch({ from: "/_public/moments/" }) as MomentsSearch;
  const selectedDate = search.date;

  const momentsQuery = useInfiniteQuery({
    queryKey: ["moments", selectedDate],
    queryFn: async ({ pageParam }) => {
      return getMomentsFn({
        data: {
          cursor: pageParam,
          limit: 20,
          date: selectedDate || undefined,
        },
      });
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      const lastMoment = lastPage[lastPage.length - 1];
      return lastMoment?.publishedAt
        ? new Date(lastMoment.publishedAt).getTime()
        : undefined;
    },
  });

  const handleEdit = (moment: any) => {
    setEditData({
      id: moment.id,
      content: moment.content,
      location: moment.location,
      publishedAt: moment.publishedAt,
    });
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditData(null);
  };

  return (
    <>
      {isAdmin && (
        <button
          onClick={() => setEditorOpen(true)}
          className="fuwari-btn-primary w-full h-12 rounded-lg font-bold"
        >
          ✨ 发布动态
        </button>
      )}

      <MomentList
        query={momentsQuery}
        isAdmin={isAdmin}
        onEdit={handleEdit}
      />

      <MomentEditorModal
        isOpen={editorOpen}
        onClose={handleCloseEditor}
        initialData={editData}
      />
    </>
  );
}