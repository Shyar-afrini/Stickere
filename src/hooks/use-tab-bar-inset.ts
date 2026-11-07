import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** Height of the floating tab bar pill. */
export const TAB_BAR_HEIGHT = 68;
/** Gap between the pill and the bottom safe area. */
export const TAB_BAR_MARGIN = 0;
/** Space left at each side; cards above the bar (like the map's) use the same, so the widths match. */
export const TAB_BAR_SIDE_MARGIN = 16;
/** Gap between the pill and the round add button. */
export const TAB_BAR_GAP = 12;

/** Space a screen must leave at the bottom so content clears the floating tab bar. */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  // A screen that has just been pushed (a sheet route) can report no inset on its first frame, which would
  // start its sheet lower than the others; the window's own inset is known from the start.
  const bottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;
  return bottom + TAB_BAR_HEIGHT + TAB_BAR_MARGIN;
}

/** Where every drawer sheet rests: on top of the tab bar's spot, like the map's drawer. */
export function useSheetBottom() {
  return useTabBarInset() + 8;
}
