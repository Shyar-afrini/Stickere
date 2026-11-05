import type { useRouter } from "expo-router";

import { pickImage } from "@/lib/pick-image";

/**
 * Opens the photo picker first; the editing tools appear once a photo is chosen,
 * and "Next" there leads to the details. GIFs go straight to the details. Without a `packId` the editor lets the user choose the pack.
 */
export async function startNewSticker(router: ReturnType<typeof useRouter>, packId?: number) {
  const picked = await pickImage();
  if (!picked) return;

  // The editing canvas draws a single frame, so a GIF skips it and keeps its animation.
  const pathname =
    picked.mimeType === "image/gif" ? "/(pages)/(packs)/new-sticker" : "/(pages)/(packs)/edit-image";

  router.push({
    pathname,
    params: {
      ...(packId !== undefined && { packId }),
      uri: picked.uri,
      width: picked.width,
      height: picked.height,
      mimeType: picked.mimeType,
      name: picked.name ?? "Sticker",
      // The place the photo was taken, so the sticker remembers it.
      ...(picked.location && {
        latitude: picked.location.latitude,
        longitude: picked.location.longitude,
        radiusMeters: picked.location.radiusMeters,
        placeName: picked.location.placeName ?? "",
        locality: picked.location.locality ?? "",
        country: picked.location.country ?? "",
      }),
    },
  });
}
