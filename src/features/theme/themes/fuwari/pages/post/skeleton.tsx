// src/features/theme/themes/fuwari/pages/post/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function PostPageSkeleton() {
  return (
    <div className="relative flex flex-col gap-4 mb-4 w-full">
      {/* 文章主体卡片骨架 */}
      <div className="fuwari-card-base p-6 md:p-9 space-y-4">
        {/* 标题 */}
        <BubbleSkeleton index={0} className="h-8 w-3/4 max-w-2xl" />
        {/* meta */}
        <BubbleSkeleton index={1} className="h-4 w-56 max-w-full" />
        {/* 正文段落 */}
        <div className="space-y-2 pt-4">
          <BubbleSkeleton index={2} className="h-4 w-full" />
          <BubbleSkeleton index={3} className="h-4 w-full" />
          <BubbleSkeleton index={4} className="h-4 w-5/6" />
          <BubbleSkeleton index={5} className="h-4 w-full" />
          <BubbleSkeleton index={6} className="h-4 w-2/3" />
        </div>
      </div>

      {/* 评论骨架 */}
      <div className="fuwari-card-base p-6 space-y-3">
        <BubbleSkeleton index={7} className="h-5 w-24" />
        <BubbleSkeleton index={8} className="h-20 w-full" />
      </div>
    </div>
  );
}
