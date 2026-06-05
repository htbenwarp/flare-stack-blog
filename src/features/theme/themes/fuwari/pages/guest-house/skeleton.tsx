import { Skeleton } from "@/components/ui/skeleton";

export function GuestHousePageSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-h-screen bg-(--fuwari-page-bg)">
      {/* 介绍卡片骨架 */}
      <div className="fuwari-card-base p-6">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-64 mb-4" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* 作者卡片网格骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fuwari-card-base p-5 flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}