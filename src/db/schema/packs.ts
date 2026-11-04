import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "./timestamps";

export const packs = sqliteTable("packs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  author: text("author"),
  description: text("description"),
  ...timestamps,
});

export type Pack = typeof packs.$inferSelect;
export type NewPack = typeof packs.$inferInsert;
