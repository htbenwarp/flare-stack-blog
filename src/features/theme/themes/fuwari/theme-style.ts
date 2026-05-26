import type { CSSProperties } from "react";
import type { SiteConfig } from "@/features/config/site-config.schema";

export function getFuwariThemeStyle(siteConfig: SiteConfig | undefined): CSSProperties {
  if (!siteConfig?.theme?.fuwari) {
    return {} as CSSProperties;
  }
  
  const lightHue = siteConfig.theme.fuwari.primaryHue ?? 250;
  const darkHue = siteConfig.theme.fuwari.darkPrimaryHue ?? lightHue;

  return {
    "--fuwari-hue-light": String(lightHue),
    "--fuwari-hue-dark": String(darkHue),
  } as CSSProperties;
}