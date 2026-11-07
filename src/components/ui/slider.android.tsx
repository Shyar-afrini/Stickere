import { Host, Slider as ComposeSlider } from "@expo/ui/jetpack-compose";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
};

/** Material 3 slider (Jetpack Compose). iOS uses the SwiftUI slider (`slider.ios.tsx`). */
export function Slider({ value, min, max, onChange }: SliderProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <Host style={{ height: 48 }} colorScheme={scheme ?? undefined} seedColor={theme.systemBlue}>
      <ComposeSlider value={value} min={min} max={max} onValueChange={(next) => onChange(Math.round(next))} />
    </Host>
  );
}
