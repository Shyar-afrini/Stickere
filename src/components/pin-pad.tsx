import { Delete } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { Box, Icon, Pressable, Text } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { PIN_LENGTH } from "@/lib/security";

const KEY = 76;

type Props = {
  title: string;
  subtitle?: string;
  error?: string;
  /** Called with the full PIN; the pad clears itself afterwards. */
  onComplete: (pin: string) => void | Promise<void>;
  /** Bottom-left key, e.g. the Face ID button. */
  corner?: ReactNode;
};

/** Dots plus a 3-column number pad. */
export function PinPad({ title, subtitle, error, onComplete, corner }: Props) {
  const theme = useTheme();
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);

  const press = (digit: string) => {
    if (busy || digits.length >= PIN_LENGTH) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      setBusy(true);
      Promise.resolve(onComplete(next)).finally(() => {
        setDigits("");
        setBusy(false);
      });
    }
  };

  const rows: (string | "corner" | "delete")[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["corner", "0", "delete"],
  ];

  return (
    <Box align="center" gap="xxl">
      <Box align="center" gap="xs">
        <Text variant="title3" weight="bold">
          {title}
        </Text>
        <Text variant="subheadline" color={error ? "systemRed" : "secondaryLabel"}>
          {error ?? subtitle ?? " "}
        </Text>
      </Box>

      <Box row gap="lg">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: theme.label,
              backgroundColor: index < digits.length ? theme.label : "transparent",
            }}
          />
        ))}
      </Box>

      <Box gap="md">
        {rows.map((row, index) => (
          <Box key={index} row gap="lg">
            {row.map((key) => {
              if (key === "corner") {
                return (
                  <View key={key} style={{ width: KEY, height: KEY }}>
                    {corner}
                  </View>
                );
              }
              const isDelete = key === "delete";
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={isDelete ? "Delete" : key}
                  onPress={() => (isDelete ? setDigits((value) => value.slice(0, -1)) : press(key))}
                  style={{
                    width: KEY,
                    height: KEY,
                    borderRadius: KEY / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDelete ? "transparent" : theme.systemFill,
                  }}
                >
                  {isDelete ? (
                    <Icon icon={Delete} size={26} />
                  ) : (
                    <Text variant="title1">{key}</Text>
                  )}
                </Pressable>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
