import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { id, createdAt, updatedAt } from "./helper";
import { GalleryItemTagsTable } from "./gallery-items-tags.table";

export const GalleryItemsTable = sqliteTable("gallery_items", {
  id,
  title: text().notNull().default(""),
  description: text().default(""),
  imageKey: text("image_key").notNull(),
  imgWidth: integer("img_width"),
  imgHeight: integer("img_height"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
  updatedAt,
});

export const galleryItemsRelations = relations(GalleryItemsTable, ({ many }) => ({
  itemTags: many(GalleryItemTagsTable),
}));
