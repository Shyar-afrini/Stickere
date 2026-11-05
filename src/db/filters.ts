import { eq, isNull, notInArray, or } from "drizzle-orm";

import { db } from "@/db";
import { packs, stickers } from "@/db/schema";

/** Excludes stickers that belong to a locked pack, for places that show them outside the pack. */
export const inOpenPack = () =>
  or(
    isNull(stickers.packId),
    notInArray(
      stickers.packId,
      db.select({ id: packs.id }).from(packs).where(eq(packs.isLocked, true)),
    ),
  );
