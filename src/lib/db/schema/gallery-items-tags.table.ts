import { sqliteTable, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { GalleryItemsTable } from "./gallery-items.table";
import { TagsTable } from "./posts.table"; 

export const GalleryItemTagsTable = sqliteTable(
  "gallery_item_tags",
  {
    galleryItemId: integer("gallery_item_id")
      .notNull()
      .references(() => GalleryItemsTable.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => TagsTable.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.galleryItemId, table.tagId] })],
);

export const galleryItemTagsRelations = relations(GalleryItemTagsTable, ({ one }) => ({
  galleryItem: one(GalleryItemsTable, {
    fields: [GalleryItemTagsTable.galleryItemId],
    references: [GalleryItemsTable.id],
  }),
  tag: one(TagsTable, {
    fields: [GalleryItemTagsTable.tagId],
    references: [TagsTable.id],
  }),
}));