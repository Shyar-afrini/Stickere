import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "./timestamps";

export const packs = sqliteTable("packs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  author: text("author"),
  description: text("description"),
  // Locked packs hide their contents until unlocked with the PIN or Face ID.
  // Order in the packs list; only changes when the user reorders.
  position: integer("position").notNull().default(0),
  isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type Pack = typeof packs.$inferSelect;
export type NewPack = typeof packs.$inferInsert;
