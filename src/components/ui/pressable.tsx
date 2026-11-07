import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type TouchableProps = Omit<PressableProps, "style" | "children"> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Pressed state, the same on both platforms (no Android ripple): `opacity` dims the content,
   * `scale` dims and shrinks it.
   */
  feedback?: "opacity" | "scale" | "none";
};

export function Pressable({
  feedback = "opacity",
  style,
  children,
  ...props
}: TouchableProps) {
  return (
    <RNPressable
      style={({ pressed }) => [
        style,
        pressed && feedback === "opacity" && { opacity: 0.6 },
        pressed &&
          feedback === "scale" && {
            opacity: 0.7,
            transform: [{ scale: 0.98 }],
          },
      ]}
      {...props}
    >
      {children}
    </RNPressable>
  );
}
