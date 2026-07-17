import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import theme from "@theme";
import { ThemeProvider } from "@/components/common/theme-provider";
import { siteConfigQuery } from "@/features/config/queries";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import { clientEnv } from "@/lib/env/client.env";
import { getLocale } from "@/paraglide/runtime";
import appCss from "@/styles.css?url";
import { MusicProvider } from "@/features/theme/themes/fuwari/components/music/music-provider";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    const siteConfig = await context.queryClient.ensureQueryData(siteConfigQuery);
    return { siteConfig };
  },
  loader: async ({ context }) => {
    return { siteConfig: context.siteConfig };
  },
  head: ({ loaderData }) => {
    const env = clientEnv();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: loaderData?.siteConfig?.title },
        { name: "description", content: loaderData?.siteConfig?.description },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: loaderData?.siteConfig?.icons.faviconSvg },
        { rel: "icon", type: "image/png", href: loaderData?.siteConfig?.icons.favicon96, sizes: "96x96" },
        { rel: "shortcut icon", href: loaderData?.siteConfig?.icons.faviconIco },
        { rel: "apple-touch-icon", type: "image/png", href: loaderData?.siteConfig?.icons.appleTouchIcon, sizes: "180x180" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "stylesheet", href: appCss },
        { rel: "alternate", type: "application/rss+xml", title: "RSS Feed", href: "/rss.xml" },
        { rel: "alternate", type: "application/atom+xml", title: "Atom Feed", href: "/atom.xml" },
        { rel: "alternate", type: "application/feed+json", title: "JSON Feed", href: "/feed.json" },
      ],
      scripts: env.VITE_UMAMI_WEBSITE_ID
        ? [{ src: "/stats.js", defer: true, "data-website-id": env.VITE_UMAMI_WEBSITE_ID }]
        : [],
    };
  },
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const fontFamily = siteConfig?.fontFamily?.trim();
  const hueLight = siteConfig?.theme?.fuwari?.primaryHue ?? 250;
  const hueDark = siteConfig?.theme?.fuwari?.darkPrimaryHue ?? hueLight;

  // 卡片透明度配置
  const glass = siteConfig?.theme?.default?.glass;
  const glassEnabled = glass?.enabled ?? true;
  const glassOpacity = glass?.opacity ?? 0.85;

  // 🔥 检测暗色模式
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const check = () => {
      // 检查 html 或 body 上的 dark 类
      const isDarkMode = html.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDark(isDarkMode);
    };
    check();

    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // 根据暗色模式计算背景色
  const currentBg = isDark
    ? `hsla(${hueDark}, 30%, 15%, ${glassOpacity})`
    : `hsla(${hueLight}, 30%, 95%, ${glassOpacity})`;

  // 多重字体动态加载
  useEffect(() => {
    if (!fontFamily) {
      document.documentElement.style.removeProperty('--font-body');
      return;
    }

    document.documentElement.style.setProperty('--font-body', fontFamily);

    const parseFontStack = (stack: string): string[] =>
      stack
        .split(',')
        .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
        .filter(name => name.length > 0);

    const getFamilyName = (raw: string): string => raw.split(':')[0].trim();
    const normalize = (name: string): string => name.toLowerCase().replace(/['"]/g, '');

    const skipFonts = new Set([
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
      'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
      'ui-rounded', 'emoji', 'math', 'fangsong',
      'arial', 'helvetica', 'times new roman', 'times', 'courier new',
      'courier', 'verdana', 'georgia', 'tahoma', 'trebuchet ms',
      'comic sans ms', 'impact', 'simsun', 'microsoft yahei',
      'pingfang sc', 'hiragino sans gb', 'menlo', 'monaco',
    ]);

    const shouldSkip = (name: string) => skipFonts.has(normalize(name));
    const encodeFontName = (name: string) => encodeURIComponent(name).replace(/%20/g, '+');

    const fonts = parseFontStack(fontFamily);
    const loadedSet = new Set<string>();
    const googleFontNames: string[] = [];
    let needLXGW = false;

    for (const raw of fonts) {
      const family = getFamilyName(raw);
      const key = normalize(family);
      if (!key || shouldSkip(key)) continue;
      if (loadedSet.has(key)) continue;
      loadedSet.add(key);

      if (key === 'lxgw wenkai') {
        needLXGW = true;
        continue;
      }
      googleFontNames.push(family);
    }

    const addedLinkIds: string[] = [];

    if (needLXGW) {
      const id = 'lxgw-wenkai-font';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css';
        document.head.appendChild(link);
        addedLinkIds.push(id);
      }
    }

    if (googleFontNames.length > 0) {
      const unique = Array.from(new Set(googleFontNames));
      const families = unique.map(name => `family=${encodeFontName(name)}:wght@400;500;600;700`).join('&');
      const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;

      const id = 'google-fonts-dynamic';
      const old = document.getElementById(id);
      if (old) old.remove();

      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      addedLinkIds.push(id);
    }

    return () => {
      for (const id of addedLinkIds) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    };
  }, [fontFamily]);

  const htmlStyle = {
    ...theme.getDocumentStyle?.(siteConfig),
    '--fuwari-hue-light': hueLight,
    '--fuwari-hue-dark': hueDark,
    '--card-bg': currentBg,
  } as React.CSSProperties;

  return (
    <html
      lang={locale}
      className={glassEnabled ? 'card-opacity-enabled' : ''}
      style={htmlStyle}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <MusicProvider>
            {children}
          </MusicProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}