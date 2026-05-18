import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";
import { SiteInfo } from "./site-info";

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

      {/* 标签 */}
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <Suspense fallback={<TagsSkeleton />}>
          <Tags />
        </Suspense>
      </div>

      {/* 站点信息 */}
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "200ms" }}
      >
        <SiteInfo />
      </div>
    </aside>
  );
}
