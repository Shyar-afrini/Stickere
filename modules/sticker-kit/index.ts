import StickerKit from "./src/StickerKitModule";
import type {
  MakeStickerOptions,
  StickerApp,
  TelegramPack,
  WhatsAppPack,
} from "./src/StickerKit.types";

export * from "./src/StickerKit.types";

export const isInstalled = (app: StickerApp) => StickerKit.isInstalled(app);
export const shareToWhatsApp = (pack: WhatsAppPack) => StickerKit.shareToWhatsApp(pack);
export const shareToTelegram = (pack: TelegramPack) => StickerKit.shareToTelegram(pack);
export const makeSticker = (uri: string, options: MakeStickerOptions) =>
  StickerKit.makeSticker(uri, options);
