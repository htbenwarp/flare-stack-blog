import { Skeleton } from "@/components/ui/skeleton";

export function GuestAuthorPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-h-screen bg-(--fuwari-page-bg)">
      <Skeleton className="h-4 w-20" />

      {/* 作者卡片骨架 */}
      <div className="fuwari-card-base p-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>

      {/* 文章列表骨架 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="fuwari-card-base p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}