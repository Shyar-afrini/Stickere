import { useEffect, useRef, useState, type ReactNode } from "react";
import { PanResponder, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Springs, Timings } from "@/constants/motion";
import { Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { TAB_BAR_SIDE_MARGIN, useSheetBottom } from "@/hooks/use-tab-bar-inset";
import { useRegisterSheet } from "@/hooks/use-sheet-open";
import { Haptic } from "@/lib/haptics";

import { Blur } from "./blur";
import { Box } from "./box";
import { Pressable } from "./pressable";
import { Text } from "./text";

/** Room around the card inside its clip, for the shadow. */
const SHADOW_ROOM = 24;

/** How far down the handle has to be dragged (or how fast flicked) to dismiss the sheet. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.6;

type Props = {
  /** Set to false to sink the sheet away; `onClosed` runs once it is gone. */
  visible?: boolean;
  /** Tap outside, or drag the handle down: the owner decides whether to close (set `visible` to false). */
  onDismiss?: () => void;
  onClosed?: () => void;
  height: number;
  side?: number;
  radius?: number;
  /** Centered under the handle. */
  title?: string;
  /** Hold the opening until the height is known (the content is still being measured). */
  waiting?: boolean;
  children: ReactNode;
};

/**
 * The app's one bottom sheet: a frosted card with a grab handle that hovers above the bottom edge, like the
 * map's drawer. A dimmed backdrop sits behind it. It rises in with a soft spring, sinks away smoothly, and
 * drags down to dismiss. It is drawn inside the screen (never a native sheet or a modal), so the same sheet
 * works for forms, menus and dialogs on both platforms.
 */
export function DrawerSheet({
  visible = true,
  onDismiss,
  onClosed,
  height,
  side = TAB_BAR_SIDE_MARGIN,
  radius = 28,
  title,
  waiting = false,
  children,
}: Props) {
  const theme = useTheme();
  const bottom = useSheetBottom();
  useRegisterSheet(visible, onDismiss);
  // 0 = gone, 1 = shown.
  const shown = useSharedValue(0);
  const drag = useSharedValue(0);
  // The sheet's height follows `height` smoothly when it changes (a sheet that fits its content).
  const size = useSharedValue(height);
  // Until the sheet is on screen a new height is taken at once, so every sheet opens at its own height instead of
  // growing or shrinking from the one before it.
  useEffect(() => {
    if (shown.get() < 0.01) size.set(height);
    else size.set(withTiming(height, Timings.standard));
  }, [height, size, shown]);

  // `onClosed` is usually a new function each render; keeping the latest in a ref stops the animation below from
  // restarting every time the owner re-renders (a stutter while the sheet opens or closes).
  const closed = useRef(onClosed);
  useEffect(() => {
    closed.current = onClosed;
  });
  const notifyClosed = () => closed.current?.();

  useEffect(() => {
    if (visible) {
      // A sheet still measuring its content waits, so it opens once at its final height.
      if (!waiting) shown.set(withSpring(1, Springs.gentle));
    } else {
      shown.set(
        withTiming(0, Timings.dismiss, (finished) => {
          if (finished) scheduleOnRN(notifyClosed);
        }),
      );
    }
  }, [visible, waiting, shown]);

  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => drag.set(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        const dismiss = g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
        drag.set(withSpring(0, Springs.snappy));
        if (dismiss && onDismiss) {
          Haptic.selection();
          onDismiss();
        }
      },
      onPanResponderTerminate: () => drag.set(withSpring(0, Springs.snappy)),
    }),
  );

  const backdrop = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.get()),
  }));
  // The card keeps its full size and slides up from behind the top of the tab bar (and back down, also while
  // it is dragged), where a clip hides what is still below it. That reads as growing out of the bar, but moves a
  // layer instead of re-laying out the sheet on every frame.
  const clip = useAnimatedStyle(() => ({ height: size.get() + SHADOW_ROOM }));
  const card = useAnimatedStyle(() => ({
    height: size.get(),
    transform: [{ translateY: size.get() * (1 - shown.get()) + drag.get() }],
  }));

  return (
    <Box pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Tints the page behind the sheet. The sheet is drawn under the floating tab bar, so the bar stays above the
          tint, undimmed and tappable. A tap on the tint closes the sheet. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0, 0, 0, 0.25)" },
          backdrop,
        ]}
      >
        <Pressable
          feedback="none"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        />
      </Animated.View>

      {/* Clips the card at the top of the tab bar. It reaches a little past the card at the top and sides, so the
          shadow isn't cut off there. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            left: side - SHADOW_ROOM,
            right: side - SHADOW_ROOM,
            bottom,
            paddingHorizontal: SHADOW_ROOM,
            justifyContent: "flex-end",
            overflow: "hidden",
          },
          clip,
        ]}
      >
        <Animated.View
          style={[{ borderRadius: radius, ...Shadows.popover }, card]}
        >
          <Blur solid={0.5} style={{ flex: 1, borderRadius: radius }}>
            <Box
              {...responder.panHandlers}
              style={{ paddingTop: 8, paddingBottom: title ? 6 : 10 }}
            >
              <Box
                style={{
                  alignSelf: "center",
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: theme.systemGray3,
                }}
              />
              {title ? (
                <Text
                  variant="headline"
                  align="center"
                  numberOfLines={1}
                  style={{ marginTop: 8 }}
                >
                  {title}
                </Text>
              ) : null}
            </Box>
            <Box flex={1}>{children}</Box>
          </Blur>
        </Animated.View>
      </Animated.View>
    </Box>
  );
}
