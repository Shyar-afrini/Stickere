import { useMemo } from "react";

import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import {
  Box,
  Image,
  Pressable,
  ReorderCell,
  ScrollView,
} from "@/components/ui";
import type { useReorder } from "@/hooks/use-reorder";
import type { Sticker } from "@/db/schema";
import { getStickerUri } from "@/lib/sticker-storage";

type Props = {
  /** Reorder state, owned by the page so its header can show a Done button. */
  reorder: ReturnType<typeof useReorder<Sticker>>;
  onStickerPress?: (sticker: Sticker) => void;
};

/**
 * Shows stickers in their own free-form shape: no frame, no cropping. Each
 * sticker keeps its aspect ratio and the two columns are balanced by height.
 * Long press a sticker to pick it up and drag it to a new place.
 */
export function StickerMasonry({ reorder, onStickerPress }: Props) {
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const { controller, order, activeKey, dragging, startEditing } = reorder;
  const columns = useMemo(() => splitColumns(order), [order]);

  return (
    <ScrollView
      scrollEnabled={!dragging}
      contentContainerStyle={{
        paddingTop: headerInset,
        paddingBottom: tabInset + 80,
      }}
    >
      <Box row align="flex-start" gap="lg" p="lg">
        {columns.map((column, index) => (
          <Box
            key={index}
            flex={1}
            gap="lg"
            // The column holding the dragged card is drawn above the other one.
            style={{
              zIndex: column.some((sticker) => String(sticker.id) === activeKey)
                ? 1
                : 0,
            }}
          >
            {column.map((sticker) => (
              <ReorderCell
                key={sticker.id}
                controller={controller}
                id={String(sticker.id)}
                active={activeKey === String(sticker.id)}
                onEnterEditing={startEditing}
              >
                {(handlers) => (
                  <Pressable
                    accessibilityLabel={sticker.name}
                    onPress={() => onStickerPress?.(sticker)}
                    {...handlers}
                  >
                    <Box>
                      <Image
                        source={{ uri: getStickerUri(sticker.path) }}
                        style={{ aspectRatio: sticker.width / sticker.height }}
                      />
                    </Box>
                  </Pressable>
                )}
              </ReorderCell>
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
