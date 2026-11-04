import type { ReactNode } from "react";

import { Box } from "./box";

/**
 * Photo-style square tile: a thick inset frame in the surface color with a soft
 * shadow, wrapping clipped content.
 */
export function Tile({ children }: { children: ReactNode }) {
  return (
    <Box
      aspectRatio={1}
      p="xs"
      bg="secondarySystemGroupedBackground"
      radius="xl"
      shadow="card"
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
