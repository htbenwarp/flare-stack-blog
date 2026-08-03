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
import { ChaosBackground } from "../components/chaos-background";

const BANNER_HEIGHT_HOME = 65;
const BANNER_HEIGHT_PAGE = 35;
const MAIN_OVERLAP_REM = 3.5;
const NAVBAR_HEIGHT_REM = 4.5;

function preloadImage(src: string | undefined): Promise<void> {
  if (!src) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function preloadImages(sources: (string | undefined)[]) {
  const valid = sources.filter((s): s is string => !!s);
  if (valid.length === 0) return;
  await Promise.all(valid.map(preloadImage));
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
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const check = () => setIsDark(html.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fuwari = siteConfig?.theme?.fuwari;
  const defaultTheme = siteConfig?.theme?.default;
  const lightBg = fuwari?.homeBg ?? "";
  const darkBg = fuwari?.darkHomeBg || fuwari?.homeBg || "";

  const fullscreenEnabled = defaultTheme?.fullscreenEnabled ?? false;
  const fullscreenBg = defaultTheme?.fullscreenBg;
  const lightFullBg = fullscreenBg?.light ?? "";
  const darkFullBg = fullscreenBg?.dark ?? "";
  const isFullscreen = fullscreenEnabled && (lightFullBg || darkFullBg);

  useEffect(() => {
    const imagesToPreload: string[] = [];
    if (lightBg) imagesToPreload.push(lightBg);
    if (darkBg) imagesToPreload.push(darkBg);
    if (lightFullBg) imagesToPreload.push(lightFullBg);
    if (darkFullBg) imagesToPreload.push(darkFullBg);
    
    if (imagesToPreload.length > 0) {
      preloadImages(imagesToPreload).then(() => setBgLoaded(true));
    } else {
      setBgLoaded(true);
    }
  }, [lightBg, darkBg, lightFullBg, darkFullBg]);

  const currentBg = isDark ? darkBg || lightBg : lightBg;
  const currentFullBg = isDark ? darkFullBg || lightFullBg : lightFullBg;

  const marginTop = isFullscreen
    ? "0rem"
    : `calc(${bannerHeightVh}vh - ${MAIN_OVERLAP_REM}rem - ${NAVBAR_HEIGHT_REM}rem)`;

  const bannerImage = (src: string, visible: boolean, alt: string) => (
    <img
      src={src}
      alt={alt}
      fetchPriority="high"
      className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
        visible && bgLoaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );

  return (
    <ChaosBackground>
      {isFullscreen && (
        <div className="fixed inset-0 z-[-2]">
          <img
            src={currentFullBg}
            alt="Fullscreen background"
            className="w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: bgLoaded ? 1 : 0 }}
            fetchPriority="high"
          />
        </div>
      )}

      <div className="relative z-10 min-h-screen transition-colors">
        <MobileMenu
          navOptions={navOptions}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          user={user}
          logout={logout}
        />

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

        {!isFullscreen && (
          <div
            className="absolute left-0 right-0 top-0 z-10 overflow-hidden transition-[height] duration-300 ease-in-out"
            style={{ height: `${bannerHeightVh}vh` }}
          >
            {bannerImage(lightBg, !isDark, "banner light")}
            {bannerImage(darkBg, isDark, "banner dark")}
          </div>
        )}

        <div
          className="relative z-30 transition-[margin-top] duration-300 ease-in-out"
          style={{ marginTop }}
        >
          <div
            className="relative mx-auto px-0 md:px-4 pb-8 grid grid-cols-1 lg:grid-cols-[17.5rem_1fr] gap-4 pt-4 md:pt-6 items-start"
            style={{ maxWidth: "var(--fuwari-page-width)" }}
          >
            <Sidebar className="order-2 lg:order-1 lg:self-stretch" />
            <main className="order-1 lg:order-2 flex flex-col gap-4 min-w-0 relative z-0">
              {children}
            </main>
            <div
              className="order-3 lg:col-start-2 fuwari-onload-animation mt-auto"
              style={{ animationDelay: "250ms" }}
            >
              <Footer navOptions={navOptions} />
            </div>
            {!isPostPage && <BackToTop />}
          </div>
        </div>

        <MusicWidget onClick={() => setShowMusicPanel(!showMusicPanel)} />
        {showMusicPanel && <MusicPanel onClose={() => setShowMusicPanel(false)} />}
        <GlobalLyricsBar />
      </div>
    </ChaosBackground>
  );
}