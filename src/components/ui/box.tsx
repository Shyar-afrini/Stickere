import { View, type ViewProps, type ViewStyle } from "react-native";

import {
  Radius,
  Spacing,
  type RadiusKey,
  type SpaceKey,
  type ThemeColor,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type BoxProps = ViewProps & {
  row?: boolean;
  flex?: number;
  gap?: SpaceKey;
  /** Padding on all sides, horizontal, vertical, top, bottom. */
  p?: SpaceKey;
  px?: SpaceKey;
  py?: SpaceKey;
  pt?: SpaceKey;
  pb?: SpaceKey;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  /** Centers children on both axes. */
  center?: boolean;
  bg?: ThemeColor;
  radius?: RadiusKey;
  overflow?: ViewStyle["overflow"];
  aspectRatio?: number;
};

/** Layout primitive: a `View` styled from design tokens instead of raw numbers. */
export function Box({
  row,
  flex,
  gap,
  p,
  px,
  py,
  pt,
  pb,
  align,
  justify,
  center,
  bg,
  radius,
  overflow,
  aspectRatio,
  style,
  ...props
}: BoxProps) {
  const theme = useTheme();

  const computed: ViewStyle = {
    flexDirection: row ? "row" : undefined,
    flex,
    gap: gap && Spacing[gap],
    padding: p && Spacing[p],
    paddingHorizontal: px && Spacing[px],
    paddingVertical: py && Spacing[py],
    paddingTop: pt && Spacing[pt],
    paddingBottom: pb && Spacing[pb],
    alignItems: center ? "center" : align,
    justifyContent: center ? "center" : justify,
    backgroundColor: bg && theme[bg],
    borderRadius: radius && Radius[radius],
    borderCurve: radius ? "continuous" : undefined,
    overflow,
    aspectRatio,
  };

  return <View style={[computed, style]} {...props} />;
}

export const HStack = (props: BoxProps) => (
  <Box row align="center" {...props} />
);
export const VStack = (props: BoxProps) => <Box {...props} />;
