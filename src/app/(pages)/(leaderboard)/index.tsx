import {
  BookOpen,
  Film,
  Flame,
  Globe,
  Images,
  Layers,
  Moon,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeStamp, type Badge } from "@/components/badge-stamp";
import { Box, Icon, ScrollView, Text } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";

// UI only for now: fixed sample badges, no real progress behind them yet.
const BADGES: Badge[] = [
  {
    id: "first",
    title: "First Sticker",
    caption: "Made your first",
    icon: Sparkles,
    earned: true,
  },
  {
    id: "collector",
    title: "Collector",
    caption: "10 stickers",
    icon: Layers,
    earned: true,
  },
  {
    id: "traveler",
    title: "Globe Trotter",
    caption: "5 places",
    icon: Globe,
    earned: true,
  },
  {
    id: "storyteller",
    title: "Storyteller",
    caption: "3 of 5 stories",
    icon: BookOpen,
    earned: false,
  },
  {
    id: "packs",
    title: "Pack Leader",
    caption: "2 of 3 packs",
    icon: Images,
    earned: false,
  },
  {
    id: "animator",
    title: "Animator",
    caption: "Make a GIF sticker",
    icon: Film,
    earned: false,
  },
  {
    id: "sharer",
    title: "Show Off",
    caption: "Share 5 stickers",
    icon: Share2,
    earned: false,
  },
  {
    id: "owl",
    title: "Night Owl",
    caption: "Make one at night",
    icon: Moon,
    earned: false,
  },
  {
    id: "streak",
    title: "On Fire",
    caption: "7-day streak",
    icon: Flame,
    earned: false,
  },
];

const COLUMNS = 2;

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { width: screenWidth } = useWindowDimensions();

  const earned = BADGES.filter((badge) => badge.earned).length;
  const cell =
    (screenWidth - 2 * Spacing.lg - (COLUMNS - 1) * Spacing.lg) / COLUMNS;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: tabInset + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xl,
      }}
    >
      <Box row align="center" gap="md">
        <Box
          center
          bg="systemBlue"
          radius="full"
          style={{ width: 44, height: 44 }}
        >
          <Icon icon={Trophy} size={22} color="onTint" />
        </Box>
        <Box flex={1}>
          <Text variant="title3" weight="bold">
            Trophies
          </Text>
          <Text variant="subheadline" color="secondaryLabel">
            {earned} of {BADGES.length} earned
          </Text>
        </Box>
      </Box>

      <Box row style={{ flexWrap: "wrap", gap: Spacing.lg }}>
        {BADGES.map((badge, index) => (
          <BadgeStamp key={badge.id} badge={badge} index={index} width={cell} />
        ))}
      </Box>
    </ScrollView>
  );
}
