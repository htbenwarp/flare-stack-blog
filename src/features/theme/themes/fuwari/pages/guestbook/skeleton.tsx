// src/features/theme/themes/fuwari/pages/guestbook/skeleton.tsx
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";

export function GuestbookPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-(--fuwari-page-width) mx-auto">
      {/* 介绍卡片：标题 + 正文 + 点赞 */}
      <div className="fuwari-card-base p-10 md:p-10 space-y-4">
        <BubbleSkeleton index={0} className="h-8 w-1/2 max-w-2xl" />
        <BubbleSkeleton index={1} className="h-4 w-full" />
        <BubbleSkeleton index={2} className="h-4 w-full" />
        <BubbleSkeleton index={3} className="h-4 w-5/6" />
        <div className="flex justify-center pt-4">
          <BubbleSkeleton index={4} className="h-9 w-36" />
        </div>
      </div>

      {/* 评论区 */}
      <div className="fuwari-card-base p-6 space-y-3">
        <BubbleSkeleton index={5} className="h-7 w-24" />
        <BubbleSkeleton index={6} className="h-24 w-full" />
        <div className="space-y-4 pt-2">
          {[1, 2].map((i) => (
            <div key={i} className="py-4 flex gap-4 border-b border-black/5 dark:border-white/5">
              <BubbleSkeleton index={7 + i * 3} isStatic className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <BubbleSkeleton index={7 + i * 3 + 1} className="h-4 w-20" />
                <BubbleSkeleton index={7 + i * 3 + 2} className="h-3.5 w-full" />
                <BubbleSkeleton index={7 + i * 3 + 2} className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
