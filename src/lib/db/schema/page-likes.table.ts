// page-likes.table.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./helper";

export const PageLikesTable = sqliteTable("page_likes", {
  id,
  path: text().notNull().unique(),
  count: integer().notNull().default(0),
  createdAt,
  updatedAt,
});

export const PageLikesIpTable = sqliteTable("page_likes_ip", {
  id,
  ip: text().notNull(),
  path: text().notNull(),
  createdAt,
});