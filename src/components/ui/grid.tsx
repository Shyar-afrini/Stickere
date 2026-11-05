import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Spacing, type SpaceKey } from "@/constants/theme";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  columns?: number;
  gap?: SpaceKey;
  rowGap?: SpaceKey;
  inset?: SpaceKey;
  /** Space above the first row; defaults to `inset`. */
  topInset?: SpaceKey;
  /** Extra space below the last row, for floating controls. */
  bottomInset?: number;
  /** Content above the first row, e.g. a section of suggestions. */
  header?: React.ReactElement | null;
  /** Extra space above everything, for a transparent header floating over the grid. */
  headerInset?: number;
  /** Turned off while a card is being dragged. */
  scrollEnabled?: boolean;
};

/**
 * Multi-column grid. Cells are plain siblings in one container (not a virtualized
 * list), so a card that is being dragged can be drawn above all the others.
 */
export function Grid<T>({
  data,
  keyExtractor,
  renderItem,
  columns = 2,
  gap = "lg",
  rowGap = "xl",
  inset = "lg",
  topInset = inset,
  bottomInset = 0,
  header,
  headerInset = 0,
  scrollEnabled = true,
}: Props<T>) {
  const [width, setWidth] = useState(0);
  const cellWidth = (width - 2 * Spacing[inset] - (columns - 1) * Spacing[gap]) / columns;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={scrollEnabled}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={{
        padding: Spacing[inset],
        paddingTop: Spacing[topInset] + headerInset,
        paddingBottom: Spacing[inset] + bottomInset,
      }}
    >
      {header}
      {width > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: Spacing[gap],
            rowGap: Spacing[rowGap],
          }}
        >
          {data.map((item) => (
            <View key={keyExtractor(item)} style={{ width: cellWidth }}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
