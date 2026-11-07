import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { Box } from "./box";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
};

/**
 * Android's version of the floating surface: Material 3 has no glass, so it is an opaque tonal
 * surface in the theme's container color, with the same shape as on iOS. Its shadow comes from the
 * caller's elevation.
 */
export function Blur({ children, style }: Props) {
  return (
    <Box bg="secondarySystemGroupedBackground" overflow="hidden" style={style}>
      {children}
    </Box>
  );
}
