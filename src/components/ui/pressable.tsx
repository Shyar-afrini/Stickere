import { Platform, Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export type TouchableProps = Omit<PressableProps, "style" | "children"> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Pressed state. iOS dims (`opacity`) or shrinks (`scale`) the content; Android shows the Material
   * ripple for both, clipped to the view's own shape.
   */
  feedback?: "opacity" | "scale" | "none";
};

const android = Platform.OS === "android";

export function Pressable({ feedback = "opacity", style, children, ...props }: TouchableProps) {
  const theme = useTheme();

  return (
    <RNPressable
      android_ripple={android && feedback !== "none" ? { color: theme.systemFill, foreground: true } : undefined}
      style={({ pressed }) => [
        style,
        !android && pressed && feedback === "opacity" && { opacity: 0.6 },
        !android && pressed && feedback === "scale" && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      {...props}
    >
      {children}
    </RNPressable>
  );
}
