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
    const siteConfig =
      await context.queryClient.ensureQueryData(siteConfigQuery);
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

  useEffect(() => {
    const styleId = "dynamic-font-override";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    if (fontFamily) {
      // 1. 只对正文区域和通用文本元素设置字体，避免影响代码块
      //   选择器覆盖：body, main, article, .content, .markdown-body, .prose, p, h1-h6, li, a 等
      //   你可以根据实际主题调整，但保留代码块选择器单独定义
      styleEl.textContent = `
        body, main, article, .content, .markdown-body, .prose, p, h1, h2, h3, h4, h5, h6, li, a, span, div:not(.no-font) {
          font-family: ${fontFamily} !important;
        }
        /* 强制代码块恢复等宽字体 */
        pre, code, kbd, samp, tt, var, .code-block, .hljs, .token,
        .prose pre code, .markdown pre code, [class*="language-"],
        .highlight pre, .chroma, .line-numbers, .linenumber {
          font-family: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'SF Mono', monospace !important;
        }
      `;

      // 2. 字体资源自动加载
      const firstFont = fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
      if (!firstFont.includes(" ")) {
        // LXGW WenKai 特殊处理
        if (firstFont.toLowerCase() === "lxgw wenkai") {
          const fontFaceId = "lxgw-wenkai-font-face";
          if (!document.getElementById(fontFaceId)) {
            const fontStyle = document.createElement("style");
            fontStyle.id = fontFaceId;
            fontStyle.textContent = `
              @font-face {
                font-family: 'LXGW WenKai';
                src: url('https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/lxgwwenkairegular.woff2') format('woff2');
                font-weight: 400;
                font-style: normal;
                font-display: swap;
              }
              @font-face {
                font-family: 'LXGW WenKai';
                src: url('https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/lxgwwenkai-bold.woff2') format('woff2');
                font-weight: 700;
                font-style: normal;
                font-display: swap;
              }
            `;
            document.head.appendChild(fontStyle);
          }
        } else {
          // Google Fonts
          const linkId = `google-font-${firstFont}`;
          if (!document.getElementById(linkId)) {
            const link = document.createElement("link");
            link.id = linkId;
            link.rel = "stylesheet";
            link.href = `https://fonts.googleapis.com/css2?family=${firstFont}:wght@400;500;600;700&display=swap`;
            document.head.appendChild(link);
          }
        }
      }
    } else {
      styleEl.textContent = "";
    }
  }, [fontFamily]);

  return (
    <html lang={locale} suppressHydrationWarning style={theme.getDocumentStyle?.(siteConfig)}>
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
