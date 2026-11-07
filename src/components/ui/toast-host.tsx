import { useEffect, useSyncExternalStore } from "react";
import Animated, {
  FadeInUp,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Duration } from "@/constants/motion";
import { Spacing } from "@/constants/theme";

import { Blur } from "./blur";
import { Box } from "./box";
import { Pressable } from "./pressable";
import { Text } from "./text";
import { toastStore } from "./toast";

/** How long a message stays; one with a button stays longer so there is time to reach it. */
const SHOW_MS = 4500;
const SHOW_WITH_ACTION_MS = 7000;

/** Draws the current toast as a frosted banner at the top of the screen. Mount once at the root. */
export function ToastHost() {
  const toast = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
  );
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      toastStore.clear,
      toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.duration(Duration.slow).reduceMotion(
        ReduceMotion.System,
      )}
      exiting={FadeOut.duration(Duration.standard).reduceMotion(
        ReduceMotion.System,
      )}
      style={{
        position: "absolute",
        top: insets.top + Spacing.sm,
        left: Spacing.lg,
        right: Spacing.lg,
      }}
    >
      <Blur solid={0.3} style={{ borderRadius: 24 }}>
        <Box
          row
          align="center"
          gap="md"
          style={{
            paddingVertical: Spacing.md,
            paddingLeft: Spacing.lg,
            paddingRight: Spacing.md,
          }}
        >
          <Pressable
            feedback="none"
            accessibilityRole="alert"
            accessibilityLabel={[toast.title, toast.message]
              .filter(Boolean)
              .join(". ")}
            onPress={toastStore.clear}
            style={{ flex: 1, gap: 2 }}
          >
            <Text variant="subheadline" weight="semibold">
              {toast.title}
            </Text>
            {toast.message ? (
              <Text variant="footnote" color="secondaryLabel">
                {toast.message}
              </Text>
            ) : null}
          </Pressable>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                toastStore.clear();
                toast.action?.onPress();
              }}
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
              }}
            >
              <Text variant="subheadline" weight="semibold" color="systemBlue">
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Box>
      </Blur>
    </Animated.View>
  );
}
