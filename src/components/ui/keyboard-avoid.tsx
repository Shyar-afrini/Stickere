import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useSheetBottom } from "@/hooks/use-tab-bar-inset";

const SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/** Current keyboard height as a shared value, easing alongside the system keyboard, plus whether it is up. */
export function useKeyboard() {
  const height = useSharedValue(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const move = (to: number, event?: KeyboardEvent) => {
      height.set(
        withTiming(to, {
          duration: event?.duration || 250,
          easing: Easing.out(Easing.cubic),
        }),
      );
      setOpen(to > 0);
    };
    const show = Keyboard.addListener(SHOW, (event) =>
      move(event.endCoordinates.height, event),
    );
    const hide = Keyboard.addListener(HIDE, (event) => move(0, event));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);

  return { height, open };
}

/**
 * Lifts its content above the keyboard by the keyboard's own height. For a sheet that reaches the bottom of
 * the screen, so the amount needs no guessing from where the sheet starts (unlike `KeyboardAvoidingView`).
 */
export function KeyboardAvoid({ children }: { children: ReactNode }) {
  const { height } = useKeyboard();
  // The sheet floats this far above the screen edge, so only the rest of the keyboard needs making room for.
  const gap = useSheetBottom();
  const style = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, height.get() - gap),
  }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
