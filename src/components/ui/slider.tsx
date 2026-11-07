import { useState } from "react";
import { StyleSheet, View, type GestureResponderEvent } from "react-native";

import { useTheme } from "@/hooks/use-theme";

const KNOB = 28;
const TRACK = 4;

type SliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

/** Fallback slider for web, drawn by hand. iOS and Android use their native sliders (`slider.ios.tsx`, `slider.android.tsx`). */
export function Slider({ value, min, max, onChange, accessibilityLabel }: SliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const travel = Math.max(width - KNOB, 1);
  const fraction = (Math.min(Math.max(value, min), max) - min) / (max - min);

  const move = (event: GestureResponderEvent) => {
    const next = (event.nativeEvent.locationX - KNOB / 2) / travel;
    onChange(Math.round(min + Math.min(Math.max(next, 0), 1) * (max - min)));
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={move}
      onResponderMove={move}
      style={{ height: 44, justifyContent: "center" }}
    >
      {/* Children ignore touches so `locationX` is always relative to the whole track. */}
      <View pointerEvents="none" style={{ height: TRACK, borderRadius: TRACK / 2, backgroundColor: theme.systemFill }}>
        <View
          style={{
            width: fraction * travel + KNOB / 2,
            height: TRACK,
            borderRadius: TRACK / 2,
            backgroundColor: theme.systemBlue,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: fraction * travel,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: "#FFFFFF",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.separator,
        }}
      />
    </View>
  );
}
