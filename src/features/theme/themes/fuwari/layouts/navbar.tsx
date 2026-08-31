import { Link, useRouteContext } from "@tanstack/react-router";
import { Home, Menu, Search, UserIcon, FileText, Users, Link2, MessageSquare, Image, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BubbleSkeleton } from "@/features/theme/themes/fuwari/components/loading/bubble-skeleton";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";
import { LanguageSwitcher } from "./language-switcher";

interface NavbarProps {
  navOptions: Array<NavOption>;
  onMenuClick: () => void;
  isLoading?: boolean;
  user?: UserInfo;
  bannerHeightVh: number;
}

const NAVBAR_HEIGHT_REM = 4.5;
const MAIN_OVERLAP_REM = 3.5;

// 根据导航项的 id 映射到图标（可按需扩展）
const iconMap: Record<string, React.ElementType> = {
  "posts": FileText,
  "guest-house": Users,
  "friend-links": Link2,
  "guestbook": MessageSquare,   
  "gallery": Image,             
  "moments": Zap,
};

export function Navbar({
  onMenuClick,
  user,
  navOptions,
  isLoading,
  bannerHeightVh,
}: NavbarProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const bannerHeightPx = window.innerHeight * (bannerHeightVh / 100);
      const navbarHeightPx = NAVBAR_HEIGHT_REM * 16;
      const mainOverlapPx = MAIN_OVERLAP_REM * 16;
      const extraPaddingPx = 16;

      const threshold =
        bannerHeightPx - navbarHeightPx - mainOverlapPx - extraPaddingPx;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      setIsHidden(scrollTop >= threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [bannerHeightVh]);

  // 过滤掉首页，因为它已经在左侧单独渲染
  const filteredOptions = navOptions.filter(option => option.id !== "home");

  return (
    <div
      id="fuwari-navbar-wrapper"
      className={`z-50 sticky top-0 transition-all duration-300 ease-in-out ${
        isHidden
          ? "-translate-y-16 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div
        id="fuwari-navbar"
        className="fuwari-onload-animation"
        style={{ animationDelay: "0ms" }}
      >
        <div className="fuwari-card-base overflow-visible! rounded-t-none! mx-auto flex items-center justify-between px-4 h-18 max-w-(--fuwari-page-width)">
          {/* 主页图标（始终显示） */}
          <Link
            to="/"
            className="fuwari-expand-animation rounded-lg h-13 px-5 font-bold active:scale-95 flex items-center"
          >
            <Home
              size={28}
              strokeWidth={1.5}
              className="text-(--fuwari-primary) mr-2 shrink-0"
            />
            <span className="text-(--fuwari-primary) text-base">
              {siteConfig.title}
            </span>
          </Link>

          {/* 桌面端图标导航（悬停展开文字） */}
          <nav className="hidden md:flex items-center gap-1">
            {filteredOptions.map((option) => {
              const Icon = iconMap[option.id] || FileText; // 默认图标
              return (
                <Link
                  key={option.id}
                  to={option.to}
                  className="group fuwari-expand-animation rounded-lg h-11 px-3 font-bold active:scale-95 flex items-center overflow-hidden fuwari-text-75 hover:text-(--fuwari-primary)"
                  activeProps={{
                    className:
                      "!text-[var(--fuwari-primary)] group fuwari-expand-animation rounded-lg h-11 px-3 font-bold active:scale-95 flex items-center overflow-hidden",
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} className="shrink-0" />
                  <span className="whitespace-nowrap max-w-0 opacity-0 overflow-hidden transition-all duration-300 ease-out ml-1 group-hover:max-w-32 group-hover:opacity-100 group-hover:ml-2 group-[.active]:max-w-32 group-[.active]:opacity-100 group-[.active]:ml-2">
                    {option.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              to="/search"
              className="hidden lg:flex items-center h-11 mr-2 rounded-lg bg-black/4 hover:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 transition-all active:scale-95 group w-52"
              aria-label={m.nav_search()}
            >
              <Search
                size={18}
                className="ml-3 transition-colors text-black/30 dark:text-white/30 group-hover:text-black/50 dark:group-hover:text-white/50"
                strokeWidth={1.25}
              />
              <span className="ml-2 text-black/50 dark:text-white/50 text-sm bg-transparent outline-none truncate">
                {m.nav_search()}
              </span>
            </Link>
            <Link
              to="/search"
              className="lg:hidden fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary)"
              aria-label={m.nav_search()}
            >
              <Search size={18} strokeWidth={1.25} />
            </Link>
            <ThemeToggle className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) p-0! bg-transparent! [&_svg]:w-4.5! [&_svg]:h-4.5! [&_div]:w-auto! [&_div]:h-auto!" />
            <LanguageSwitcher className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary) p-0! bg-transparent! [&_svg]:w-4.5! [&_svg]:h-4.5!" />
            <div className="hidden md:flex items-center">
              {isLoading ? (
                <BubbleSkeleton index={0} isStatic className="w-9 h-9" />
              ) : user ? (
                <Link
                  to="/profile"
                  className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-8 h-8 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-(--fuwari-btn-regular-bg) flex items-center justify-center">
                      <UserIcon
                        size={18}
                        strokeWidth={1.25}
                        className="fuwari-text-50"
                      />
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="fuwari-expand-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90 fuwari-text-75 hover:text-(--fuwari-primary)"
                  aria-label={m.nav_login()}
                >
                  <UserIcon size={18} strokeWidth={1.25} />
                </Link>
              )}
            </div>
            <button
              className="fuwari-expand-animation rounded-lg w-11 h-11 flex items-center justify-center active:scale-90 md:hidden fuwari-text-75 hover:text-(--fuwari-primary)"
              onClick={onMenuClick}
              aria-label={m.common_open_menu()}
              type="button"
            >
              <Menu size={18} strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}