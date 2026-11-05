import * as Location from "expo-location";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

import { clusterPhotos, type LocatedPhoto } from "@/lib/trip-clusters";
import type { StickerLocation } from "@/lib/location";

const RECENT_PHOTO_COUNT = 300;
const MAX_TRIPS = 6;
const LOCATION_CONCURRENCY = 8;

export type TripPhoto = LocatedPhoto & {
  uri: string;
  width: number;
  height: number;
  name: string;
};

export type SuggestedTrip = {
  key: string;
  label: string;
  newest: number;
  oldest: number;
  location: StickerLocation;
  photos: TripPhoto[];
};

export type PhotoAccess = "granted" | "limited" | "denied";

export async function getPhotoAccess(request = false): Promise<PhotoAccess> {
  const permission = request
    ? await MediaLibrary.requestPermissionsAsync()
    : await MediaLibrary.getPermissionsAsync();
  if (!permission.granted) return "denied";
  return permission.accessPrivileges === "limited" ? "limited" : "granted";
}

/** Lets the user change which photos the app can see (limited access only). */
export function editLimitedAccess() {
  return MediaLibrary.presentPermissionsPicker();
}

/** Runs `task` over `items` with at most `limit` running at once. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

async function describeTrip(latitude: number, longitude: number) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return {
      placeName: place?.name ?? place?.street ?? null,
      locality: place?.city ?? place?.subregion ?? null,
      country: place?.country ?? null,
    };
  } catch {
    return { placeName: null, locality: null, country: null };
  }
}

/**
 * Reads the most recent photos, keeps the ones with a GPS position, and groups
 * them into trips. Newest photos and newest trips come first.
 *
 * @param excluded asset ids that were already used or dismissed
 */
export async function loadTripSuggestions(
  excluded: Set<string>,
): Promise<SuggestedTrip[]> {
  const assets = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
    .limit(RECENT_PHOTO_COUNT)
    .exe();

  const located = await mapLimit(
    assets.filter((asset) => !excluded.has(asset.id)),
    LOCATION_CONCURRENCY,
    async (asset) => {
      const [position, time] = await Promise.all([
        asset.getLocation(),
        asset.getCreationTime(),
      ]);
      if (!position || time === null) return null;
      return { asset, id: asset.id, time, ...position };
    },
  );

  const trips = clusterPhotos(located.filter((photo) => photo !== null)).slice(
    0,
    MAX_TRIPS,
  );

  const result: SuggestedTrip[] = [];
  for (const trip of trips) {
    const photos = await Promise.all(
      trip.photos.map(
        async ({
          asset,
          id,
          time,
          latitude,
          longitude,
        }): Promise<TripPhoto> => {
          const [uri, width, height, name] = await Promise.all([
            asset.getUri(),
            asset.getWidth(),
            asset.getHeight(),
            asset.getFilename(),
          ]);
          return { id, time, latitude, longitude, uri, width, height, name };
        },
      ),
    );

    const place = await describeTrip(trip.latitude, trip.longitude);
    const label =
      [place.locality ?? place.placeName, place.country]
        .filter(Boolean)
        .join(", ") || "Unknown place";

    result.push({
      key: photos[0].id,
      label,
      newest: trip.newest,
      oldest: trip.oldest,
      location: {
        latitude: trip.latitude,
        longitude: trip.longitude,
        radiusMeters: 500,
        ...place,
      },
      photos,
    });
  }
  return result;
}

/**
 * The sticker maker reads plain files, but library URIs can be `content://`
 * (Android) or live outside the app. Copies those into the cache directory.
 */
export async function toLocalFile(uri: string, name: string): Promise<string> {
  if (uri.startsWith("file://")) return uri;

  const target = new File(Paths.cache, `library-${Date.now()}-${name}`);
  await new File(uri).copy(target);
  return target.uri;
}
