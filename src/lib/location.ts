import * as Location from "expo-location";

export type StickerLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  placeName: string | null;
  locality: string | null;
  country: string | null;
};

// Default area around the captured point in which the sticker applies.
const DEFAULT_RADIUS_METERS = 100;

export type LocationResult =
  | { status: "granted"; location: StickerLocation }
  | { status: "denied" };

/** Reads the current position and resolves a readable place name for it. */
export async function getCurrentStickerLocation(): Promise<LocationResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { status: "denied" };
  }

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    status: "granted",
    location: await describePoint(coords.latitude, coords.longitude),
  };
}

/** Resolves a readable place name for a point, e.g. the one stored in a photo. */
export async function describePoint(
  latitude: number,
  longitude: number,
): Promise<StickerLocation> {
  let place: Location.LocationGeocodedAddress | undefined;
  try {
    [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  } catch {
    // Reverse geocoding needs network access; the coordinates alone are enough.
  }

  return {
    latitude,
    longitude,
    radiusMeters: DEFAULT_RADIUS_METERS,
    placeName: place?.name ?? place?.street ?? null,
    locality: place?.city ?? place?.subregion ?? null,
    country: place?.country ?? null,
  };
}

export function describeLocation(location: StickerLocation) {
  return (
    [location.placeName, location.locality, location.country]
      .filter(Boolean)
      .join(", ") ||
    `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
  );
}
