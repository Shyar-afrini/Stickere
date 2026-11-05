import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Check, Copy, Pencil, Share, Trash2, type LucideIcon } from "lucide-react-native";
import { File, Paths } from "expo-file-system";
import { useState } from "react";
import { useWindowDimensions } from "react-native";

import { FlipCard, Stamp, StampBack } from "@/components/stamp";
import { Box, Chip, Icon, Pressable, Screen, Text, confirmDelete, showAlert } from "@/components/ui";
import { db } from "@/db";
import { deleteSticker } from "@/db/mutations";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { getStickerUri } from "@/lib/sticker-storage";
import { packs, stickerTags, stickers, tags } from "@/db/schema";

function Action({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: "center", gap: 6, width: 64 }}>
      <Box center bg="secondarySystemGroupedBackground" radius="full" style={{ width: 56, height: 56 }}>
        <Icon icon={icon} size={24} color={destructive ? "systemRed" : "label"} />
      </Box>
      <Text variant="caption1" color="secondaryLabel">
        {label}
      </Text>
    </Pressable>
  );
}

/** Share-card view of one sticker: a stamp with share, copy, edit and delete actions. */
export default function StickerCard() {
  const router = useRouter();
  const headerInset = useHeaderInset();
  const { stickerId } = useLocalSearchParams<{ stickerId: string }>();
  const id = Number(stickerId);
  const { data } = useLiveQuery(db.select().from(stickers).where(eq(stickers.id, id)).limit(1), [id]);
  const sticker = data[0];
  const { data: tagRows } = useLiveQuery(
    db
      .select({ name: tags.name })
      .from(stickerTags)
      .innerJoin(tags, eq(tags.id, stickerTags.tagId))
      .where(eq(stickerTags.stickerId, id))
      .orderBy(tags.name),
    [id],
  );

  const { data: packRows } = useLiveQuery(
    db
      .select({ name: packs.name })
      .from(packs)
      .where(eq(packs.id, data[0]?.packId ?? -1)),
    [data[0]?.packId],
  );

  const { width: screenWidth } = useWindowDimensions();
  const [copied, setCopied] = useState(false);

  if (!sticker) return <Screen bg="systemGroupedBackground" />;

  // Only the sticker image is shared or copied; the stamp is just how it is shown.
  const stampWidth = Math.min(screenWidth - 72, 320);
  const imageFile = () => new File(Paths.document, sticker.path);

  const share = async () => {
    try {
      await Sharing.shareAsync(imageFile().uri, {
        mimeType: sticker.mimeType,
        UTI: sticker.mimeType === "image/png" ? "public.png" : undefined,
      });
    } catch {
      showAlert("Couldn’t Share", "Something went wrong while sharing the sticker.");
    }
  };

  const copy = async () => {
    try {
      await Clipboard.setImageAsync(await imageFile().base64());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showAlert("Couldn’t Copy", "Something went wrong while copying the sticker.");
    }
  };

  return (
    <Screen center bg="systemGroupedBackground" gap="xxxl" style={{ paddingTop: headerInset }}>
      <Stack.Screen options={{ title: "" }} />
      <Box style={{ shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
        <FlipCard
          front={<Stamp sticker={sticker} width={stampWidth} />}
          back={
            <StampBack
              sticker={sticker}
              width={stampWidth}
              packName={packRows[0]?.name}
              tags={tagRows.map((tag) => tag.name)}
            />
          }
        />
      </Box>

      <Text variant="footnote" color="tertiaryLabel">
        Swipe the stamp in any direction to flip it
      </Text>

      {tagRows.length > 0 && (
        <Box row gap="sm" center style={{ flexWrap: "wrap", paddingHorizontal: 36 }}>
          {tagRows.map((tag) => (
            <Chip key={tag.name} label={tag.name} />
          ))}
        </Box>
      )}

      <Box row gap="sm">
        <Action icon={Share} label="Share" onPress={share} />
        <Action icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} onPress={copy} />
        <Action
          icon={Pencil}
          label="Edit"
          onPress={() =>
            router.push({
              pathname: "/(pages)/(packs)/edit-image",
              params: {
                stickerId: sticker.id,
                uri: getStickerUri(sticker.path),
                width: sticker.width,
                height: sticker.height,
                mimeType: sticker.mimeType,
              },
            })
          }
        />
        <Action
          icon={Trash2}
          label="Delete"
          destructive
          onPress={() =>
            confirmDelete({
              title: `Delete “${sticker.name}”?`,
              message: "This sticker will be permanently deleted.",
              onConfirm: () => {
                deleteSticker(sticker);
                router.back();
              },
            })
          }
        />
      </Box>
    </Screen>
  );
}
