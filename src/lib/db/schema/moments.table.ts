import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const MomentsTable = sqliteTable("moments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  images: text("images", { mode: "json" }).$type<string[]>(), // R2 keys
  location: text("location"),
  deviceInfo: text("device_info", { mode: "json" }).$type<{
    browser?: string;
    os?: string;
    device?: string;
  }>(),
  publishedAt: integer("published_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(true),
  authorId: integer("author_id").notNull(), // 博主用户ID
});

export const MomentLikesTable = sqliteTable("moment_likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  momentId: integer("moment_id")
    .notNull()
    .references(() => MomentsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // 登录用户ID
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  // 唯一约束防止重复点赞
}, (table) => ({
  uniqueLike: sql`unique(${table.momentId}, ${table.userId})`,
}));