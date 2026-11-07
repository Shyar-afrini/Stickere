import { and, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import { inOpenPack } from "@/db/filters";
import { stickerTags, stickers, tags, type Sticker } from "@/db/schema";
import { shortPlace } from "@/lib/location";

export type Ranked = { label: string; count: number };

/** The year in stickers, shown slide by slide in the Rewind story. */
export type Rewind = {
  year: number;
  total: number;
  packCount: number;
  /** Stickers with a caption or story written for them. */
  storyCount: number;
  topPlaces: Ranked[];
  topEmojis: Ranked[];
  topTags: Ranked[];
  busiestMonth: { name: string; count: number } | null;
  /** Number of different days a sticker was made on. */
  activeDays: number;
  /** Newest first. */
  recent: Sticker[];
  /** A sticker with a story, newest first, for the "memory" slide. */
  featured: Sticker | null;
};

const ranked = (counts: Map<string, number>, limit: number): Ranked[] =>
  [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);

const bump = (counts: Map<string, number>, key: string) =>
  counts.set(key, (counts.get(key) ?? 0) + 1);

/** Stickers made in `year` (outside locked packs), summed up. */
export function computeRewind(year: number): Rewind {
  const list = db
    .select()
    .from(stickers)
    .where(
      and(
        inOpenPack(),
        gte(stickers.createdAt, new Date(year, 0, 1)),
        lt(stickers.createdAt, new Date(year + 1, 0, 1)),
      ),
    )
    .all()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const places = new Map<string, number>();
  const emojis = new Map<string, number>();
  const months = new Array<number>(12).fill(0);
  const days = new Set<string>();
  const packIds = new Set<number>();

  for (const sticker of list) {
    const place = shortPlace(sticker.locality, sticker.placeName);
    if (place) bump(places, place);
    for (const emoji of sticker.emojis) bump(emojis, emoji);
    months[sticker.createdAt.getMonth()] += 1;
    days.add(sticker.createdAt.toDateString());
    if (sticker.packId !== null) packIds.add(sticker.packId);
  }

  const tagCounts = new Map<string, number>();
  if (list.length > 0) {
    const rows = db
      .select({ name: tags.name })
      .from(stickerTags)
      .innerJoin(tags, eq(tags.id, stickerTags.tagId))
      .where(
        inArray(
          stickerTags.stickerId,
          list.map((sticker) => sticker.id),
        ),
      )
      .all();
    for (const row of rows) bump(tagCounts, row.name);
  }

  const best = months.reduce(
    (top, count, month) => (count > months[top] ? month : top),
    0,
  );

  return {
    year,
    total: list.length,
    packCount: packIds.size,
    storyCount: list.filter((sticker) => sticker.story).length,
    topPlaces: ranked(places, 3),
    topEmojis: ranked(emojis, 5),
    topTags: ranked(tagCounts, 5),
    busiestMonth:
      months[best] > 0
        ? {
            name: new Date(year, best, 1).toLocaleDateString(undefined, {
              month: "long",
            }),
            count: months[best],
          }
        : null,
    activeDays: days.size,
    recent: list.slice(0, 10),
    featured: list.find((sticker) => sticker.story) ?? null,
  };
}
