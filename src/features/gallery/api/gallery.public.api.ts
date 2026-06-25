import { createServerFn } from "@tanstack/react-start";
import { dbMiddleware } from "@/lib/middlewares";
import { GalleryItemsTable } from "@/lib/db/schema";

export const getGalleryItemsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const items = await context.db.query.GalleryItemsTable.findMany({
      with: {
        itemTags: {
          with: { tag: true },
        },
      },
      orderBy: GalleryItemsTable.sortOrder,
    });
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageKey: item.imageKey,
      tags: item.itemTags.map((it) => it.tag).filter(Boolean),
      sortOrder: item.sortOrder,
    }));
  });