import { FlatList, View } from "react-native";

import { Spacing, type SpaceKey } from "@/constants/theme";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  columns?: number;
  gap?: SpaceKey;
  rowGap?: SpaceKey;
  inset?: SpaceKey;
  /** Extra space below the last row, for floating controls. */
  bottomInset?: number;
};

/** Multi-column grid that scrolls under the large title like a native iOS list. */
export function Grid<T>({
  data,
  keyExtractor,
  renderItem,
  columns = 2,
  gap = "lg",
  rowGap = "xl",
  inset = "lg",
  bottomInset = 0,
}: Props<T>) {
  // Pads the last row with blanks so a lone item keeps its column width.
  const blanks = (columns - (data.length % columns)) % columns;
  const items: (T | null)[] = [...data, ...Array<null>(blanks).fill(null)];

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => (item === null ? `blank-${index}` : keyExtractor(item))}
      numColumns={columns}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>{item === null ? null : renderItem(item)}</View>
      )}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: Spacing[inset],
        paddingBottom: Spacing[inset] + bottomInset,
        gap: Spacing[rowGap],
      }}
      columnWrapperStyle={{ gap: Spacing[gap] }}
    />
  );
}
