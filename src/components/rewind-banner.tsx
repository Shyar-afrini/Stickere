import { and, desc, gte, lt } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useRouter } from "expo-router";
import { Play } from "lucide-react-native";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { StampMark } from "@/components/stamp";
import { Blur, Box, Icon, Pressable, Text } from "@/components/ui";
import { Drift } from "@/constants/motion";
import { db } from "@/db";
import { inOpenPack } from "@/db/filters";
import { stickers } from "@/db/schema";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";

const HEIGHT = 188;
const TILT = ["-9deg", "5deg", "-3deg"];

const BLOB = 260;

type BlobProps = {
  progress: SharedValue<number>;
  id: string;
  color: string;
  /** Where the blob rests, and how far it drifts from there. */
  x: number;
  y: number;
  dx: number;
  dy: number;
};

/** A soft colour glow that slowly drifts back and forth. */
function Blob({ progress, id, color, x, y, dx, dy }: BlobProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + dx * (progress.get() * 2 - 1) },
      { translateY: y + dy * (progress.get() * 2 - 1) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: 0, top: 0, width: BLOB, height: BLOB },
        style,
      ]}
    >
      <Svg width={BLOB} height={BLOB}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={BLOB / 2} cy={BLOB / 2} r={BLOB / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The home-screen card that opens the year's Rewind, like Spotify's Wrapped banner: a bold gradient card
 * with the year, a line of copy, tilted stamps of recent stickers and a white "See your Rewind" pill.
 * Hidden until a sticker has been made this year.
 */
export function RewindBanner() {
  const router = useRouter();
  const theme = useTheme();
  const year = new Date().getFullYear();

  // Two out-of-step loops, so the colours never line up the same way twice in a row.
  const a = useSharedValue(0);
  const b = useSharedValue(0.5);
  useEffect(() => {
    a.set(withRepeat(withTiming(1, Drift), -1, true));
    b.set(
      withRepeat(
        withTiming(0, { ...Drift, duration: Drift.duration * 1.4 }),
        -1,
        true,
      ),
    );
  }, [a, b]);

  const { data: recent } = useLiveQuery(
    db
      .select()
      .from(stickers)
      .where(
        and(
          inOpenPack(),
          gte(stickers.createdAt, new Date(year, 0, 1)),
          lt(stickers.createdAt, new Date(year + 1, 0, 1)),
        ),
      )
      .orderBy(desc(stickers.id))
      .limit(3),
    [year],
  );

  if (recent.length === 0) return null;

  const open = () => {
    Haptic.tap();
    router.push("/rewind" as never);
  };

  return (
    <Pressable
      feedback="scale"
      accessibilityRole="button"
      accessibilityLabel={`Your ${year} Rewind. See your Rewind`}
      onPress={open}
      style={{ marginBottom: 20 }}
    >
      <Blur
        style={{
          height: HEIGHT,
          borderRadius: Radius.xl,
          borderCurve: "continuous",
        }}
      >
        {/* Colour glows drift slowly over the frosted surface, like the tab bar's glass over the page. */}
        <Blob
          progress={a}
          id="rw-a"
          color={theme.systemIndigo}
          x={-70}
          y={-80}
          dx={60}
          dy={30}
        />
        <Blob
          progress={b}
          id="rw-b"
          color={theme.systemPink}
          x={150}
          y={-20}
          dx={-70}
          dy={50}
        />
        <Blob
          progress={a}
          id="rw-c"
          color={theme.systemPurple}
          x={60}
          y={60}
          dx={80}
          dy={-40}
        />
        <Blob
          progress={b}
          id="rw-d"
          color={theme.systemCyan}
          x={-40}
          y={90}
          dx={50}
          dy={-30}
        />

        {/* The stamps pile up on the right edge, partly running off the card. */}
        <Box
          style={{
            position: "absolute",
            right: -14,
            top: 18,
            width: 150,
            height: 160,
          }}
        >
          {recent.map((sticker, index) => (
            <Box
              key={sticker.id}
              style={{
                position: "absolute",
                right: index * 26,
                top: index * 14,
                transform: [{ rotate: TILT[index] }],
              }}
            >
              <StampMark sticker={sticker} width={70 - index * 6} />
            </Box>
          ))}
        </Box>

        <Box style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
          <Box gap="xs" style={{ maxWidth: "62%" }}>
            <Text
              variant="callout"
              weight="semibold"
              color="onTint"
              style={{ fontFamily: "Calvino", fontWeight: "normal" }}
            >
              Stickerê
            </Text>
            <Text variant="title1" weight="bold" color="onTint">
              {year} Rewind
            </Text>
            <Text variant="footnote" color="onTint">
              Your year in stickers is ready.
            </Text>
          </Box>

          <Box
            row
            align="center"
            gap="sm"
            bg="onTint"
            radius="full"
            style={{
              alignSelf: "flex-start",
              paddingVertical: 10,
              paddingLeft: 14,
              paddingRight: 18,
            }}
          >
            <Icon
              icon={Play}
              size={14}
              color="systemIndigo"
              strokeWidth={2.5}
            />
            <Text
              variant="subheadline"
              weight="bold"
              style={{ color: theme.systemIndigo }}
            >
              See your Rewind
            </Text>
          </Box>
        </Box>
      </Blur>
    </Pressable>
  );
}
