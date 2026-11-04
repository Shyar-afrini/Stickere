import type { SFSymbol } from "expo-symbols";

import { Pressable } from "./pressable";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  onPress: () => void;
  label?: string;
  symbol?: SFSymbol;
  bold?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
};

/** Plain text or symbol button for navigation bar slots. */
export function HeaderButton({
  onPress,
  label,
  symbol,
  bold,
  disabled,
  destructive,
  accessibilityLabel,
}: Props) {
  const color = destructive ? "systemRed" : "systemBlue";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={{ paddingHorizontal: 4, opacity: disabled ? 0.4 : 1 }}
    >
      {symbol && <Icon name={symbol} size={20} color={color} />}
      {label && (
        <Text color={color} weight={bold ? "semibold" : undefined}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
