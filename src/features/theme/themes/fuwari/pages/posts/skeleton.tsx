// src/features/theme/themes/fuwari/pages/posts/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function PostsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* 归档时间轴骨架 */}
      <div className="fuwari-card-base p-6 md:p-8">
        <BubbleSkeleton index={0} className="h-6 w-32 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fuwari-timeline-dash flex items-center gap-3 py-3">
            <BubbleSkeleton index={1 + i * 2} isStatic className="h-2 w-2 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <BubbleSkeleton index={1 + i * 2} className="h-5 w-3/4 max-w-96" />
              <BubbleSkeleton index={2 + i * 2} className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
