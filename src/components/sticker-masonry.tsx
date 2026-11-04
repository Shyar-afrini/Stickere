import { useMemo } from "react";

import { Box, Image, Pressable, ScrollView } from "@/components/ui";
import type { Sticker } from "@/db/schema";
import { getStickerUri } from "@/lib/sticker-storage";

type Props = {
  stickers: Sticker[];
  onStickerLongPress?: (sticker: Sticker) => void;
};

/**
 * Shows stickers in their own free-form shape: no frame, no cropping. Each
 * sticker keeps its aspect ratio and the two columns are balanced by height.
 */
export function StickerMasonry({ stickers, onStickerLongPress }: Props) {
  const columns = useMemo(() => splitColumns(stickers), [stickers]);

  return (
    <ScrollView>
      <Box row align="flex-start" gap="lg" p="lg">
        {columns.map((column, index) => (
          <Box key={index} flex={1} gap="lg">
            {column.map((sticker) => (
              <Pressable
                key={sticker.id}
                accessibilityLabel={sticker.name}
                onLongPress={() => onStickerLongPress?.(sticker)}
              >
                {/* No background on the wrapper: iOS then casts the shadow from
                    the sticker's alpha, so it follows the cut-out outline. */}
                <Box shadow="sticker">
                  <Image
                    source={{ uri: getStickerUri(sticker.path) }}
                    style={{ aspectRatio: sticker.width / sticker.height }}
                  />
                </Box>
              </Pressable>
            ))}
          </Box>
        ))}
      </Box>
    </ScrollView>
  );
}

function splitColumns(stickers: Sticker[]) {
  const columns: Sticker[][] = [[], []];
  const heights = [0, 0];

  for (const sticker of stickers) {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(sticker);
    heights[target] += sticker.height / sticker.width;
  }

  return columns;
}
