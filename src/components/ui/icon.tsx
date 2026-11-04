import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ComponentProps } from "react";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type IconProps = {
  name: SFSymbol;
  size?: number;
  color?: ThemeColor;
  weight?: ComponentProps<typeof SymbolView>["weight"];
};

/** SF Symbol tinted with a theme color. */
export function Icon({ name, size = 20, color = "label", weight }: IconProps) {
  const theme = useTheme();

  return (
    <SymbolView name={name} size={size} tintColor={theme[color]} weight={weight} />
  );
}
