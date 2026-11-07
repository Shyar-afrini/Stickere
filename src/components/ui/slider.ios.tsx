import { Host, Slider as SwiftSlider } from "@expo/ui/swift-ui";

import { useTheme } from "@/hooks/use-theme";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

/** The system SwiftUI slider on iOS; Android draws the same slider in `slider.tsx`. */
export function Slider({ value, min, max, onChange }: SliderProps) {
  const theme = useTheme();

  return (
    <Host style={{ height: 44 }} seedColor={theme.systemBlue}>
      <SwiftSlider value={value} min={min} max={max} step={1} onValueChange={(next) => onChange(Math.round(next))} />
    </Host>
  );
}
