// src/features/theme/themes/fuwari/pages/guest-house/author-skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function GuestAuthorPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-h-screen bg-(--fuwari-page-bg)">
      <BubbleSkeleton index={0} className="h-4 w-20" />

      {/* 作者卡片骨架 */}
      <div className="fuwari-card-base p-6 flex items-center gap-4">
        <BubbleSkeleton index={1} isStatic className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <BubbleSkeleton index={2} className="h-6 w-40" />
          <BubbleSkeleton index={3} className="h-3 w-56" />
        </div>
        <BubbleSkeleton index={4} className="h-6 w-12" />
      </div>

      {/* 文章列表骨架 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="fuwari-card-base p-6 space-y-2">
            <BubbleSkeleton index={5 + i * 3} className="h-6 w-3/4" />
            <BubbleSkeleton index={5 + i * 3 + 1} className="h-4 w-full" />
            <BubbleSkeleton index={5 + i * 3 + 2} className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
