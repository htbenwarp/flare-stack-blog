import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { dbMiddleware, adminMiddleware } from "@/lib/middlewares";
import { GalleryItemsTable, GalleryItemTagsTable, TagsTable } from "@/lib/db/schema";
import { err, ok } from "@/lib/errors";

// 辅助函数：替换标签
async function setGalleryItemTags(db: DB, itemId: number, tagIds: number[]) {
  await db.delete(GalleryItemTagsTable).where(eq(GalleryItemTagsTable.galleryItemId, itemId));
  if (tagIds.length > 0) {
    await db.insert(GalleryItemTagsTable).values(
      tagIds.map(tagId => ({ galleryItemId: itemId, tagId }))
    );
  }
}

// 输入校验（标签改为 tagIds 数组）
const GalleryItemInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  imageKey: z.string().min(1),
  tagIds: z.array(z.number()).optional(),
  sortOrder: z.number().int().optional(),
});

// 查询列表（预加载标签）
export const listGalleryItemsFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .handler(async ({ context }) => {
    const items = await context.db.query.GalleryItemsTable.findMany({
      with: {
        itemTags: {
          with: { tag: true },
        },
      },
      orderBy: GalleryItemsTable.sortOrder,
    });
    return ok(items.map(item => ({
      ...item,
      tags: item.itemTags.map(it => it.tag).filter(Boolean),
    })));
  });

// 创建项目（含标签）
export const createGalleryItemFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(GalleryItemInputSchema)
  .handler(async ({ data, context }) => {
    const [item] = await context.db
      .insert(GalleryItemsTable)
      .values({
        title: data.title || "",
        description: data.description || "",
        imageKey: data.imageKey,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    if (data.tagIds && data.tagIds.length > 0) {
      await setGalleryItemTags(context.db, item.id, data.tagIds);
    }
    return ok(item);
  });

// 更新项目（含标签）
export const updateGalleryItemFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(z.object({ id: z.number(), data: GalleryItemInputSchema.partial() }))
  .handler(async ({ data, context }) => {
    const { id, data: updateData } = data;
    const { tagIds, ...fields } = updateData;
    await context.db.update(GalleryItemsTable).set(fields).where(eq(GalleryItemsTable.id, id));
    if (tagIds !== undefined) {
      await setGalleryItemTags(context.db, id, tagIds);
    }
    const [item] = await context.db
      .select()
      .from(GalleryItemsTable)
      .where(eq(GalleryItemsTable.id, id))
      .all();
    if (!item) return err({ reason: "ITEM_NOT_FOUND" });
    return ok(item);
  });

// 删除项目（级联删除标签关联）
export const deleteGalleryItemFn = createServerFn()
  .middleware([dbMiddleware, adminMiddleware])
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data, context }) => {
    await context.db.delete(GalleryItemsTable).where(eq(GalleryItemsTable.id, data.id));
    return ok({ success: true });
  });