import { useEffect, useState, type ReactNode } from "react";
import { PanResponder, ScrollView } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { scheduleOnRN } from "react-native-worklets";

import { Springs, Timings } from "@/constants/motion";
import { Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";

import { Blur } from "./blur";
import { Box } from "./box";
import { Pressable } from "./pressable";

/** Height of the shade along the bottom edge. */
const SHADE_HEIGHT = 96;
/** Eased fade (offset, share of full strength): content dissolves into the edge instead of a hard band. */
const SHADE_STOPS = [
  [0, 0],
  [0.3, 0.12],
  [0.55, 0.38],
  [0.8, 0.72],
  [1, 1],
] as const;
const SHADE_STRENGTH = 0.08;

type Props = {
  /** Set to false to sink the card to nothing; `onClosed` runs once it is gone. */
  visible?: boolean;
  onClosed?: () => void;
  /** Row shown on the drag handle: title, count. */
  header: ReactNode;
  children: ReactNode;
  /** Height when closed: handle, header and the first row of content. */
  peekHeight: number;
  /** Height of the card when fully open. */
  openHeight: number;
  /** Distance from the bottom of the screen, to sit above the tab bar. */
  bottom: number;
  side: number;
  radius?: number;
};

/**
 * Card hovering above the tab bar that grows taller (drag the handle, or tap) to show all of its content. Content
 * scrolls only once it is open, so the first drag always moves the drawer.
 */
export function Drawer({
  visible = true,
  onClosed,
  header,
  children,
  peekHeight,
  openHeight,
  bottom,
  side,
  radius = 28,
}: Props) {
  const theme = useTheme();
  // Blackish in light mode, whitish in dark mode.
  const shade = useColorScheme() === "dark" ? "#fff" : "#000";
  const travel = openHeight - peekHeight;
  // How far the card has grown past its resting height: 0 closed, `travel` fully open.
  const grow = useSharedValue(0);
  // 0 = gone, 1 = shown: the card rises from nothing when it appears and sinks back when dismissed.
  const shown = useSharedValue(0);
  const start = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (visible) shown.set(withSpring(1, Springs.gentle));
    else {
      grow.set(withTiming(0, Timings.dismiss));
      shown.set(
        withTiming(0, Timings.dismiss, (finished) => {
          if (finished && onClosed) scheduleOnRN(onClosed);
        }),
      );
    }
  }, [visible, shown, grow, onClosed]);

  const [pan] = useState(() => {
    const clamp = (value: number) => Math.min(travel, Math.max(0, value));
    const settle = (target: number) => {
      const next = target === travel;
      grow.set(withSpring(target, Springs.snappy));
      if (next !== isOpen.get()) {
        isOpen.set(next);
        setOpen(next);
        Haptic.selection();
      }
    };
    return {
      settle,
      responder: PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => start.set(grow.get()),
        onPanResponderMove: (_, g) => grow.set(clamp(start.get() - g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.vy < -0.4) settle(travel);
          else if (g.vy > 0.4) settle(0);
          else settle(clamp(start.get() - g.dy) > travel / 2 ? travel : 0);
        },
      }),
    };
  });

  // The card grows upward from above the tab bar, and its shadow deepens as it rises.
  const style = useAnimatedStyle(() => {
    const progress = travel > 0 ? grow.get() / travel : 0;
    return {
      height: (peekHeight + grow.get()) * shown.get(),
      opacity: Math.min(1, shown.get() * 3),
      shadowOpacity: interpolate(
        progress,
        [0, 1],
        [Shadows.popover.shadowOpacity, Shadows.floating.shadowOpacity],
      ),
      shadowRadius: interpolate(
        progress,
        [0, 1],
        [Shadows.popover.shadowRadius, Shadows.floating.shadowRadius + 6],
      ),
      shadowOffset: {
        width: 0,
        height: interpolate(progress, [0, 1], [2, 10]),
      },
      elevation: interpolate(
        progress,
        [0, 1],
        [Shadows.popover.elevation, Shadows.floating.elevation + 6],
      ),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: side,
          right: side,
          bottom,
          borderRadius: radius,
          shadowColor: "#000",
        },
        style,
      ]}
    >
      <Blur style={{ flex: 1, borderRadius: radius }}>
        <Box {...pan.responder.panHandlers}>
          <Pressable
            feedback="none"
            accessibilityRole="button"
            accessibilityLabel={open ? "Collapse" : "Show all"}
            onPress={() => pan.settle(open ? 0 : travel)}
            style={{ paddingTop: 8, paddingBottom: 10, gap: 8 }}
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
            {header}
          </Pressable>
        </Box>
        <ScrollView
          scrollEnabled={open}
          showsVerticalScrollIndicator={open}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
        {/* Always-on shade along the bottom edge: clear above, darkening toward the edge. */}
        <Box
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: SHADE_HEIGHT,
          }}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="drawer-shade" x1="0" y1="0" x2="0" y2="1">
                {SHADE_STOPS.map(([offset, opacity]) => (
                  <Stop
                    key={offset}
                    offset={offset}
                    stopColor={shade}
                    stopOpacity={opacity * SHADE_STRENGTH}
                  />
                ))}
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#drawer-shade)" />
          </Svg>
        </Box>
      </Blur>
    </Animated.View>
  );
}
