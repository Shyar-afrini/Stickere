import { useEffect, useSyncExternalStore } from "react";
import { Modal, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Springs, Timings } from "@/constants/motion";
import { Spacing, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";

import type { AlertButton, SheetAction } from "./alert";
import { Blur } from "./blur";
import { Box } from "./box";
import { dialogStore } from "./dialog-store";
import { Pressable } from "./pressable";
import { Text } from "./text";

/** Same corner radius as the tab bar and the map drawer. */
const RADIUS = 28;
const ALERT_WIDTH = 300;
/** How far the action sheet travels when it slides in. */
const SHEET_TRAVEL = 320;

/** One tappable row, divided from the one above by a hairline. */
function Row({
  label,
  color,
  bold,
  onPress,
  divider = true,
}: {
  label: string;
  color: ThemeColor;
  bold?: boolean;
  onPress: () => void;
  divider?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.lg,
        borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderTopColor: theme.separator,
      }}
    >
      <Text
        color={color}
        weight={bold ? "semibold" : undefined}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const buttonColor = (style: AlertButton["style"]): ThemeColor =>
  style === "destructive" ? "systemRed" : "systemBlue";

/**
 * Draws every alert and action sheet in the app's own style: the frosted card of the tab bar and the
 * map drawer, with hairline dividers. Mount once at the root. It sits in a transparent `Modal`, so it
 * also shows above native sheets.
 */
export function DialogHost() {
  const { request, closing } = useSyncExternalStore(
    dialogStore.subscribe,
    dialogStore.getSnapshot,
  );
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!request) {
      progress.set(0);
      return;
    }
    if (closing) {
      progress.set(
        withTiming(0, Timings.dismiss, (finished) => {
          if (finished) scheduleOnRN(dialogStore.finish);
        }),
      );
    } else {
      progress.set(withSpring(1, Springs.gentle));
    }
  }, [request, closing, progress]);

  const backdrop = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.get()),
  }));
  const alertStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.get() * 1.5),
    transform: [{ scale: 0.92 + 0.08 * progress.get() }],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.get() * 2),
    transform: [{ translateY: (1 - progress.get()) * SHEET_TRAVEL }],
  }));

  if (!request) return null;

  const close = (after?: () => void) => {
    Haptic.selection();
    dialogStore.dismiss(after);
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dialogStore.dismiss()}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0, 0, 0, 0.3)" },
          backdrop,
        ]}
      >
        {/* Tapping outside closes an action sheet; an alert needs an answer. */}
        <Pressable
          feedback="none"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          disabled={request.kind === "alert"}
          onPress={() => dialogStore.dismiss()}
        />
      </Animated.View>

      {request.kind === "alert" ? (
        <Box center pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              { width: Math.min(ALERT_WIDTH, width - 2 * Spacing.xxxl) },
              alertStyle,
            ]}
          >
            <Blur style={{ borderRadius: RADIUS }}>
              <Box
                align="center"
                gap="xs"
                style={{ padding: Spacing.xl, paddingBottom: Spacing.lg }}
              >
                <Text variant="headline" align="center">
                  {request.title}
                </Text>
                {request.message ? (
                  <Text
                    variant="subheadline"
                    color="secondaryLabel"
                    align="center"
                  >
                    {request.message}
                  </Text>
                ) : null}
              </Box>
              {request.buttons.length === 2 ? (
                <Box row>
                  {request.buttons.map((button, index) => (
                    <Box
                      key={button.text}
                      flex={1}
                      style={
                        index > 0 && {
                          borderLeftWidth: StyleSheet.hairlineWidth,
                          borderLeftColor: theme.separator,
                        }
                      }
                    >
                      <Row
                        label={button.text}
                        color={buttonColor(button.style)}
                        bold={button.style === "cancel"}
                        onPress={() => close(button.onPress)}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                request.buttons.map((button) => (
                  <Row
                    key={button.text}
                    label={button.text}
                    color={buttonColor(button.style)}
                    bold={button.style === "cancel"}
                    onPress={() => close(button.onPress)}
                  />
                ))
              )}
            </Blur>
          </Animated.View>
        </Box>
      ) : (
        <Box
          justify="flex-end"
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            style={[
              {
                marginHorizontal: Spacing.lg,
                marginBottom: Math.max(insets.bottom, Spacing.lg),
                gap: Spacing.sm,
              },
              sheetStyle,
            ]}
          >
            <Blur style={{ borderRadius: RADIUS }}>
              <Box align="center" style={{ padding: Spacing.lg }}>
                <Text
                  variant="footnote"
                  weight="semibold"
                  color="secondaryLabel"
                  align="center"
                >
                  {request.title}
                </Text>
              </Box>
              {request.actions.map((action: SheetAction) => (
                <Row
                  key={action.label}
                  label={action.label}
                  color={action.destructive ? "systemRed" : "label"}
                  onPress={() => close(action.onPress)}
                />
              ))}
            </Blur>
            <Blur style={{ borderRadius: RADIUS }}>
              <Row
                label="Cancel"
                color="systemBlue"
                bold
                divider={false}
                onPress={() => close()}
              />
            </Blur>
          </Animated.View>
        </Box>
      )}
    </Modal>
  );
}
