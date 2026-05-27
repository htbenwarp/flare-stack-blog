import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";
import { SiteInfo } from "./site-info";
import { MusicList } from "../components/music/music-list";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      {/* 个人信息 */}
      <div className="fuwari-onload-animation" style={{ animationDelay: "100ms" }}>
        <Profile />
      </div>

      {/* 站点信息 */}
      <div className="fuwari-onload-animation" style={{ animationDelay: "150ms" }}>
        <Suspense fallback={<TagsSkeleton />}>
          <SiteInfo />
        </Suspense>
      </div>

      {/* 音乐播放器 - 移除 sticky 和额外卡片包装 */}
      <div className="fuwari-onload-animation" style={{ animationDelay: "200ms" }}>
        <MusicList compact />
      </div>

      {/* 标签 - 保持 sticky */}
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "250ms" }}
      >
        <Tags />
      </div>
    </aside>
  );
}
