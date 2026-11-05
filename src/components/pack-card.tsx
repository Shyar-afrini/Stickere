import { Images, Lock } from "lucide-react-native";
import { Link } from "expo-router";

import { Icon, Image, Pressable, Text, Tile } from "@/components/ui";
import type { PackSummary } from "@/hooks/use-packs";
import { getStickerUri } from "@/lib/sticker-storage";

type Props = {
  pack: PackSummary;
  /** Long press picks the card up for reordering. */
  onLongPress?: () => void;
  onPressOut?: () => void;
};

export function PackCard({ pack, onLongPress, onPressOut }: Props) {
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
        onLongPress={onLongPress}
        onPressOut={onPressOut}
      >
        <Tile>
          {pack.isLocked ? (
            <Icon icon={Lock} size={32} color="systemGray2" />
          ) : pack.coverPath ? (
            <Image
              source={{ uri: getStickerUri(pack.coverPath) }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Icon icon={Images} size={32} color="systemGray2" />
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
