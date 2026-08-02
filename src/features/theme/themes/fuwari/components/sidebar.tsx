// src/features/theme/themes/fuwari/components/sidebar.tsx
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";
import { SiteInfo } from "./site-info";
import { MusicList } from "../components/music/music-list";
import { MomentCalendar } from "../components/moments/moment-calendar";

function getDateParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("date");
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = useRouterState().location.pathname;
  const isMomentsPage = pathname === "/moments";
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string | null>(getDateParam);

  // 监听浏览器前进/后退
  useEffect(() => {
    const onPopState = () => setSelectedDate(getDateParam());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleDateChange = useCallback(
    (newDate: string | null) => {
      setSelectedDate(newDate);
      if (!isMomentsPage) return;

      // 构建正确的搜索参数对象
      navigate({
        search: newDate ? { date: newDate } : {},
        replace: true,
      });
    },
    [isMomentsPage, navigate]
  );

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

      {/* 音乐播放器 */}
      <div className="fuwari-onload-animation" style={{ animationDelay: "200ms" }}>
        <MusicList compact />
      </div>

      {/* 标签 or 日历 */}
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{ animationDelay: "250ms" }}
      >
        {isMomentsPage ? (
          <MomentCalendar selectedDate={selectedDate} onDateChange={handleDateChange} />
        ) : (
          <Suspense fallback={<TagsSkeleton />}>
            <Tags />
          </Suspense>
        )}
      </div>
    </aside>
  );
}