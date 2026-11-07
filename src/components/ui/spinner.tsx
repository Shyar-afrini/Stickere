import { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/hooks/use-theme";

const SIZES = { small: 20, large: 36 } as const;
const STROKE_RATIO = 0.12;

/**
 * The app's own activity indicator, the same on both platforms: an open ring in the accent colour
 * that turns steadily. With Reduce Motion on it stays still instead of spinning.
 */
export function Spinner({ size = "small" }: { size?: "small" | "large" }) {
  const theme = useTheme();
  const turn = useSharedValue(0);
  const diameter = SIZES[size];
  const stroke = diameter * STROKE_RATIO + 1;
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    turn.set(
      withRepeat(
        withTiming(1, {
          duration: 900,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
      ),
    );
  }, [turn]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * 360}deg` }],
  }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[{ width: diameter, height: diameter }, style]}
    >
      <Svg width={diameter} height={diameter}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={theme.systemBlue}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * 0.72} ${circumference}`}
        />
      </Svg>
    </Animated.View>
  );
}
