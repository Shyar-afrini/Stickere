import { Images, Lock } from "lucide-react-native";
import { Link } from "expo-router";

import { Box, Icon, Image, Pressable, Text, Tile } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import type { PackSummary } from "@/hooks/use-packs";
import { getStickerUri } from "@/lib/sticker-storage";

/** Try-out: show the pack's four newest stickers in a collage. Set to false to go back to the single cover. */
const SHOW_RECENT_STICKERS = true;

/** Space between collage cells: the container's colour shows through as a thin line. */
const LINE = 3;

/** One cell of the collage: the sticker fills it, cropped to the cell. */
function Cell({ path }: { path: string }) {
  return (
    <Box flex={1} overflow="hidden">
      <Image
        source={{ uri: getStickerUri(path) }}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
}

/**
 * The newest stickers, each count laid out differently and divided by thin lines:
 * 1 fills the tile, 2 sit side by side, 3 have one tall cell beside two stacked, 4 make a 2×2 grid.
 */
function Collage({ paths }: { paths: string[] }) {
  const theme = useTheme();
  const [a, b, c, d] = paths;

  return (
    <Box
      row
      flex={1}
      style={{
        width: "100%",
        height: "100%",
        gap: LINE,
        backgroundColor: theme.separator,
      }}
    >
      {paths.length === 1 && <Cell path={a} />}
      {paths.length === 2 && (
        <>
          <Cell path={a} />
          <Cell path={b} />
        </>
      )}
      {paths.length === 3 && (
        <>
          <Cell path={a} />
          <Box flex={1} style={{ gap: LINE }}>
            <Cell path={b} />
            <Cell path={c} />
          </Box>
        </>
      )}
      {paths.length >= 4 && (
        <>
          <Box flex={1} style={{ gap: LINE }}>
            <Cell path={a} />
            <Cell path={c} />
          </Box>
          <Box flex={1} style={{ gap: LINE }}>
            <Cell path={b} />
            <Cell path={d} />
          </Box>
        </>
      )}
    </Box>
  );
}

type Props = {
  pack: PackSummary;
  /** Long press picks the card up for reordering. */
  onLongPress?: () => void;
  onPressOut?: () => void;
};

export function PackCard({ pack, onLongPress, onPressOut }: Props) {
  const count =
    pack.stickerCount === 1 ? "1 sticker" : `${pack.stickerCount} stickers`;

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
          ) : pack.customCover ? (
            <Image
              source={{ uri: getStickerUri(pack.customCover) }}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : SHOW_RECENT_STICKERS && pack.recentPaths.length > 0 ? (
            <Collage paths={pack.recentPaths} />
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
        <Text
          variant="footnote"
          color="secondaryLabel"
          style={{ marginHorizontal: 4 }}
        >
          {count}
        </Text>
      </Pressable>
    </Link>
  );
}
