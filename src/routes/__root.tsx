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

  // 动态设置全局字体：全覆盖 + 排除代码块和编辑器
  useEffect(() => {
  // 第一步：全局字体覆盖（与旧版完全相同，保证字体显示）
  const globalStyleId = "dynamic-font-global";
  let globalStyle = document.getElementById(globalStyleId) as HTMLStyleElement;
  if (!globalStyle) {
    globalStyle = document.createElement("style");
    globalStyle.id = globalStyleId;
    document.head.appendChild(globalStyle);
  }
  // 设置全局字体内容
  if (fontFamily) {
    globalStyle.textContent = `* { font-family: ${fontFamily} !important; }`;
  } else {
    globalStyle.textContent = "";
  }

  // 第二步：单独处理代码块和编辑器，确保它们使用等宽字体（独立 style，不影响全局）
  const codeStyleId = "dynamic-font-code-override";
  let codeStyle = document.getElementById(codeStyleId) as HTMLStyleElement;
  if (!codeStyle) {
    codeStyle = document.createElement("style");
    codeStyle.id = codeStyleId;
    document.head.appendChild(codeStyle);
  }
  // 只要有 fontFamily 就应用代码块覆盖（防止全局字体覆盖代码块）
  if (fontFamily) {
    codeStyle.textContent = `
      pre, code, kbd, samp, tt,
      .ProseMirror, .ProseMirror *,
      .tiptap-editor, .tiptap-editor * {
        font-family: monospace !important;
      }
    `;
  } else {
    codeStyle.textContent = "";
  }

  // 第三步：字体自动加载（Google Fonts / LXGW WenKai）—— 保持原有逻辑不变
  if (fontFamily && !fontFamily.includes(",")) {
    let fontName = fontFamily.split(":")[0].trim().replace(/^['"]|['"]$/g, "");
    if (fontName.toLowerCase() === "lxgw wenkai") {
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
    } else if (!fontName.includes(" ")) {
      const linkId = `google-font-${fontName}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    }
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
