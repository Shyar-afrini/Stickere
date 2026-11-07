import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { Box } from "./box";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
  /** Only the iOS glass needs it: this surface is already solid. */
  solid?: number;
};

/**
 * Android draws the same floating surface as iOS (`blur.tsx`): the system blur isn't available there,
 * so it is the iOS material's solid colour with the same hairline border, radius and clipping.
 */
export function Blur({ children, style, bordered = true }: Props) {
  const theme = useTheme();

  return (
    <Box
      bg="secondarySystemGroupedBackground"
      overflow="hidden"
      style={[
        bordered && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.separator,
        },
        style,
      ]}
    >
      {children}
    </Box>
  );
}
