import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Draw the hairline border. On by default. */
  bordered?: boolean;
};

/**
 * The app's floating surface. On iOS it is frosted glass (the "thick material"); Android draws a
 * Material tonal surface instead (`blur.android.tsx`). Give it a radius in `style`; it clips its
 * children to it.
 */
export function Blur({ children, style, bordered = true }: Props) {
  const theme = useTheme();
  const dark = useColorScheme() === "dark";

  return (
    <BlurView
      intensity={60}
      tint={dark ? "systemThickMaterialDark" : "systemThickMaterialLight"}
      style={[
        { overflow: "hidden" },
        bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.separator },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
