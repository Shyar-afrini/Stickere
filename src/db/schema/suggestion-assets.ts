import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Photos from the library that were already turned into a sticker or that the
 * user dismissed, so they are not suggested again.
 */
export const suggestionAssets = sqliteTable("suggestion_assets", {
  assetId: text("asset_id").primaryKey(),
  status: text("status", { enum: ["used", "dismissed"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
