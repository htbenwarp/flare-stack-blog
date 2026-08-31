// src/features/theme/themes/fuwari/pages/friend-links/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function FriendLinksPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 头部横幅（标题 + 副标题 + 申请按钮） */}
      <div className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center">
        <BubbleSkeleton index={0} className="h-9 w-56 mb-4" />
        <BubbleSkeleton index={1} className="h-4 w-80 max-w-full" />
        <BubbleSkeleton index={2} className="h-11 w-32 mt-6" />
      </div>

      {/* 随机一读 */}
      <BubbleSkeleton index={3} className="h-16 w-full" />

      {/* 友链卡片网格 */}
      <div className="fuwari-card-base p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <BubbleSkeleton
              key={i}
              index={4 + i}
              className="h-28 w-full"
            />
          ))}
        </div>
      </div>

      {/* 本站信息卡片 */}
      <BubbleSkeleton index={10} className="h-24 w-full" />
    </div>
  );
}
