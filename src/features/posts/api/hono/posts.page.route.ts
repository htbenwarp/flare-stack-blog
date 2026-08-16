import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { GetPublicPostsPageInputSchema } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { getServiceContext, setCacheHeaders } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";

const app = new Hono<{ Bindings: Env }>();
app.use("*", baseMiddleware);

const route = app.get(
  "/page",
  zValidator(
    "query",
    GetPublicPostsPageInputSchema.extend({
      offset: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      excludeIds: z.string().optional(), // "1,2,3"
    }),
  ),
  async (c) => {
    const query = c.req.valid("query");
    const excludeIds = query.excludeIds
      ? query.excludeIds.split(",").map(Number)
      : undefined;

    const result = await PostService.getPublicPostsPage(
      getServiceContext(c),
      {
        offset: query.offset,
        limit: query.limit,
        excludeIds,
      },
    );
    setCacheHeaders(c.res.headers, "public");
    return c.json(result);
  },
);

export default route;