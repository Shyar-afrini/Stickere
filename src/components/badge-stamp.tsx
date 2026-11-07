import { Check, Lock, type LucideIcon } from "lucide-react-native";

import { StampFrame, stampPalette } from "@/components/stamp";
import { Box, Icon, Text } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";

export type Badge = {
  id: string;
  title: string;
  /** What earns it, or how far along it is. */
  caption: string;
  icon: LucideIcon;
  earned: boolean;
};

/**
 * A trophy badge drawn as a perforated stamp, like the sticker stamps. Earned badges are in colour with a
 * check; locked ones are grey with a lock.
 */
export function BadgeStamp({
  badge,
  index,
  width,
}: {
  badge: Badge;
  index: number;
  width: number;
}) {
  const theme = useTheme();
  const palette = stampPalette(index);
  const height = Math.round(width * 1.22);
  const margin = Math.round(width * 0.1);

  const paper = badge.earned ? palette.paper : theme.systemGray5;
  const panel = badge.earned ? palette.panel : theme.systemGray4;

  return (
    <StampFrame
      width={width}
      height={height}
      paper={paper}
      hole={Math.max(3, width * 0.028)}
    >
      <Box style={{ flex: 1, padding: margin }}>
        <Box
          center
          style={{
            flex: 1,
            borderRadius: 14,
            backgroundColor: panel,
            overflow: "hidden",
          }}
          accessibilityElementsHidden
        >
          <Icon
            icon={badge.icon}
            size={Math.round(width * 0.36)}
            color={badge.earned ? "onTint" : "systemGray2"}
            strokeWidth={1.75}
          />
          <Box
            center
            bg={badge.earned ? "onTint" : "systemGray3"}
            radius="full"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 22,
              height: 22,
            }}
          >
            <Icon
              icon={badge.earned ? Check : Lock}
              size={13}
              strokeWidth={2.75}
              color={badge.earned ? "systemGreen" : "systemGray"}
            />
          </Box>
        </Box>
        <Box center style={{ paddingTop: 8, paddingHorizontal: 2, gap: 1 }}>
          <Text
            variant="subheadline"
            weight="bold"
            numberOfLines={1}
            style={{ color: badge.earned ? palette.ink : theme.secondaryLabel }}
          >
            {badge.title}
          </Text>
          <Text
            variant="caption2"
            numberOfLines={1}
            style={{ color: theme.secondaryLabel }}
          >
            {badge.caption}
          </Text>
        </Box>
      </Box>
    </StampFrame>
  );
}
