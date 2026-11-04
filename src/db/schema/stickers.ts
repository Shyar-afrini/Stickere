import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { packs } from "./packs";
import { timestamps } from "./timestamps";

export const stickers = sqliteTable(
  "stickers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // A sticker can live outside any pack; deleting a pack keeps its stickers.
    packId: integer("pack_id").references(() => packs.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    // Path of the image relative to the app's document directory (for example
    // `stickers/abc.webp`). Resolve it with `getStickerUri`; never store the
    // absolute URI, because the app container path can change between updates.
    path: text("path").notNull(),
    mimeType: text("mime_type").notNull().default("image/webp"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    isAnimated: integer("is_animated", { mode: "boolean" })
      .notNull()
      .default(false),
    // Emojis the sticker is associated with, stored as a JSON array.
    emojis: text("emojis", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    // Order of the sticker inside its pack.
    position: integer("position").notNull().default(0),
    // Where the sticker belongs. All location fields are null for stickers
    // that are not tied to a place.
    latitude: real("latitude"),
    longitude: real("longitude"),
    // Radius in meters around the point in which the sticker applies.
    radiusMeters: real("radius_meters"),
    placeName: text("place_name"),
    locality: text("locality"),
    country: text("country"),
    ...timestamps,
  },
  (t) => [
    index("stickers_pack_id_position_idx").on(t.packId, t.position),
    index("stickers_is_favorite_idx").on(t.isFavorite),
    index("stickers_location_idx").on(t.latitude, t.longitude),
  ],
);

export type Sticker = typeof stickers.$inferSelect;
export type NewSticker = typeof stickers.$inferInsert;
