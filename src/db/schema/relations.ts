import { relations } from "drizzle-orm";

import { packs } from "./packs";
import { stickerTags } from "./sticker-tags";
import { stickers } from "./stickers";
import { tags } from "./tags";

export const packsRelations = relations(packs, ({ many }) => ({
  stickers: many(stickers),
}));

export const stickersRelations = relations(stickers, ({ one, many }) => ({
  pack: one(packs, { fields: [stickers.packId], references: [packs.id] }),
  stickerTags: many(stickerTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  stickerTags: many(stickerTags),
}));

export const stickerTagsRelations = relations(stickerTags, ({ one }) => ({
  sticker: one(stickers, {
    fields: [stickerTags.stickerId],
    references: [stickers.id],
  }),
  tag: one(tags, { fields: [stickerTags.tagId], references: [tags.id] }),
}));
