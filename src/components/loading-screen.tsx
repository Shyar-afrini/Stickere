import { Image } from "expo-image";
import { useState } from "react";

import { Box, Text } from "@/components/ui";

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
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  return (
    <Box flex={1} center bg="systemGroupedBackground" style={{ paddingHorizontal: 40 }}>
      <Image
        source={require("../../assets/loading.gif")}
        contentFit="contain"
        style={{ width: ANIMATION_WIDTH, height: ANIMATION_WIDTH / ANIMATION_RATIO }}
      />
      <Text variant="caption1" weight="bold" color="secondaryLabel" style={{ marginTop: 28, letterSpacing: 1.2 }}>
        TIP
      </Text>
      <Text variant="callout" align="center" style={{ marginTop: 6 }}>
        {tip}
      </Text>
    </Box>
  );
}
