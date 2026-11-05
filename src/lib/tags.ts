import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { stickerTags, tags } from "@/db/schema";

const MAX_TAG_LENGTH = 24;

/** Lowercase, no leading `#`, single spaces: so "#Trip  Erbil" and "trip erbil" are one tag. */
export function normalizeTag(text: string) {
  return text
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

/** Tags of one sticker, alphabetical. */
export function getStickerTags(stickerId: number) {
  return db
    .select({ name: tags.name })
    .from(stickerTags)
    .innerJoin(tags, eq(tags.id, stickerTags.tagId))
    .where(eq(stickerTags.stickerId, stickerId))
    .orderBy(tags.name)
    .all()
    .map((row) => row.name);
}

/** Tags already used on other stickers, most used first, to offer as quick picks. */
export function getPopularTags(limit = 12) {
  return db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(stickerTags, eq(stickerTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(*)`), tags.name)
    .limit(limit)
    .all()
    .map((row) => row.name);
}
