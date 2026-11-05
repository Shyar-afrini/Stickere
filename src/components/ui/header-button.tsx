import type { LucideIcon } from "lucide-react-native";

import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

import { Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Text } from "./text";

type Props = {
  onPress: () => void;
  label?: string;
  icon?: LucideIcon;
  bold?: boolean;
  disabled?: boolean;
  destructive?: boolean;
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
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  // Disabled turns the icon and text grey instead of fading the whole button.
  const color = disabled ? "systemGray2" : destructive ? "systemRed" : label ? "systemBlue" : "label";

  return (
    <View style={[styles.shadow, Shadows.floating]}>
      <BlurView
        intensity={60}
        tint={scheme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight"}
        style={[
          styles.glass,
          label ? styles.pill : styles.round,
          { borderColor: theme.separator },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          disabled={disabled}
          onPress={onPress}
          hitSlop={8}
          style={styles.press}
        >
          {icon && <Icon icon={icon} size={20} color={color} />}
          {label && (
            <Text color={color} weight={bold ? "semibold" : undefined}>
              {label}
            </Text>
          )}
        </Pressable>
      </BlurView>
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
