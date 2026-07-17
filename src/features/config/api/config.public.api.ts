import { createServerFn } from "@tanstack/react-start";
import { dbMiddleware } from "@/lib/middlewares";
import * as ConfigService from "@/features/config/service/config.service";

// 公开接口 - 获取站点信息（无需登录）
export const getPublicSiteInfoFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const config = await ConfigService.getSystemConfig({
      db: context.db,
      executionCtx: context.executionCtx,
    });
    // 只返回公开信息
    return {
      siteName: config?.site?.title ?? "",
      siteUrl: config?.site?.url ?? "",
      siteDescription: config?.site?.description ?? "",
      siteAvatar: config?.site?.icons?.appleTouchIcon ?? config?.site?.icons?.faviconSvg ?? "",
      rssUrl: "/rss.xml",
      friendLinkUrl: "/friend-links",
    };
  });