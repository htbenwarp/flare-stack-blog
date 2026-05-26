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

  useEffect(() => {
  if (fontFamily) {
    // ① 通过 CSS 变量切换正文字体
    document.documentElement.style.setProperty('--font-body', fontFamily);

    // ② 动态加载所需字体文件（逻辑与之前完全相同）
    if (!fontFamily.includes(',')) {
      const fontName = fontFamily.split(':')[0].trim().replace(/^['"]|['"]$/g, '');
      
      // LXGW Wenkai 特殊处理
      if (fontName.toLowerCase() === 'lxgw wenkai') {
        const linkId = 'lxgw-wenkai-font';
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css';
          document.head.appendChild(link);
        }
      } 
      // 单字字体（可能是 Google Fonts）
      else if (!fontName.includes(' ')) {
        const linkId = `google-font-${fontName}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
          document.head.appendChild(link);
        }
      }
      // 如果用户直接写完整的字体栈（如 "LXGW Wenkai, sans-serif"），不做额外加载
    }
  } else {
    // 恢复默认正文字体
    document.documentElement.style.removeProperty('--font-body');
  }
}, [fontFamily]);

  return (
    <html lang={locale} 
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
        <ThemeProvider>{children}</ThemeProvider>
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
