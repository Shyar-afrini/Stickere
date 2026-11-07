import { X } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";

import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Text } from "./text";

/** Small rounded label. With `onRemove` it shows an ✕; with `onPress` the whole chip is tappable. */
export function Chip({
  label,
  onPress,
  onRemove,
  tinted,
}: {
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
  tinted?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={onRemove ? `Remove tag ${label}` : label}
      disabled={!onPress && !onRemove}
      onPress={onRemove ?? onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: tinted ? theme.systemBlue : theme.systemFill,
      }}
    >
      <Text variant="subheadline" color={tinted ? "onTint" : "label"}>
        #{label}
      </Text>
      {onRemove && (
        <Icon
          icon={X}
          size={14}
          color={tinted ? "onTint" : "secondaryLabel"}
          strokeWidth={2.5}
        />
      )}
    </Pressable>
  );
}
