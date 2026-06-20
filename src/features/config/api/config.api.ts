import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseSiteAssetUploadInput } from "@/features/config/config.asset.schema";
import { SystemConfigSchema } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { strictAdminMiddleware } from "@/lib/middlewares"; // 仅博主可用
import { m } from "@/paraglide/messages";

// 获取系统配置（仅博主）
export const getSystemConfigFn = createServerFn()
  .middleware([strictAdminMiddleware])
  .handler(({ context }) => ConfigService.getSystemConfig(context));

// 更新系统配置（仅博主）
export const updateSystemConfigFn = createServerFn({
  method: "POST",
})
  .middleware([strictAdminMiddleware])
  .inputValidator(SystemConfigSchema)
  .handler(({ context, data }) =>
    ConfigService.updateSystemConfig(context, data),
  );

// 上传站点资源（仅博主）
const SiteAssetUploadInputSchema = z.instanceof(FormData);
export const uploadSiteAssetFn = createServerFn({
  method: "POST",
})
  .middleware([strictAdminMiddleware])
  .inputValidator(SiteAssetUploadInputSchema)
  .handler(async ({ data, context }) => {
    const input = parseSiteAssetUploadInput(data, m);
    return ConfigService.uploadSiteAsset(context, input);
  });