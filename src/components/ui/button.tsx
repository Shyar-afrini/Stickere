import type { LucideIcon } from "lucide-react-native";

import { MinTapSize, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { Icon } from "./icon";
import { Pressable, type TouchableProps } from "./pressable";
import { Spinner } from "./spinner";
import { Text } from "./text";

type Variant = "filled" | "tinted" | "plain" | "destructive";

export type ButtonProps = Omit<TouchableProps, "children"> & {
  title?: string;
  icon?: LucideIcon;
  variant?: Variant;
  /** Shows a spinner in place of the icon and blocks presses until the work is done. */
  loading?: boolean;
};

/**
 * iOS button styles: `filled` (prominent), `tinted` (soft fill), `plain` (text
 * only) and `destructive` (red text).
 */
export function Button({
  title,
  icon,
  variant = "filled",
  disabled: disabledProp,
  loading = false,
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const disabled = disabledProp || loading;

  const filled = variant === "filled";
  const tinted = variant === "tinted";
  // Disabled is shown by colour, not by fading: grey text on a grey fill.
  const textColor = disabled
    ? "systemGray2"
    : filled
      ? "onTint"
      : variant === "destructive"
        ? "systemRed"
        : "systemBlue";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: MinTapSize,
          paddingHorizontal: filled || tinted ? 20 : 4,
          borderRadius: Radius.full,
          borderCurve: "continuous",
          backgroundColor: filled
            ? disabled
              ? theme.systemFill
              : theme.systemBlue
            : tinted
              ? theme.systemFill
              : undefined,
        },
        style,
      ]}
      {...props}
    >
      {loading ? <Spinner /> : icon && <Icon icon={icon} size={18} color={textColor} />}
      {title && (
        <Text variant="body" weight={filled ? "semibold" : undefined} color={textColor}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
