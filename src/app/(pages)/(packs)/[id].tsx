import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { StickerMasonry } from "@/components/sticker-masonry";
import {
  EmptyState,
  Fab,
  HeaderButton,
  Screen,
  confirmDelete,
  showAlert,
} from "@/components/ui";
import { deletePack, deleteSticker } from "@/db/mutations";
import { usePack } from "@/hooks/use-packs";
import { pickImage } from "@/lib/pick-image";
import { ShareError, sharePack, type StickerApp } from "@/lib/sticker-share";

export default function PackDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packId = Number(id);
  const { pack, stickers, isLoading } = usePack(packId);

  if (isLoading) {
    return null;
  }

  const share = async (app: StickerApp) => {
    if (!pack) return;
    try {
      await sharePack(app, pack, stickers);
    } catch (error) {
      const message =
        error instanceof ShareError
          ? error.message
          : error instanceof Error &&
              "code" in error &&
              error.code === "ERR_APP_NOT_INSTALLED"
            ? error.message
            : "Something went wrong while sharing.";
      showAlert("Couldn’t Share Pack", message);
    }
  };

  const chooseShareTarget = () =>
    showAlert("Share Pack", "Add this pack to a messaging app.", [
      { text: "WhatsApp", onPress: () => share("whatsapp") },
      { text: "Telegram", onPress: () => share("telegram") },
      { text: "Cancel", style: "cancel" },
    ]);

  // Opens the photo picker first; the editor only appears once a photo is chosen.
  const addSticker = async () => {
    const picked = await pickImage();
    if (!picked) return;

    router.push({
      pathname: "/(pages)/(packs)/new-sticker",
      params: {
        packId,
        uri: picked.uri,
        width: picked.width,
        height: picked.height,
        mimeType: picked.mimeType,
        name: picked.name ?? "Sticker",
      },
    });
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: pack?.name ?? "",
          headerRight: () => (
            <>
              <HeaderButton
                symbol="square.and.arrow.up"
                accessibilityLabel="Share pack"
                disabled={stickers.length === 0}
                onPress={chooseShareTarget}
              />
              <HeaderButton
                symbol="trash"
                destructive
                accessibilityLabel="Delete pack"
                onPress={() =>
                  confirmDelete({
                    title: `Delete “${pack?.name ?? "pack"}”?`,
                    message:
                      "The pack and all of its stickers will be deleted.",
                    onConfirm: () => {
                      router.back();
                      deletePack(packId);
                    },
                  })
                }
              />
            </>
          ),
        }}
      />
      {stickers.length === 0 ? (
        <EmptyState
          symbol="face.smiling"
          title="No Stickers"
          description="Add your first sticker to this pack."
          action={{ label: "Add Sticker", onPress: addSticker }}
        />
      ) : (
        <StickerMasonry
          stickers={stickers}
          onStickerLongPress={(sticker) =>
            confirmDelete({
              title: `Delete “${sticker.name}”?`,
              message: "This sticker will be permanently deleted.",
              onConfirm: () => deleteSticker(sticker),
            })
          }
        />
      )}

      <Fab
        actions={[
          { label: "Add Sticker", symbol: "face.smiling", onPress: addSticker },
        ]}
      />
    </Screen>
  );
}
