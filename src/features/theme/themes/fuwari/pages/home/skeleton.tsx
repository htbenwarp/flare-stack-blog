// src/features/theme/themes/fuwari/pages/home/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function HomePageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* 首页文章卡片列表骨架 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="fuwari-card-base p-5 md:p-6 space-y-3">
          <BubbleSkeleton index={i * 3} className="h-6 w-2/3 max-w-90" />
          <BubbleSkeleton index={i * 3 + 1} className="h-4 w-24" />
          <BubbleSkeleton index={i * 3 + 2} className="h-4 w-full" />
          <BubbleSkeleton index={i * 3 + 2} className="h-4 w-5/6" />
        </div>
      ))}

      {/* 分页骨架 */}
      <div className="fuwari-card-base px-5 py-4 md:px-6 md:py-5 flex justify-center">
        <BubbleSkeleton index={9} className="h-8 w-48" />
      </div>
    </div>
  );
}
