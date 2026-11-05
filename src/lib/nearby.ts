import * as Location from "expo-location";
import { and, between, isNotNull } from "drizzle-orm";

import { inOpenPack } from "@/db/filters";

import { db } from "@/db";
import { stickers, type Sticker } from "@/db/schema";
import { boundingBox, distanceMeters } from "@/lib/geo";

// A sticker counts as nearby inside its own radius, but never tighter than
// this, since GPS fixes indoors are rarely better.
const MIN_NEARBY_METERS = 300;
const SEARCH_METERS = 5000;

export type NearbySticker = Sticker & { distance: number };

/**
 * Stickers tagged close to where the user is now, nearest first. Never asks for
 * permission: returns an empty list when location access wasn't granted.
 */
export async function findNearbyStickers(): Promise<NearbySticker[]> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return [];

  const position =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));
  const here = position.coords;

  const box = boundingBox(here, SEARCH_METERS);
  const candidates = db
    .select()
    .from(stickers)
    .where(
      and(
        inOpenPack(),
        isNotNull(stickers.latitude),
        isNotNull(stickers.longitude),
        between(stickers.latitude, box.minLat, box.maxLat),
        between(stickers.longitude, box.minLon, box.maxLon),
      ),
    )
    .all();

  return candidates
    .map((sticker) => ({
      ...sticker,
      distance: distanceMeters(here, {
        latitude: sticker.latitude!,
        longitude: sticker.longitude!,
      }),
    }))
    .filter(
      (sticker) =>
        sticker.distance <=
        Math.max(sticker.radiusMeters ?? 0, MIN_NEARBY_METERS),
    )
    .sort((a, b) => a.distance - b.distance);
}
