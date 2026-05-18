import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
import { sha256 } from "@/features/pageview/utils/hash";
import { serverEnv } from "@/lib/env/server.env";
import { dbMiddleware } from "@/lib/middlewares";

export const recordPageViewFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ postId: z.number().int().positive() }))
  .handler(async ({ data, context }) => {
    const ip = getRequestHeader("cf-connecting-ip") || "";
    const ua = getRequestHeader("user-agent") || "";
    const salt = serverEnv(context.env).PAGEVIEW_SALT || "";

    const visitorHash = await sha256(`${ip}:${ua}:${salt}`);

    context.executionCtx.waitUntil(
      context.env.QUEUE.send({
        type: "PAGEVIEW",
        data: { postId: data.postId, visitorHash },
      }),
    );
  });

export const getSiteStatsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    // 临时硬编码，忽略数据库
    return {
      totalPageviews: 9999,
      articleCount: 88,
      totalChars: 123456,
      startDate: blogConfig.startDate,
    };
  });

export const getSiteStatsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PageviewService.getSiteStats(context));
