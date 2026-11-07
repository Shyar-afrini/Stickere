import { Ellipsis, Pencil, Share, Smile, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { LoadingScreen } from "@/components/loading-screen";
import { LockScreen } from "@/components/lock-screen";
import { StickerMasonry } from "@/components/sticker-masonry";
import {
  Box,
  EmptyState,
  HeaderButton,
  Menu,
  Screen,
  showToast,
  type MenuItem,
} from "@/components/ui";
import { deletePack, reorderStickers } from "@/db/mutations";
import { useReorder } from "@/hooks/use-reorder";
import { usePack } from "@/hooks/use-packs";
import { unlockPack, useLockState } from "@/lib/lock-state";
import { startNewSticker } from "@/lib/add-sticker";
import { ShareError, sharePack, type StickerApp } from "@/lib/sticker-share";
import { Haptic } from "@/lib/haptics";
import { setResumeRoute } from "@/lib/settings";

export default function PackDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packId = Number(id);
  const { pack, stickers, isLoading } = usePack(packId);
  const { unlockedPacks } = useLockState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [adding, setAdding] = useState(false);
  const reorder = useReorder(
    stickers,
    (sticker) => String(sticker.id),
    (next) =>
      reorderStickers(
        packId,
        next.map((sticker) => sticker.id),
      ),
  );

  if (isLoading) {
    return null;
  }

  if (pack?.isLocked && !unlockedPacks.has(packId)) {
    return <LockScreen title={pack.name} onUnlock={() => unlockPack(packId)} />;
  }

  const share = async (app: StickerApp) => {
    if (!pack || sharing) return;
    setSharing(true);
    // If the system restarts the app while the other app is in front, it comes back to this pack.
    setResumeRoute(`/(pages)/(packs)/${packId}`);
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
      showToast("Couldn’t Share Pack", message);
    } finally {
      setResumeRoute(null);
      setSharing(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      key: "edit",
      label: "Edit Pack",
      icon: Pencil,
      onPress: () =>
        router.push({
          pathname: "/(pages)/(packs)/new-pack",
          params: { packId },
        }),
    },
    ...(stickers.length > 0
      ? [
          {
            key: "export",
            label: "Export Pack",
            icon: Share,
            items: [
              {
                key: "whatsapp",
                label: "WhatsApp",
                onPress: () => share("whatsapp"),
              },
              {
                key: "telegram",
                label: "Telegram",
                onPress: () => share("telegram"),
              },
            ],
          },
        ]
      : []),
    {
      key: "delete",
      label: "Delete Pack",
      icon: Trash2,
      destructive: true,
      confirm: "Tap again to delete",
      onPress: () => {
        router.back();
        deletePack(packId);
      },
    },
  ];

  return (
    <Screen>
      {/* Covers the page while the pack is being prepared and handed to the other app. */}
      {sharing && (
        <Box style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
          <LoadingScreen />
        </Box>
      )}
      <Stack.Screen
        options={{
          title: pack?.name ?? "",
          headerRight: () =>
            reorder.editing ? (
              <HeaderButton label="Done" bold onPress={reorder.stopEditing} />
            ) : (
              <>
                <HeaderButton
                  icon={Ellipsis}
                  accessibilityLabel="Pack actions"
                  onPress={() => setMenuOpen((open) => !open)}
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
          action={{
            label: "Add Sticker",
            loading: adding,
            onPress: async () => {
              if (adding) return;
              setAdding(true);
              try {
                await startNewSticker(router, packId);
              } finally {
                setAdding(false);
              }
            },
          }}
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

      <Menu
        open={menuOpen}
        title={pack?.name ?? "Pack"}
        items={menuItems}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
