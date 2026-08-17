// src/features/gallery/api/gallery.public.api.ts
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { dbMiddleware } from "@/lib/middlewares";
import { GalleryItemsTable, MediaTable, GalleryItemTagsTable, TagsTable } from "@/lib/db/schema";

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
    
    // 获取标签
    const itemsWithTags = await Promise.all(
      items.map(async (item) => {
        const itemTags = await context.db
          .select({
            tagId: TagsTable.id,
            tagName: TagsTable.name,
          })
          .from(GalleryItemTagsTable)
          .innerJoin(TagsTable, eq(GalleryItemTagsTable.tagId, TagsTable.id))
          .where(eq(GalleryItemTagsTable.galleryItemId, item.id));
        
        return {
          ...item,
          tags: itemTags.map(it => ({ 
            id: it.tagId, 
            name: it.tagName 
          })),
        };
      })
    );
    
    return itemsWithTags;
  });
