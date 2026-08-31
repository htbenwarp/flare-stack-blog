// src/features/theme/themes/fuwari/pages/guest-house/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function GuestHousePageSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-h-screen bg-(--fuwari-page-bg)">
      {/* 介绍卡片骨架（标题 + 副标题） */}
      <div className="fuwari-card-base p-6 md:p-8 space-y-3">
        <BubbleSkeleton index={0} className="h-8 w-24" />
        <BubbleSkeleton index={1} className="h-4 w-64 max-w-full" />
        <BubbleSkeleton index={2} className="h-4 w-48 max-w-full" />
      </div>

      {/* 作者卡片网格骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fuwari-card-base p-5 flex items-center gap-4">
            <BubbleSkeleton
              index={3 + i * 3}
              isStatic
              className="h-14 w-14 rounded-full shrink-0"
            />
            <div className="flex-1 space-y-2">
              <BubbleSkeleton index={3 + i * 3 + 1} className="h-5 w-32" />
              <BubbleSkeleton index={3 + i * 3 + 2} className="h-3 w-48" />
            </div>
            <BubbleSkeleton
              index={3 + i * 3 + 2}
              className="h-6 w-10"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
