import { asc, eq, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useMemo } from "react";

import { db } from "@/db";
import { packs, stickers } from "@/db/schema";

/** All packs with their sticker count, the first sticker's image path and the four newest sticker paths. */
export function usePacks() {
  const { data, updatedAt } = useLiveQuery(
    db
      .select({
        id: packs.id,
        name: packs.name,
        customCover: packs.coverPath,
        isLocked: packs.isLocked,
        // Table names are written out because Drizzle drops the qualifier from
        // interpolated columns inside a select, which would make the subquery
        // compare `stickers.id` with itself.
        stickerCount: sql<number>`(select count(*) from stickers where stickers.pack_id = packs.id)`,
        coverPath: sql<
          string | null
        >`(select stickers.path from stickers where stickers.pack_id = packs.id order by stickers.position, stickers.id limit 1)`,
        // The four newest stickers, newest first, as a JSON array of image paths.
        recentPaths: sql<string>`(select json_group_array(path) from (select stickers.path from stickers where stickers.pack_id = packs.id order by stickers.id desc limit 4))`,
      })
      .from(packs)
      .orderBy(asc(packs.position), asc(packs.id)),
  );

  const summaries = useMemo(
    () =>
      data.map(({ recentPaths, ...pack }) => ({
        ...pack,
        recentPaths: JSON.parse(recentPaths) as string[],
      })),
    [data],
  );

  return { packs: summaries, isLoading: updatedAt === undefined };
}

export type PackSummary = ReturnType<typeof usePacks>["packs"][number];

/** A single pack and its stickers in pack order. */
export function usePack(id: number) {
  const pack = useLiveQuery(
    db.select().from(packs).where(eq(packs.id, id)).limit(1),
    [id],
  );
  const packStickers = useLiveQuery(
    db
      .select()
      .from(stickers)
      .where(eq(stickers.packId, id))
      .orderBy(asc(stickers.position), asc(stickers.id)),
    [id],
  );

  return {
    pack: pack.data[0],
    stickers: packStickers.data,
    isLoading:
      pack.updatedAt === undefined || packStickers.updatedAt === undefined,
  };
}
