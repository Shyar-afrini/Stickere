import * as ImagePicker from "expo-image-picker";

import { describePoint, type StickerLocation } from "@/lib/location";

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  /** File name without its extension, when the library provides one. */
  name?: string;
  /** Where the photo was taken, read from its GPS tags; null when it has none. */
  location?: StickerLocation | null;
};

/** Reads a coordinate from EXIF, where the sign may be split into a N/S/E/W reference. */
function exifCoordinate(value: unknown, ref: unknown, negativeRef: string) {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number)) return null;
  return ref === negativeRef ? -Math.abs(number) : number;
}

async function locationFromExif(exif: Record<string, unknown> | null | undefined) {
  if (!exif) return null;
  const latitude = exifCoordinate(exif.GPSLatitude, exif.GPSLatitudeRef, "S");
  const longitude = exifCoordinate(exif.GPSLongitude, exif.GPSLongitudeRef, "W");
  if (latitude === null || longitude === null) return null;
  if (latitude === 0 && longitude === 0) return null;
  return describePoint(latitude, longitude);
}

/** Opens the system photo picker. Resolves to `null` if the user cancels. */
export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    // Below 1 the picker re-encodes HEIC photos as JPEG (it kept them as HEIC at 1).
    quality: 0.99,
    exif: true,
    // iPhone photos are HEIC, which the editing canvas can't decode. "Compatible" turns
    // them into JPEG and leaves PNG cut-outs alone, so transparency is kept.
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  // Some pickers leave a GIF's type blank or generic, so the extension decides too.
  const isGif = asset.mimeType === "image/gif" || /\.gif(\?|$)/i.test(asset.uri);
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: isGif ? "image/gif" : (asset.mimeType ?? "image/png"),
    name: asset.fileName?.replace(/\.[^.]+$/, "") || undefined,
    location: await locationFromExif(asset.exif),
  };
}
