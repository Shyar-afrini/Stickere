import { asc, eq, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "@/db";
import { packs, stickers } from "@/db/schema";

/** All packs with their sticker count and the image path of the first sticker. */
export function usePacks() {
  const { data, updatedAt } = useLiveQuery(
    db
      .select({
        id: packs.id,
        name: packs.name,
        isLocked: packs.isLocked,
        // Table names are written out because Drizzle drops the qualifier from
        // interpolated columns inside a select, which would make the subquery
        // compare `stickers.id` with itself.
        stickerCount: sql<number>`(select count(*) from stickers where stickers.pack_id = packs.id)`,
        coverPath: sql<
          string | null
        >`(select stickers.path from stickers where stickers.pack_id = packs.id order by stickers.position, stickers.id limit 1)`,
      })
      .from(packs)
      .orderBy(asc(packs.position), asc(packs.id)),
  );

  return { packs: data, isLoading: updatedAt === undefined };
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
