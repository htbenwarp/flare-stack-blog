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
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: loaderData?.siteConfig?.title,
        },
        {
          name: "description",
          content: loaderData?.siteConfig?.description,
        },
      ],
      links: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: loaderData?.siteConfig?.icons.faviconSvg,
        },
        {
          rel: "icon",
          type: "image/png",
          href: loaderData?.siteConfig?.icons.favicon96,
          sizes: "96x96",
        },
        {
          rel: "shortcut icon",
          href: loaderData?.siteConfig?.icons.faviconIco,
        },
        {
          rel: "apple-touch-icon",
          type: "image/png",
          href: loaderData?.siteConfig?.icons.appleTouchIcon,
          sizes: "180x180",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "RSS Feed",
          href: "/rss.xml",
        },
        {
          rel: "alternate",
          type: "application/atom+xml",
          title: "Atom Feed",
          href: "/atom.xml",
        },
        {
          rel: "alternate",
          type: "application/feed+json",
          title: "JSON Feed",
          href: "/feed.json",
        },
      ],
      scripts: env.VITE_UMAMI_WEBSITE_ID
        ? [
            {
              src: "/stats.js",
              defer: true,
              "data-website-id": env.VITE_UMAMI_WEBSITE_ID,
            },
          ]
        : [],
    };
  },
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const fontFamily = siteConfig?.fontFamily?.trim();

  // 动态设置全局字体，并为代码块保留等宽字体
  useEffect(() => {
    const styleId = "dynamic-font-override";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    if (fontFamily) {
      // 强制全局字体，但代码块、预格式化文本等使用等宽字体
      styleEl.textContent = `
        * {
          font-family: ${fontFamily} !important;
        }
        pre, code, kbd, samp, tt, var, .code-block, .hljs, .token,
        .prose pre code, .markdown pre code,
        [class*="language-"], .highlight pre, .chroma {
          font-family: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'SF Mono', monospace !important;
        }
      `;

      // 自动加载字体资源（Google Fonts 或 LXGW WenKai）
      const fontNameRaw = fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
      // 如果字体名不包含空格，则可能是 Google Fonts
      if (!fontNameRaw.includes(" ")) {
        // 特殊处理 LXGW WenKai（不在 Google Fonts 上）
        if (fontNameRaw.toLowerCase() === "lxgw wenkai") {
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
          const linkId = `google-font-${fontNameRaw}`;
          if (!document.getElementById(linkId)) {
            const link = document.createElement("link");
            link.id = linkId;
            link.rel = "stylesheet";
            link.href = `https://fonts.googleapis.com/css2?family=${fontNameRaw}:wght@400;500;600;700&display=swap`;
            document.head.appendChild(link);
          }
        }
      }
    } else {
      styleEl.textContent = "";
      // 可选：移除之前添加的字体资源（但没必要）
    }
  }, [fontFamily]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={theme.getDocumentStyle?.(siteConfig)}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
