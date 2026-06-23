import { useLocation, useRouteContext } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";
import { BackToTop } from "../components/control/back-to-top";
import { Sidebar } from "../components/sidebar";
import { Footer } from "./footer";
import { MobileMenu } from "./mobile-menu";
import { Navbar } from "./navbar";
import { MusicWidget } from "../components/music/music-widget";
import { MusicPanel } from "../components/music/music-panel";
import { GlobalLyricsBar } from "../components/music/global-lyrics-bar";

const BANNER_HEIGHT_HOME = 65;
const BANNER_HEIGHT_PAGE = 35;
const MAIN_OVERLAP_REM = 3.5;
const NAVBAR_HEIGHT_REM = 4.5;

function preloadImage(src: string | undefined) {
  if (!src) return;
  const img = new Image();
  img.src = src;
}

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isPostPage = location.pathname.startsWith("/post/");
  const bannerHeightVh = isHomePage ? BANNER_HEIGHT_HOME : BANNER_HEIGHT_PAGE;

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const check = () => setIsDark(html.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fuwari = siteConfig?.theme?.fuwari;
  const lightBg = fuwari?.homeBg ?? "";
  const darkBg = fuwari?.darkHomeBg || fuwari?.homeBg || "";

  useEffect(() => {
    if (isDark) {
      preloadImage(lightBg);
    } else {
      preloadImage(darkBg);
    }
  }, [isDark, lightBg, darkBg]);

  const bannerImage = (src: string, visible: boolean, alt: string) => (
    <img
      src={src}
      alt={alt}
      fetchPriority="high"
      className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );

  return (
    <div className="relative min-h-screen bg-(--fuwari-page-bg) transition-colors">
      <MobileMenu
        navOptions={navOptions}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        logout={logout}
      />

      {/* Navbar */}
      <div className="sticky top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto max-w-(--fuwari-page-width) mx-auto px-0 md:px-4">
          <Navbar
            navOptions={navOptions}
            onMenuClick={() => setIsMenuOpen(true)}
            user={user}
            isLoading={isSessionLoading}
            bannerHeightVh={bannerHeightVh}
          />
        </div>
      </div>

      {/* Banner */}
      <div
        className="absolute left-0 right-0 top-0 z-10 overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: `${bannerHeightVh}vh` }}
      >
        {bannerImage(lightBg, !isDark, "banner light")}
        {bannerImage(darkBg, isDark, "banner dark")}
      </div>

      {/* Main content */}
      <div
        className="relative z-30 transition-[margin-top] duration-300 ease-in-out"
        style={{
          marginTop: `calc(${bannerHeightVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem)`,
        }}
      >
        <div
          className="relative mx-auto px-0 md:px-4 pb-8 grid grid-cols-1 lg:grid-cols-[17.5rem_1fr] gap-4"
          style={{ maxWidth: "var(--fuwari-page-width)" }}
        >
          <Sidebar className="order-2 lg:order-1" />
          <main className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
            {children}
          </main>
          <div
            className="order-3 lg:col-start-2 fuwari-onload-animation mt-auto"
            style={{ animationDelay: "250ms" }}
          >
            <Footer navOptions={navOptions} />
          </div>
          {/* 非文章页显示通用 BackToTop，文章页由 page.tsx 自行提供带客邸过滤的版本 */}
          {!isPostPage && <BackToTop />}
        </div>
      </div>

      {/* 音乐播放器悬浮组件 */}
      <MusicWidget onClick={() => setShowMusicPanel(!showMusicPanel)} />
      {showMusicPanel && <MusicPanel onClose={() => setShowMusicPanel(false)} />}

      {/* 全局底部歌词条 */}
      <GlobalLyricsBar />
    </div>
  );
}
