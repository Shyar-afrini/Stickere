import { Platform } from "react-native";

import {
  isInstalled,
  shareToTelegram,
  shareToWhatsApp,
  type StickerApp,
  type StickerInput,
} from "../../modules/sticker-kit";

import type { Pack, Sticker } from "@/db/schema";
import { getStickerUri } from "@/lib/sticker-storage";

// WhatsApp requires 3–30 stickers per pack; Telegram requires at least one.
// Both need at least one emoji per sticker, WhatsApp at most three.
const WHATSAPP_MIN = 3;
const WHATSAPP_MAX = 30;
const FALLBACK_EMOJI = "🙂";

export class ShareError extends Error {}

export { isInstalled };
export type { StickerApp };

function toInputs(stickers: Sticker[]): StickerInput[] {
  return stickers.map((sticker) => ({
    uri: getStickerUri(sticker.path),
    emojis: sticker.emojis.length > 0 ? sticker.emojis.slice(0, 3) : [FALLBACK_EMOJI],
  }));
}

export async function sharePack(app: StickerApp, pack: Pack, stickers: Sticker[]) {
  if (Platform.OS === "web") {
    throw new ShareError("Sharing sticker packs isn’t supported on the web.");
  }

  const still = stickers.filter((sticker) => !sticker.isAnimated);
  if (still.length < stickers.length) {
    throw new ShareError("Animated stickers can’t be shared yet. Remove them and try again.");
  }

  if (app === "whatsapp") {
    if (still.length < WHATSAPP_MIN) {
      throw new ShareError(`WhatsApp packs need at least ${WHATSAPP_MIN} stickers.`);
    }
    if (still.length > WHATSAPP_MAX) {
      throw new ShareError(`WhatsApp packs can have at most ${WHATSAPP_MAX} stickers.`);
    }
    const inputs = toInputs(still);
    await shareToWhatsApp({
      identifier: `pack-${pack.id}`,
      name: pack.name,
      publisher: pack.author ?? "Stickerê",
      trayUri: inputs[0].uri,
      stickers: inputs,
    });
    return;
  }

  if (still.length === 0) {
    throw new ShareError("Add at least one sticker first.");
  }
  await shareToTelegram({ stickers: toInputs(still) });
}
