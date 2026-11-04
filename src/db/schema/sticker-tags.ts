import { index, integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";

import { stickers } from "./stickers";
import { tags } from "./tags";

export const stickerTags = sqliteTable(
  "sticker_tags",
  {
    stickerId: integer("sticker_id")
      .notNull()
      .references(() => stickers.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.stickerId, t.tagId] }),
    index("sticker_tags_tag_id_idx").on(t.tagId),
  ],
);
