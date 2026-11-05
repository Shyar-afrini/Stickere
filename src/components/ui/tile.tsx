import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import { Box } from "./box";

/**
 * Photo-style square tile: a thick inset frame in the surface color with a soft
 * shadow, wrapping clipped content. Shadows disappear on dark backgrounds, so
 * dark mode gets a hairline edge to keep the same outline.
 */
export function Tile({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";

  return (
    <Box
      aspectRatio={1}
      p="xs"
      bg="secondarySystemGroupedBackground"
      radius="xl"
      shadow="card"
      style={
        isDark && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.separator,
        }
      }
    >
      <Box
        flex={1}
        center
        bg="secondarySystemBackground"
        radius="lg"
        overflow="hidden"
      >
        {children}
      </Box>
    </Box>
  );
}
