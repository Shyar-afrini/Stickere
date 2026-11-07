import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { Box } from "./box";

/**
 * Photo-style square tile: a thick inset frame in the surface color with a
 * hairline edge, wrapping clipped content.
 */
export function Tile({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <Box
      aspectRatio={1}
      p="xs"
      bg="secondarySystemGroupedBackground"
      radius="xl"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.separator,
      }}
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
