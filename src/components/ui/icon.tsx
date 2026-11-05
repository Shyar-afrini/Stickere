import type { LucideIcon } from "lucide-react-native";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type IconProps = {
  icon: LucideIcon;
  size?: number;
  color?: ThemeColor;
  strokeWidth?: number;
};

/** Lucide icon tinted with a theme color. */
export function Icon({ icon: Glyph, size = 20, color = "label", strokeWidth = 2 }: IconProps) {
  const theme = useTheme();

  return <Glyph size={size} color={theme[color]} strokeWidth={strokeWidth} />;
}
