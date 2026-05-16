import { useEffect } from "react";
import { useRouteContext } from "@tanstack/react-router";

export function useFontInjection() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const fontConfig = siteConfig?.theme?.fuwari;

  useEffect(() => {
    if (!fontConfig) return;

    const root = document.documentElement;

    if (fontConfig.fontBody) {
      root.style.setProperty("--font-body", fontConfig.fontBody);
    }
    if (fontConfig.fontHeading) {
      root.style.setProperty("--font-heading", fontConfig.fontHeading);
    }
    if (fontConfig.fontCode) {
      root.style.setProperty("--font-code", fontConfig.fontCode);
    }

    // 加载外部字体
    const linkId = "dynamic-font-link";
    if (fontConfig.fontExternalUrl) {
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = fontConfig.fontExternalUrl;
    } else {
      const existingLink = document.getElementById(linkId);
      if (existingLink) existingLink.remove();
    }
  }, [fontConfig]);
}
