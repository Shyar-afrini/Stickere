import { eq, inArray, max } from "drizzle-orm";
import { normalizeTag } from "@/lib/tags";

import { db } from "@/db";
import {
  packs,
  stickerTags,
  stickers,
  tags,
  suggestionAssets,
  type Sticker,
} from "@/db/schema";
import { syncGeofences } from "@/lib/geofence";
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
  // New packs go to the end; the order only changes when the user reorders.
  const last = db.select({ position: max(packs.position) }).from(packs).get();

  return db
    .insert(packs)
    .values({
      position: (last?.position ?? -1) + 1,
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
  tags?: string[];
  location?: StickerLocation;
  /** Library photo this sticker was made from, so it is not suggested again. */
  sourceAssetId?: string;
};

export async function createSticker(input: NewStickerInput) {
  const path = await saveStickerImage(input.sourceUri);

  let created: Sticker;
  try {
    created = db.transaction((tx) => {
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

      setStickerTags(tx, sticker.id, input.tags ?? []);
      if (input.sourceAssetId) markAsset(tx, input.sourceAssetId, "used");
      touchPack(tx, input.packId);
      return sticker;
    });
  } catch (error) {
    deleteStickerImage(path);
    throw error;
  }

  if (input.location) void syncGeofences();
  return created;
}

type UpdateStickerInput = {
  id: number;
  packId: number;
  name: string;
  emojis: string[];
  tags: string[];
  location: StickerLocation | null;
  /** Set when the image was edited; replaces the stored file. */
  image?: { sourceUri: string; width: number; height: number; mimeType: string };
};

export async function updateSticker(input: UpdateStickerInput) {
  const current = db.select().from(stickers).where(eq(stickers.id, input.id)).get();
  if (!current) throw new Error("This sticker no longer exists.");

  const path = input.image ? await saveStickerImage(input.image.sourceUri) : current.path;

  try {
    db.transaction((tx) => {
      let position = current.position;
      if (input.packId !== current.packId) {
        const last = tx
          .select({ position: max(stickers.position) })
          .from(stickers)
          .where(eq(stickers.packId, input.packId))
          .get();
        position = (last?.position ?? -1) + 1;
      }

      tx.update(stickers)
        .set({
          packId: input.packId,
          name: input.name.trim(),
          emojis: input.emojis,
          path,
          position,
          ...(input.image && {
            mimeType: input.image.mimeType,
            width: input.image.width,
            height: input.image.height,
            isAnimated: input.image.mimeType === "image/gif",
          }),
          latitude: input.location?.latitude ?? null,
          longitude: input.location?.longitude ?? null,
          radiusMeters: input.location?.radiusMeters ?? null,
          placeName: input.location?.placeName ?? null,
          locality: input.location?.locality ?? null,
          country: input.location?.country ?? null,
        })
        .where(eq(stickers.id, input.id))
        .run();

      setStickerTags(tx, input.id, input.tags);
      touchPack(tx, input.packId);
      if (current.packId !== null && current.packId !== input.packId) {
        touchPack(tx, current.packId);
      }
    });
  } catch (error) {
    if (input.image) deleteStickerImage(path);
    throw error;
  }

  if (input.image) deleteStickerImage(current.path);
  void syncGeofences();
}

/** Saves a new pack order: `ids` lists every pack, first to last. */
export function reorderPacks(ids: number[]) {
  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(packs).set({ position }).where(eq(packs.id, id)).run();
    });
  });
}

/** Saves a new sticker order inside a pack (the first sticker is the pack's cover). */
export function reorderStickers(packId: number, ids: number[]) {
  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(stickers).set({ position }).where(eq(stickers.id, id)).run();
    });
    touchPack(tx, packId);
  });
}

export function setPackLocked(packId: number, locked: boolean) {
  db.update(packs)
    .set({ isLocked: locked, updatedAt: new Date() })
    .where(eq(packs.id, packId))
    .run();
  // Locked packs are left out of the arrival reminders.
  void syncGeofences();
}

export function deleteSticker(
  sticker: Pick<Sticker, "id" | "path" | "packId">,
) {
  db.transaction((tx) => {
    tx.delete(stickerTags).where(eq(stickerTags.stickerId, sticker.id)).run();
    tx.delete(stickers).where(eq(stickers.id, sticker.id)).run();
    if (sticker.packId !== null) touchPack(tx, sticker.packId);
  });
  deleteStickerImage(sticker.path);
  void syncGeofences();
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
  void syncGeofences();
}

/** Hides a library photo from future suggestions. */
export function dismissAsset(assetId: string) {
  markAsset(db, assetId, "dismissed");
}

function markAsset(
  executor: Pick<typeof db, "insert">,
  assetId: string,
  status: "used" | "dismissed",
) {
  executor
    .insert(suggestionAssets)
    .values({ assetId, status })
    .onConflictDoUpdate({ target: suggestionAssets.assetId, set: { status } })
    .run();
}

/** Replaces a sticker's tags; tags are shared, so unknown names are created first. */
function setStickerTags(tx: Tx, stickerId: number, names: string[]) {
  const wanted = [...new Set(names.map(normalizeTag).filter(Boolean))];

  tx.delete(stickerTags).where(eq(stickerTags.stickerId, stickerId)).run();
  if (wanted.length === 0) return;

  tx.insert(tags)
    .values(wanted.map((name) => ({ name })))
    .onConflictDoNothing()
    .run();
  const rows = tx.select({ id: tags.id }).from(tags).where(inArray(tags.name, wanted)).all();
  tx.insert(stickerTags)
    .values(rows.map((row) => ({ stickerId, tagId: row.id })))
    .run();
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function touchPack(tx: Tx, packId: number) {
  tx.update(packs)
    .set({ updatedAt: new Date() })
    .where(eq(packs.id, packId))
    .run();
}
