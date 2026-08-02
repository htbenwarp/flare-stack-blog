// src/features/theme/themes/fuwari/components/moments/moment-list.tsx
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { MomentCard } from "./moment-card";
import { Skeleton } from "@/components/ui/skeleton";

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
          <Skeleton
            key={i}
            className="h-48 w-full rounded-(--fuwari-radius-large)"
          />
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
        <Skeleton className="h-32 w-full rounded-(--fuwari-radius-large)" />
      )}
      <div ref={ref} className="h-10" />
    </div>
  );
}