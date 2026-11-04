export type StickerApp = "whatsapp" | "telegram";

export type StickerInput = {
  /** file:// URI of the sticker image. */
  uri: string;
  emojis: string[];
};

export type WhatsAppPack = {
  identifier: string;
  name: string;
  publisher: string;
  /** file:// URI of the tray icon source (resized to 96×96 natively). */
  trayUri: string;
  stickers: StickerInput[];
};

export type TelegramPack = {
  stickers: StickerInput[];
};

export type MakeStickerOptions = {
  /** Adds a white die-cut border around the subject. */
  outline: boolean;
};

export type MadeSticker = {
  /** file:// URI of a transparent PNG in the cache directory. */
  uri: string;
  width: number;
  height: number;
};
