import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
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

  // 多重字体动态加载（支持完整字体栈）
  useEffect(() => {
    if (!fontFamily) {
      document.documentElement.style.removeProperty('--font-body');
      return;
    }

    // ① 保持完整字体栈，CSS 回退机制不受影响
    document.documentElement.style.setProperty('--font-body', fontFamily);

    // ---------- 工具函数 ----------
    const parseFontStack = (stack: string): string[] =>
      stack
        .split(',')
        .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
        .filter(name => name.length > 0);

    // 提取纯字体族名（去掉冒号后的变体说明，如 Inter:400 -> Inter）
    const getFamilyName = (raw: string): string => raw.split(':')[0].trim();

    const normalize = (name: string): string =>
      name.toLowerCase().replace(/['"]/g, '');

    // 通用族名 + 常见系统字体（无需网络加载）
    const skipFonts = new Set([
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
      'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
      'ui-rounded', 'emoji', 'math', 'fangsong',
      // 常见系统字体
      'arial', 'helvetica', 'times new roman', 'times', 'courier new',
      'courier', 'verdana', 'georgia', 'tahoma', 'trebuchet ms',
      'comic sans ms', 'impact', 'simsun', 'microsoft yahei',
      'pingfang sc', 'hiragino sans gb', 'menlo', 'monaco',
    ]);

    const shouldSkip = (name: string) => skipFonts.has(normalize(name));

    // 安全编码字体名用于 URL
    const encodeFontName = (name: string) =>
      encodeURIComponent(name).replace(/%20/g, '+');

    // ---------- 收集需要加载的字体 ----------
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

      // 其余字体归为 Google Fonts
      googleFontNames.push(family);
    }

    // ---------- 注入 link 并记录 id 以便清理 ----------
    const addedLinkIds: string[] = [];

    // 1) LXGW Wenkai 特殊 CDN
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

    // 2) Google Fonts（合并为单次请求）
    if (googleFontNames.length > 0) {
      const unique = Array.from(new Set(googleFontNames));
      const families = unique
        .map(name => `family=${encodeFontName(name)}:wght@400;500;600;700`)
        .join('&');
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

    // 清理：依赖变化或卸载时移除本次添加的 link
    return () => {
      for (const id of addedLinkIds) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    };
  }, [fontFamily]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={{
        ...theme.getDocumentStyle?.(siteConfig),
        '--fuwari-hue-light': hueLight,
        '--fuwari-hue-dark': hueDark,
      } as React.CSSProperties}
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
