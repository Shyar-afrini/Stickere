import { TextInput, type TextInputProps } from "react-native";

import { Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Borderless text input meant to sit inside a `ListSection` row. */
export function TextField({ multiline, style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      multiline={multiline}
      placeholderTextColor={theme.tertiaryLabel}
      selectionColor={theme.systemBlue}
      style={[
        Typography.body,
        {
          color: theme.label,
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: multiline ? 88 : 44,
          textAlignVertical: multiline ? "top" : "center",
        },
        style,
      ]}
      {...props}
    />
  );
}
