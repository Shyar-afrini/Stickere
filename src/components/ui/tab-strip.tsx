import { useTheme } from "@/hooks/use-theme";

import { Box } from "./box";
import { HScroll } from "./h-scroll";
import { Pressable } from "./pressable";
import { Text } from "./text";

/** Horizontally scrollable row of pill tabs; the caller shows the selected tab's content. */
export function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const theme = useTheme();

  return (
    <HScroll gap="sm" >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
          >
            <Box
              px="lg"
              py="sm"
              radius="full"
              style={{ backgroundColor: selected ? theme.systemBlue : theme.systemFill }}
            >
              <Text variant="subheadline" weight="semibold" color={selected ? "onTint" : "label"}>
                {tab.label}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </HScroll>
  );
}
