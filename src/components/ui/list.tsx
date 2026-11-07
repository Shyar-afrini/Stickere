import { Check } from "lucide-react-native";
import { Children, type ReactNode } from "react";

import { MinTapSize } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { Box } from "./box";
import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Spinner } from "./spinner";
import { Text } from "./text";

/** iOS inset-grouped section: rounded surface with hairline separators. */
export function ListSection({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const rows = Children.toArray(children);

  return (
    <Box gap="xs">
      {title && (
        <Text
          variant="footnote"
          color="secondaryLabel"
          style={{ marginHorizontal: 32 }}
        >
          {title.toUpperCase()}
        </Text>
      )}
      <Box
        bg="secondarySystemGroupedBackground"
        radius="md"
        overflow="hidden"
        style={{ marginHorizontal: 16 }}
      >
        {rows.map((row, index) => (
          <Box key={index}>
            {index > 0 && (
              <Box
                style={{
                  height: 0.5,
                  marginLeft: 16,
                  backgroundColor: theme.separator,
                }}
              />
            )}
            {row}
          </Box>
        ))}
      </Box>
      {footer && (
        <Text
          variant="footnote"
          color="secondaryLabel"
          style={{ marginHorizontal: 32 }}
        >
          {footer}
        </Text>
      )}
    </Box>
  );
}

type ListRowProps = {
  label: string;
  detail?: string;
  /** Renders the label in the tint color, like an inline action. */
  tinted?: boolean;
  accessory?: "checkmark";
  /** Custom trailing content, such as a `Toggle`. */
  trailing?: ReactNode;
  /** Swaps the trailing content for a spinner and ignores taps until the action is done. */
  loading?: boolean;
  onPress?: () => void;
};

export function ListRow({
  label,
  detail,
  tinted,
  accessory,
  trailing,
  loading = false,
  onPress,
}: ListRowProps) {
  const content = (
    <Box
      row
      align="center"
      gap="md"
      px="lg"
      py="md"
      style={{ minHeight: MinTapSize }}
    >
      <Box flex={1}>
        <Text color={tinted ? "systemBlue" : "label"}>{label}</Text>
        {detail ? (
          <Text variant="footnote" color="secondaryLabel" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </Box>
      {accessory === "checkmark" && (
        <Icon icon={Check} size={16} color="systemBlue" strokeWidth={2.5} />
      )}
      {loading ? <Spinner /> : trailing}
    </Box>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      onPress={loading ? undefined : onPress}
    >
      {content}
    </Pressable>
  );
}
