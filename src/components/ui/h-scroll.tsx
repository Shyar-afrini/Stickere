import type { ReactNode } from "react";
import { ScrollView as RNScrollView } from "react-native";

import { Spacing, type SpaceKey } from "@/constants/theme";

/** Horizontally scrolling strip with consistent edge padding. */
export function HScroll({
  children,
  gap = "md",
  inset = "lg",
}: {
  children: ReactNode;
  gap?: SpaceKey;
  inset?: SpaceKey;
}) {
  return (
    <RNScrollView
      horizontal
      style={{ flexGrow: 0 }}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing[inset],
        gap: Spacing[gap],
      }}
    >
      {children}
    </RNScrollView>
  );
}
