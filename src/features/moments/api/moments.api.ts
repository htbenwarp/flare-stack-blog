import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbMiddleware, strictAdminMiddleware } from "@/lib/middlewares";
import * as MomentsData from "@/features/moments/data/moments.data";
import { JsonContentSchema } from "@/features/posts/schema/json-content.schema";

function generateMomentSlug(): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const random = Math.random().toString(36).substring(2, 8);
  return `${dateStr}-${random}`;
}

const CreateMomentInputSchema = z.object({
  content: JsonContentSchema,
  location: z.string().optional(),
  deviceInfo: z
    .object({
      browser: z.string().optional(),
      os: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
  publishedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});

export const createMomentFn = createServerFn({ method: "POST" })
  .middleware([dbMiddleware, strictAdminMiddleware])
  .inputValidator(CreateMomentInputSchema)
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    const meta = {
      location: data.location,
      device: data.deviceInfo,
    };
    const summary = JSON.stringify(meta);

    const slug = generateMomentSlug();
    return await MomentsData.insertMoment(context.db, {
      slug,
      content: data.content,
      summary,
      publishedAt: new Date(data.publishedAt),
      userId,
    });
  });

const GetMomentsInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(50).optional().default(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getMomentsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetMomentsInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsData.getMomentsByCursor(context.db, {
      cursor: data.cursor,
      limit: data.limit,
      date: data.date,
    });
  });

export const getMomentDatesFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const dates = await MomentsData.getMomentDateDistribution(context.db);
    return dates ?? [];
  });

const UpdateMomentInputSchema = z.object({
  id: z.number(),
  content: JsonContentSchema.optional(),
  location: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
});

export const updateMomentFn = createServerFn({ method: "POST" })
  .middleware([dbMiddleware, strictAdminMiddleware])
  .inputValidator(UpdateMomentInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsData.updateMoment(context.db, data.id, {
      content: data.content,
      location: data.location,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
    });
  });

export const deleteMomentFn = createServerFn({ method: "POST" })
  .middleware([dbMiddleware, strictAdminMiddleware])
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data, context }) => {
    return await MomentsData.deleteMoment(context.db, data.id);
  });