import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

const TIPS = [
  "Long-press a sticker or pack to rearrange it.",
  "Your edits are saved as a draft until you create the sticker.",
  "Add tags to stickers to find them again quickly.",
  "Lock a pack with Face ID or a PIN in Settings.",
  "Photos remember where they were taken, so you can see your stickers on a map.",
  "Cut out a photo’s background, then add text, emoji and an outline.",
  "Turn on reminders to get a nudge when you arrive at a saved place.",
];

const ANIMATION_WIDTH = 284;
const ANIMATION_RATIO = 444 / 405;

/** Shown while the app starts: the looping animation, on a transparent GIF so it suits any theme, with a tip underneath. */
export function LoadingScreen() {
  const theme = useTheme();
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.systemGroupedBackground }]}>
      <Image
        source={require("../../assets/loading.gif")}
        contentFit="contain"
        style={{ width: ANIMATION_WIDTH, height: ANIMATION_WIDTH / ANIMATION_RATIO }}
      />
      <Text style={[styles.label, { color: theme.secondaryLabel }]}>TIP</Text>
      <Text style={[styles.tip, { color: theme.label }]}>{tip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  label: { marginTop: 28, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  tip: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: "center" },
});
