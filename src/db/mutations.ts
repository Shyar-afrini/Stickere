import { eq, inArray, max } from "drizzle-orm";

import { db } from "@/db";
import { packs, stickerTags, stickers, type Sticker } from "@/db/schema";
import type { StickerLocation } from "@/lib/location";
import { deleteStickerImage, saveStickerImage } from "@/lib/sticker-storage";

// Writes are sync (expo-sqlite driver) and explicit about related rows instead
// of relying on foreign key cascades. Every sticker change also touches its
// pack's `updatedAt`: the packs list reads sticker counts and covers through
// subqueries, so this is what makes that live query refresh.

type NewPackInput = {
  name: string;
  author?: string;
  description?: string;
};

export function createPack({ name, author, description }: NewPackInput) {
  return db
    .insert(packs)
    .values({
      name: name.trim(),
      author: author?.trim() || null,
      description: description?.trim() || null,
    })
    .returning()
    .get();
}

type NewStickerInput = {
  packId: number;
  name: string;
  /** Temporary file picked by the user; it is copied into permanent storage. */
  sourceUri: string;
  width: number;
  height: number;
  mimeType: string;
  emojis?: string[];
  location?: StickerLocation;
};

export async function createSticker(input: NewStickerInput) {
  const path = await saveStickerImage(input.sourceUri);

  try {
    return db.transaction((tx) => {
      const last = tx
        .select({ position: max(stickers.position) })
        .from(stickers)
        .where(eq(stickers.packId, input.packId))
        .get();

      const sticker = tx
        .insert(stickers)
        .values({
          packId: input.packId,
          name: input.name.trim(),
          path,
          mimeType: input.mimeType,
          width: input.width,
          height: input.height,
          emojis: input.emojis ?? [],
          isAnimated: input.mimeType === "image/gif",
          position: (last?.position ?? -1) + 1,
          ...input.location,
        })
        .returning()
        .get();

      touchPack(tx, input.packId);
      return sticker;
    });
  } catch (error) {
    deleteStickerImage(path);
    throw error;
  }
}

export function deleteSticker(sticker: Pick<Sticker, "id" | "path" | "packId">) {
  db.transaction((tx) => {
    tx.delete(stickerTags).where(eq(stickerTags.stickerId, sticker.id)).run();
    tx.delete(stickers).where(eq(stickers.id, sticker.id)).run();
    if (sticker.packId !== null) touchPack(tx, sticker.packId);
  });
  deleteStickerImage(sticker.path);
}

/** Deletes a pack together with its stickers and their image files. */
export function deletePack(packId: number) {
  const owned = db
    .select({ id: stickers.id, path: stickers.path })
    .from(stickers)
    .where(eq(stickers.packId, packId))
    .all();
  const ids = owned.map((sticker) => sticker.id);

  db.transaction((tx) => {
    if (ids.length > 0) {
      tx.delete(stickerTags).where(inArray(stickerTags.stickerId, ids)).run();
      tx.delete(stickers).where(inArray(stickers.id, ids)).run();
    }
    tx.delete(packs).where(eq(packs.id, packId)).run();
  });

  for (const sticker of owned) deleteStickerImage(sticker.path);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function touchPack(tx: Tx, packId: number) {
  tx.update(packs).set({ updatedAt: new Date() }).where(eq(packs.id, packId)).run();
}
