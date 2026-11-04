import { requireNativeModule } from "expo";

import type {
  MadeSticker,
  MakeStickerOptions,
  StickerApp,
  TelegramPack,
  WhatsAppPack,
} from "./StickerKit.types";

type StickerKitNative = {
  isInstalled(app: StickerApp): Promise<boolean>;
  shareToWhatsApp(pack: WhatsAppPack): Promise<void>;
  shareToTelegram(pack: TelegramPack): Promise<void>;
  makeSticker(uri: string, options: MakeStickerOptions): Promise<MadeSticker>;
};

export default requireNativeModule<StickerKitNative>("StickerKit");
