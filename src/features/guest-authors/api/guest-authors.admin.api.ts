import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as GuestAuthorService from "../services/guest-authors.service";
import { dbMiddleware, adminMiddleware } from "@/lib/middlewares";

export const listGuestAuthorsFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .handler(async ({ context }) => {
    const data = await GuestAuthorService.listGuestAuthors(context);
    return data;
  });

export const createGuestAuthorFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      bio: z.string().optional(),
      avatar: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    return GuestAuthorService.createGuestAuthor(context, data);
  });

export const updateGuestAuthorFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    return GuestAuthorService.updateGuestAuthor(context, data);
  });

export const deleteGuestAuthorFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data, context }) => {
    return GuestAuthorService.deleteGuestAuthor(context, data.id);
  });