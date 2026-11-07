import { Ellipsis, Smile } from "lucide-react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { LockScreen } from "@/components/lock-screen";
import { StickerMasonry } from "@/components/sticker-masonry";
import {
  EmptyState,
  HeaderButton,
  Screen,
  confirmDelete,
  showActionSheet,
  showAlert,
} from "@/components/ui";
import { deletePack, reorderStickers } from "@/db/mutations";
import { useReorder } from "@/hooks/use-reorder";
import { usePack } from "@/hooks/use-packs";
import { unlockPack, useLockState } from "@/lib/lock-state";
import { startNewSticker } from "@/lib/add-sticker";
import { ShareError, sharePack, type StickerApp } from "@/lib/sticker-share";
import { Haptic } from "@/lib/haptics";

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
      Haptic.error();
      showAlert("Couldn’t Share Pack", message);
    }
  };

  const chooseShareTarget = () =>
    showAlert("Share Pack", "Add this pack to a messaging app.", [
      { text: "WhatsApp", onPress: () => share("whatsapp") },
      { text: "Telegram", onPress: () => share("telegram") },
      { text: "Cancel", style: "cancel" },
    ]);

  const askDelete = () =>
    confirmDelete({
      title: `Delete “${pack?.name ?? "pack"}”?`,
      message: "The pack and all of its stickers will be deleted.",
      onConfirm: () => {
        router.back();
        deletePack(packId);
      },
    });

  const openActions = () =>
    showActionSheet(pack?.name ?? "Pack", [
      {
        label: "Edit Pack",
        onPress: () =>
          router.push({ pathname: "/(pages)/(packs)/new-pack", params: { packId } }),
      },
      ...(stickers.length > 0 ? [{ label: "Export Pack", onPress: chooseShareTarget }] : []),
      { label: "Delete Pack", destructive: true, onPress: askDelete },
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
              <HeaderButton icon={Ellipsis} accessibilityLabel="Pack actions" onPress={openActions} />
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
