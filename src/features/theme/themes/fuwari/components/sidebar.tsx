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
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>

      {/* 站点信息 */}
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <Suspense fallback={<TagsSkeleton />}>
          <SiteInfo />
        </Suspense>
      </div>

      {/* 音乐播放器（歌单列表，常驻显示） */}
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "200ms" }}
      >
        <div className="fuwari-card-base p-4">
          <MusicList compact />
        </div>
      </div>

      {/* 标签 */}
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "250ms" }}
      >
        <Tags />
      </div>
    </aside>
  );
}