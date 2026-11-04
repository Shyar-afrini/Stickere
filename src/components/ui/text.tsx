import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { Typography, type TextVariant, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type TextProps = RNTextProps & {
  /** iOS text style. Defaults to `body`. */
  variant?: TextVariant;
  color?: ThemeColor;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
};

const weights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export function Text({
  variant = "body",
  color = "label",
  weight,
  align,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  const base = Typography[variant];

  return (
    <RNText
      style={[
        base,
        { color: theme[color], textAlign: align },
        weight && { fontWeight: weights[weight] },
        style,
      ]}
      {...props}
    />
  );
}
