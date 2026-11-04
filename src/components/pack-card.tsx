import { Link } from "expo-router";

import { Icon, Image, Pressable, Text, Tile, confirmDelete } from "@/components/ui";
import { deletePack } from "@/db/mutations";
import type { PackSummary } from "@/hooks/use-packs";
import { getStickerUri } from "@/lib/sticker-storage";

export function PackCard({ pack }: { pack: PackSummary }) {
  const count = pack.stickerCount === 1 ? "1 sticker" : `${pack.stickerCount} stickers`;

  return (
    <Link
      href={{ pathname: "/(pages)/(packs)/[id]", params: { id: pack.id } }}
      asChild
    >
      <Pressable
        feedback="scale"
        accessibilityRole="button"
        accessibilityLabel={`${pack.name}, ${count}`}
        style={{ flex: 1 }}
        onLongPress={() =>
          confirmDelete({
            title: `Delete “${pack.name}”?`,
            message: "The pack and all of its stickers will be deleted.",
            onConfirm: () => deletePack(pack.id),
          })
        }
      >
        <Tile>
          {pack.coverPath ? (
            <Image
              source={{ uri: getStickerUri(pack.coverPath) }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Icon name="photo.on.rectangle.angled" size={32} color="tertiaryLabel" />
          )}
        </Tile>

        <Text
          variant="subheadline"
          weight="semibold"
          numberOfLines={1}
          style={{ marginTop: 10, marginHorizontal: 4 }}
        >
          {pack.name}
        </Text>
        <Text variant="footnote" color="secondaryLabel" style={{ marginHorizontal: 4 }}>
          {count}
        </Text>
      </Pressable>
    </Link>
  );
}
