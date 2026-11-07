import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import { HANDOFF_MS, beginSheetHandoff } from "@/hooks/use-sheet-open";
import { Haptic } from "@/lib/haptics";

import { Box } from "./box";
import { DrawerSheet } from "./drawer-sheet";
import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Text } from "./text";

export type MenuItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress?: () => void;
  /** Ask once more in place before running: the row turns into this label and runs on the next tap. */
  confirm?: string;
  /** Opens these rows underneath instead of running anything. */
  items?: MenuItem[];
};

const ROW = 52;
/** Handle, title and padding around the rows. */
const CHROME = 60;

function Row({
  item,
  nested,
  active,
  onPress,
}: {
  item: MenuItem;
  nested?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: ROW,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingLeft: nested ? Spacing.xxxl + Spacing.sm : Spacing.lg,
        paddingRight: Spacing.lg,
      }}
    >
      {item.icon ? (
        <Icon
          icon={item.icon}
          size={20}
          color={item.destructive ? "systemRed" : "label"}
        />
      ) : null}
      <Text
        variant="body"
        weight={active ? "semibold" : undefined}
        color={item.destructive ? "systemRed" : "label"}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * The frosted `DrawerSheet` as an actions menu: the title under the handle, then the rows. Tap outside, or
 * drag the handle down, and it sinks away. It hovers above the tab bar like the map's drawer. Rows can
 * expand into sub-rows, or ask for a second tap to confirm (instead of a confirmation dialog).
 */
export function Menu({
  open,
  title,
  items,
  onClose,
}: {
  open: boolean;
  title: string;
  items: MenuItem[];
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const [armed, setArmed] = useState<string>();

  if (!open) return null;

  const reset = () => {
    setClosing(false);
    setExpanded(undefined);
    setArmed(undefined);
    onClose();
  };

  const press = (item: MenuItem) => {
    if (item.items) {
      Haptic.selection();
      setExpanded(expanded === item.key ? undefined : item.key);
      return;
    }
    if (item.confirm && armed !== item.key) {
      Haptic.warning();
      setArmed(item.key);
      return;
    }
    Haptic.tap();
    // The bar's button squeezes first. Then the next sheet opens while the menu sinks away, at the same time,
    // so there is never a moment with no sheet (the menu is only removed once it has finished sinking).
    beginSheetHandoff();
    setTimeout(() => {
      setClosing(true);
      item.onPress?.();
    }, HANDOFF_MS);
  };

  const rows = items.reduce(
    (count, item) =>
      count + 1 + (expanded === item.key ? (item.items?.length ?? 0) : 0),
    0,
  );

  return (
    <DrawerSheet
      visible={!closing}
      onDismiss={() => setClosing(true)}
      onClosed={reset}
      height={CHROME + rows * ROW}
      title={title}
    >
      {items.map((item, index) => (
        <Box key={item.key}>
          {index > 0 ? (
            <Box bg="separator" style={{ height: StyleSheet.hairlineWidth }} />
          ) : null}
          <Row
            item={
              armed === item.key
                ? { ...item, label: item.confirm ?? item.label }
                : item
            }
            active={armed === item.key || expanded === item.key}
            onPress={() => press(item)}
          />
          {expanded === item.key
            ? item.items?.map((child) => (
                <Row
                  key={child.key}
                  item={child}
                  nested
                  onPress={() => press(child)}
                />
              ))
            : null}
        </Box>
      ))}
    </DrawerSheet>
  );
}
