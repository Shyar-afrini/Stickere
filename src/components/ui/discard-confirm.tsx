import { StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Radius, Spacing } from "@/constants/theme";
import { Haptic } from "@/lib/haptics";

import { Box } from "./box";
import { Button } from "./button";
import { Text } from "./text";

/**
 * "Discard your changes?" drawn inline at the bottom of the sheet or screen it sits in: a dimmed veil and a
 * small panel with the two choices. Render it as the last child of the surface it asks about.
 */
export function DiscardConfirm({
  visible,
  onDiscard,
  onKeep,
}: {
  visible: boolean;
  onDiscard: () => void;
  onKeep: () => void;
}) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[StyleSheet.absoluteFill, styles.veil]}
    >
      <Box bg="secondarySystemGroupedBackground" gap="md" style={styles.panel}>
        <Box align="center" gap="xs">
          <Text variant="headline">Discard your changes?</Text>
          <Text variant="footnote" color="secondaryLabel" align="center">
            What you changed here hasn’t been saved.
          </Text>
        </Box>
        <Button
          variant="tinted"
          title="Discard Changes"
          onPress={() => {
            Haptic.tap();
            onDiscard();
          }}
        />
        <Button title="Keep Editing" onPress={onKeep} />
      </Box>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: {
    justifyContent: "flex-end",
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  panel: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
  },
});
