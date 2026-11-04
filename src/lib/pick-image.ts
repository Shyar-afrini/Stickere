import * as ImagePicker from "expo-image-picker";

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  /** File name without its extension, when the library provides one. */
  name?: string;
};

/** Opens the system photo picker. Resolves to `null` if the user cancels. */
export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    // Keep the original file so transparent PNG/WebP cut-outs stay transparent.
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? "image/png",
    name: asset.fileName?.replace(/\.[^.]+$/, "") || undefined,
  };
}
