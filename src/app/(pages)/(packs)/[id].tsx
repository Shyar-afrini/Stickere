import { Share, Smile, Trash2 } from "lucide-react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { LockScreen } from "@/components/lock-screen";
import { StickerMasonry } from "@/components/sticker-masonry";
import {
  EmptyState,
  HeaderButton,
  Screen,
  confirmDelete,
  showAlert,
} from "@/components/ui";
import { deletePack, reorderStickers } from "@/db/mutations";
import { useReorder } from "@/hooks/use-reorder";
import { usePack } from "@/hooks/use-packs";
import { unlockPack, useLockState } from "@/lib/lock-state";
import { startNewSticker } from "@/lib/add-sticker";
import { ShareError, sharePack, type StickerApp } from "@/lib/sticker-share";

export default function PackDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packId = Number(id);
  const { pack, stickers, isLoading } = usePack(packId);
  const { unlockedPacks } = useLockState();
  const reorder = useReorder(
    stickers,
    (sticker) => String(sticker.id),
    (next) => reorderStickers(packId, next.map((sticker) => sticker.id)),
  );

  if (isLoading) {
    return null;
  }

  if (pack?.isLocked && !unlockedPacks.has(packId)) {
    return <LockScreen title={pack.name} onUnlock={() => unlockPack(packId)} />;
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

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: pack?.name ?? "",
          headerRight: () =>
            reorder.editing ? (
              <HeaderButton label="Done" bold onPress={reorder.stopEditing} />
            ) : (
            <>
              <HeaderButton
                icon={Share}
                accessibilityLabel="Share pack"
                disabled={stickers.length === 0}
                onPress={chooseShareTarget}
              />
              <HeaderButton
                icon={Trash2}
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
          icon={Smile}
          title="No Stickers"
          description="Add your first sticker to this pack."
          action={{ label: "Add Sticker", onPress: () => startNewSticker(router, packId) }}
        />
      ) : (
        <StickerMasonry
          reorder={reorder}
          onStickerPress={(sticker) =>
            router.push({
              pathname: "/(pages)/(packs)/sticker",
              params: { stickerId: sticker.id },
            })
          }
        />
      )}

    </Screen>
  );
}
