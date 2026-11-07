import type { ReactNode } from "react";

import { Spacing } from "@/constants/theme";

import { Box } from "./box";
import { Text } from "./text";

/**
 * Title bar drawn inside a sheet: a sheet has no navigation bar on Android, so both platforms use this
 * one. Cancel-style action on the left, the title in the middle, the confirm action on the right.
 */
export function SheetHeader({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    // The sheet draws its own grab handle above this.
    <Box row align="center" px="md" pb="md" style={{ paddingTop: Spacing.sm }}>
      <Box flex={1} align="flex-start">
        {left}
      </Box>
      <Text variant="headline" numberOfLines={1}>
        {title}
      </Text>
      <Box flex={1} align="flex-end">
        {right}
      </Box>
    </Box>
  );
}
