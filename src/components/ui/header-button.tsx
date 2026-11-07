import type { LucideIcon } from "lucide-react-native";

import { StyleSheet, View } from "react-native";


import { Blur } from "./blur";
import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Spinner } from "./spinner";
import { Text } from "./text";

type Props = {
  onPress: () => void;
  label?: string;
  icon?: LucideIcon;
  bold?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  /** Spinner in place of the label or icon, and no presses, while the action runs. */
  loading?: boolean;
  accessibilityLabel?: string;
};

/**
 * Navigation bar button drawn like the floating tab bar: a frosted pill (round
 * for icons) with a hairline border and the same shadow.
 */
export function HeaderButton({
  onPress,
  label,
  icon,
  bold,
  disabled,
  destructive,
  loading = false,
  accessibilityLabel,
}: Props) {
  // Disabled turns the icon and text grey instead of fading the whole button.
  const color = disabled ? "systemGray2" : destructive ? "systemRed" : label ? "systemBlue" : "label";

  return (
    <View style={styles.shadow}>
      <Blur style={[styles.glass, label ? styles.pill : styles.round]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: disabled || loading, busy: loading }}
          disabled={disabled || loading}
          onPress={onPress}
          hitSlop={8}
          style={styles.press}
        >
          {loading ? (
            <Spinner />
          ) : (
            <>
              {icon && <Icon icon={icon} size={20} color={color} />}
              {label && (
                <Text color={color} weight={bold ? "semibold" : undefined}>
                  {label}
                </Text>
              )}
            </>
          )}
        </Pressable>
      </Blur>
    </View>
  );
}

const SIZE = 40;

const styles = StyleSheet.create({
  shadow: { borderRadius: SIZE / 2, marginHorizontal: 4 },
  glass: {
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  round: { width: SIZE },
  pill: { minWidth: SIZE },
  press: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
