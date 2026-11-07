import { useEffect } from "react";
import { StyleSheet, type SwitchProps } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Springs } from "@/constants/motion";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";

import { Pressable } from "./pressable";

const WIDTH = 52;
const HEIGHT = 32;
const INSET = 3;
const KNOB = HEIGHT - 2 * INSET;

/**
 * The app's own switch, drawn the same on both platforms: a pill track in the accent colour when on and
 * a grey one when off, with a white knob that springs across. Disabled greys it out; it follows
 * Reduce Motion through the shared spring preset.
 */
export function Toggle({
  value = false,
  onValueChange,
  disabled,
  accessibilityLabel,
}: SwitchProps) {
  const theme = useTheme();
  const position = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.set(withSpring(value ? 1 : 0, Springs.snappy));
  }, [value, position]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      position.get(),
      [0, 1],
      [theme.systemGray5, disabled ? theme.systemGray3 : theme.systemBlue],
    ),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * (WIDTH - KNOB - 2 * INSET) }],
  }));

  return (
    <Pressable
      feedback="none"
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        Haptic.selection();
        onValueChange?.(!value);
      }}
    >
      <Animated.View
        style={[
          {
            width: WIDTH,
            height: HEIGHT,
            borderRadius: HEIGHT / 2,
            padding: INSET,
          },
          track,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              backgroundColor: "#FFFFFF",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.separator,
            },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
