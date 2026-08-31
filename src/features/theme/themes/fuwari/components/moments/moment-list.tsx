// src/features/theme/themes/fuwari/components/moments/moment-list.tsx
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { MomentCard } from "./moment-card";
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

interface MomentListProps {
  query: UseInfiniteQueryResult<any, unknown>;
  isAdmin?: boolean;
  onEdit?: (moment: any) => void;
}

export function MomentList({ query, isAdmin, onEdit }: MomentListProps) {
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [
    inView,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
  ]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <BubbleSkeleton key={i} index={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const moments = (query.data?.pages ?? [])
    .flat()
    .filter(Boolean)
    .filter((moment: any) => moment?.id);

  if (moments.length === 0 && !query.isFetchingNextPage) {
    return (
      <div className="py-20 text-center fuwari-text-50 text-sm">
        暂无动态
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moments.map((moment: any) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          isAdmin={isAdmin}
          onEdit={onEdit}
        />
      ))}
      {query.isFetchingNextPage && (
        <BubbleSkeleton index={0} className="h-32 w-full" />
      )}
      <div ref={ref} className="h-10" />
    </div>
  );
}