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
    ...placeParts(place),
  };
}

// Open Location Code ("8FVC9G8F+6W"): the geocoder falls back to it when a spot has no name.
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]*(\s|$)/i;
// A house number or other digits on their own.
const BARE_NUMBER = /^[\d\s\-/]+$/;

/** True for text that is a code or number rather than something a person would call a place. */
export function isPlaceCode(text: string | null | undefined) {
  const value = text?.trim();
  return !value || PLUS_CODE.test(value) || BARE_NUMBER.test(value);
}

/** The readable name, street, area and country of a geocoder result: codes and bare numbers are skipped. */
export function placeParts(place: Location.LocationGeocodedAddress | undefined) {
  const name = [place?.name, place?.street, place?.district].find((part) => !isPlaceCode(part));
  const locality = [place?.city, place?.subregion, place?.district, place?.region].find(
    (part) => !isPlaceCode(part) && part !== name,
  );
  return {
    placeName: name ?? null,
    locality: locality ?? null,
    country: place?.country ?? null,
  };
}

/** "Name, City, Country" of a saved place, leaving out codes stored by older versions. */
export function placeLabel(place: {
  placeName?: string | null;
  locality?: string | null;
  country?: string | null;
}) {
  return [place.placeName, place.locality, place.country]
    .filter((part): part is string => !isPlaceCode(part))
    .join(", ");
}

export function describeLocation(location: StickerLocation) {
  return placeLabel(location) || "Saved location";
}

/** One readable word for a place, e.g. for a title: the first of the given parts that is not a code. */
export function shortPlace(...parts: (string | null | undefined)[]) {
  return parts.find((part): part is string => !isPlaceCode(part));
}
