import { Directory, File, Paths } from "expo-file-system";

// Stickers live in the document directory, which the OS never clears (unlike
// the cache directory that image pickers hand out). The database only stores
// the path relative to the document directory, because the absolute URI can
// change when the app container moves between updates or restores.
const STICKERS_DIR = "stickers";

const stickersDirectory = () => new Directory(Paths.document, STICKERS_DIR);

/**
 * Copies a picked or captured image into permanent storage and returns the
 * relative path to save in `stickers.path`.
 */
export async function saveStickerImage(sourceUri: string): Promise<string> {
  const source = new File(sourceUri);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${source.extension}`;

  stickersDirectory().create({ intermediates: true, idempotent: true });
  await source.copy(new File(stickersDirectory(), name));

  return `${STICKERS_DIR}/${name}`;
}

/** Resolves a stored relative path to a URI that can be passed to `<Image>`. */
export function getStickerUri(path: string): string {
  return new File(Paths.document, path).uri;
}

export function stickerImageExists(path: string): boolean {
  return new File(Paths.document, path).exists;
}

/** Deletes the stored image; does nothing if the file is already gone. */
export function deleteStickerImage(path: string): void {
  const file = new File(Paths.document, path);
  if (file.exists) file.delete();
}
