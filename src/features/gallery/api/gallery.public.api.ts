// src/features/gallery/api/gallery.public.api.ts
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { dbMiddleware } from "@/lib/middlewares";
import { GalleryItemsTable, MediaTable } from "@/lib/db/schema";

export const getGalleryItemsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const items = await context.db
      .select({
        id: GalleryItemsTable.id,
        title: GalleryItemsTable.title,
        description: GalleryItemsTable.description,
        imageKey: GalleryItemsTable.imageKey,
        sortOrder: GalleryItemsTable.sortOrder,
        imgWidth: MediaTable.width,
        imgHeight: MediaTable.height,
      })
      .from(GalleryItemsTable)
      .leftJoin(MediaTable, eq(GalleryItemsTable.imageKey, MediaTable.key))
      .orderBy(GalleryItemsTable.sortOrder);
    
    const itemsWithTags = await Promise.all(
      items.map(async (item) => {
        const itemTags = await context.db.query.GalleryItemTagsTable.findMany({
          where: eq(GalleryItemTagsTable.galleryItemId, item.id),
          with: { tag: true },
        });
        
        return {
          ...item,
          tags: itemTags.map(it => it.tag).filter(Boolean),
        };
      })
    );
    
    return itemsWithTags;
  });
