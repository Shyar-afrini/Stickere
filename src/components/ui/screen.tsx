import { ScrollView as RNScrollView, type ScrollViewProps } from "react-native";

import { Spacing, type SpaceKey } from "@/constants/theme";

import { Box, type BoxProps } from "./box";

/** Full-screen container on the iOS grouped background. */
export function Screen(props: BoxProps) {
  return <Box flex={1} {...props} />;
}

type Props = ScrollViewProps & {
  gap?: SpaceKey;
  /** Vertical padding of the content. */
  py?: SpaceKey;
};

/** Scroll view that respects the navigation bar and keyboard like a native iOS screen. */
export function ScrollView({ gap, py, contentContainerStyle, ...props }: Props) {
  return (
    <RNScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { gap: gap && Spacing[gap], paddingVertical: py && Spacing[py] },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
}
