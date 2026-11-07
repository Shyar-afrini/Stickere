import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Stamp, StampMark } from "@/components/stamp";
import { Box, Chip, Icon, Pressable, Text } from "@/components/ui";
import { Duration, Stagger } from "@/constants/motion";
import { Spacing, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";
import type { Sticker } from "@/db/schema";
import type { Rewind } from "@/lib/rewind";

/** How long each slide stays before the next one starts. */
const SLIDE_MS = 5500;
const TILT = ["-8deg", "6deg", "-4deg", "9deg", "-6deg", "4deg"];

const STAMP_WIDTH = 104;
/** Seconds for one stamp to cross the screen. */
const CROSSING_MS = 16000;

/** One stamp riding the diagonal from the top right to the bottom left, wrapping round forever. */
function ConveyorStamp({
  sticker,
  index,
  progress,
  count,
  width,
  height,
}: {
  sticker: Sticker;
  index: number;
  count: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  // The even stamps ride a lane further back: smaller and a little dimmer, for depth.
  const back = index % 2 === 0;
  const style = useAnimatedStyle(() => {
    const t = (index / count + progress.get()) % 1;
    // Travel from beyond the top-right corner to beyond the bottom-left one.
    const travelX = -(width + 2 * STAMP_WIDTH);
    const travelY = height + 2 * STAMP_WIDTH;
    // Two lanes, offset sideways from the diagonal, so the stamps form a ribbon.
    const lane = back ? -1 : 1;
    const length = Math.hypot(travelX, travelY);
    const side = lane * 62;
    return {
      transform: [
        {
          translateX:
            width + STAMP_WIDTH * 0.5 + t * travelX + (travelY / length) * side,
        },
        {
          translateY:
            -STAMP_WIDTH * 1.5 + t * travelY + (-travelX / length) * side,
        },
        { rotate: TILT[index % TILT.length] },
        { scale: back ? 0.8 : 1 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: 0, top: 0, opacity: back ? 0.7 : 1 },
        style,
      ]}
    >
      <StampMark sticker={sticker} width={STAMP_WIDTH} />
    </Animated.View>
  );
}

/**
 * Backdrop of the opening slide: stamps drift from the top right to the bottom left under a dark
 * tint, so the title above stays readable.
 */
function StampConveyor({ stickers }: { stickers: Sticker[] }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withRepeat(
        withTiming(1, {
          duration: CROSSING_MS,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  // Each sticker once, spaced evenly along the path.
  const shown = stickers.slice(0, 10);

  return (
    <Box pointerEvents="none" overflow="hidden" style={StyleSheet.absoluteFill}>
      {shown.map((sticker, index) => (
        <ConveyorStamp
          key={sticker.id}
          sticker={sticker}
          index={index}
          count={shown.length}
          progress={progress}
          width={width}
          height={height}
        />
      ))}
      {/* Dark tint over the stamps, so the title above stays readable. */}
      <Box
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.5)" },
        ]}
      />
    </Box>
  );
}

type Slide = { key: string; background: ThemeColor; content: ReactNode };

/** Content that rises in, one piece after another. */
function Reveal({
  order = 0,
  children,
}: {
  order?: number;
  children: ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(Duration.slow)
        .delay(order * Stagger + Stagger)
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

const Kicker = ({ children }: { children: string }) => (
  <Text variant="title3" weight="semibold" color="onTint" align="center">
    {children}
  </Text>
);

const Giant = ({ children }: { children: string | number }) => (
  <Animated.View
    entering={ZoomIn.duration(Duration.slow)
      .delay(Stagger * 2)
      .reduceMotion(ReduceMotion.System)}
  >
    <Text
      weight="bold"
      color="onTint"
      align="center"
      adjustsFontSizeToFit
      numberOfLines={1}
      style={{ fontSize: 104, lineHeight: 112, letterSpacing: -2 }}
    >
      {children}
    </Text>
  </Animated.View>
);

const Note = ({ children }: { children: string }) => (
  <Text variant="title3" color="onTint" align="center">
    {children}
  </Text>
);

function buildSlides(rewind: Rewind): Slide[] {
  const {
    total,
    packCount,
    topPlaces,
    topEmojis,
    topTags,
    busiestMonth,
    storyCount,
    featured,
    recent,
  } = rewind;
  const slides: Slide[] = [];

  slides.push({
    key: "intro",
    background: "systemIndigo",
    content: (
      <>
        <StampConveyor stickers={recent} />
        <Reveal order={4}>
          <Text
            variant="title3"
            color="onTint"
            align="center"
            style={{ fontFamily: "Calvino", fontWeight: "normal" }}
          >
            Stickerê
          </Text>
        </Reveal>
        <Reveal order={5}>
          <Text
            weight="bold"
            color="onTint"
            align="center"
            style={{ fontSize: 56, lineHeight: 62 }}
          >
            {rewind.year} Rewind
          </Text>
        </Reveal>
        <Reveal order={6}>
          <Note>Your year in stickers.</Note>
        </Reveal>
      </>
    ),
  });

  slides.push({
    key: "total",
    background: "systemPink",
    content: (
      <>
        <Reveal>
          <Kicker>This year you made</Kicker>
        </Reveal>
        <Giant>{total}</Giant>
        <Reveal order={3}>
          <Note>{total === 1 ? "sticker" : "stickers"}</Note>
        </Reveal>
        {packCount > 0 && (
          <Reveal order={4}>
            <Text variant="callout" color="onTint" align="center">
              {`in ${packCount} ${packCount === 1 ? "pack" : "packs"}, on ${rewind.activeDays} different ${
                rewind.activeDays === 1 ? "day" : "days"
              }.`}
            </Text>
          </Reveal>
        )}
      </>
    ),
  });

  if (topPlaces.length > 0) {
    slides.push({
      key: "place",
      background: "systemTeal",
      content: (
        <>
          <Reveal>
            <Kicker>Your favourite place</Kicker>
          </Reveal>
          <Reveal order={1}>
            <Text
              weight="bold"
              color="onTint"
              align="center"
              style={{ fontSize: 48, lineHeight: 54 }}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {topPlaces[0].label}
            </Text>
          </Reveal>
          <Reveal order={2}>
            <Note>{`${topPlaces[0].count} ${topPlaces[0].count === 1 ? "sticker" : "stickers"} started here`}</Note>
          </Reveal>
          {topPlaces.length > 1 && (
            <Reveal order={4}>
              <Box gap="xs">
                {topPlaces.slice(1).map((place, index) => (
                  <Text
                    key={place.label}
                    variant="callout"
                    color="onTint"
                    align="center"
                  >
                    {`${index + 2}. ${place.label}`}
                  </Text>
                ))}
              </Box>
            </Reveal>
          )}
        </>
      ),
    });
  }

  if (topEmojis.length > 0 || topTags.length > 0) {
    slides.push({
      key: "vibe",
      background: "systemOrange",
      content: (
        <>
          <Reveal>
            <Kicker>Your sticker mood</Kicker>
          </Reveal>
          {topEmojis.length > 0 && (
            <Reveal order={1}>
              <Text align="center" style={{ fontSize: 56, lineHeight: 70 }}>
                {topEmojis.map((emoji) => emoji.label).join(" ")}
              </Text>
            </Reveal>
          )}
          {topTags.length > 0 && (
            <Reveal order={3}>
              <Box row gap="sm" center style={{ flexWrap: "wrap" }}>
                {topTags.map((tag) => (
                  <Chip key={tag.label} label={tag.label} />
                ))}
              </Box>
            </Reveal>
          )}
        </>
      ),
    });
  }

  if (busiestMonth) {
    slides.push({
      key: "month",
      background: "systemPurple",
      content: (
        <>
          <Reveal>
            <Kicker>You were busiest in</Kicker>
          </Reveal>
          <Reveal order={1}>
            <Text
              weight="bold"
              color="onTint"
              align="center"
              style={{ fontSize: 64, lineHeight: 72 }}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {busiestMonth.name}
            </Text>
          </Reveal>
          <Reveal order={3}>
            <Note>{`${busiestMonth.count} ${busiestMonth.count === 1 ? "sticker" : "stickers"} that month`}</Note>
          </Reveal>
        </>
      ),
    });
  }

  if (featured) {
    slides.push({
      key: "memory",
      background: "systemBlue",
      content: (
        <>
          <Reveal>
            <Kicker>
              {storyCount > 1
                ? `${storyCount} memories written down`
                : "A memory you wrote down"}
            </Kicker>
          </Reveal>
          <Animated.View
            entering={ZoomIn.duration(Duration.slow)
              .delay(Stagger)
              .reduceMotion(ReduceMotion.System)}
            style={{ transform: [{ rotate: "-3deg" }] }}
          >
            <Stamp sticker={featured} width={210} />
          </Animated.View>
          <Reveal order={3}>
            <Text
              variant="callout"
              color="onTint"
              align="center"
              numberOfLines={4}
            >
              {`“${featured.story}”`}
            </Text>
          </Reveal>
        </>
      ),
    });
  }

  slides.push({
    key: "outro",
    background: "systemIndigo",
    content: (
      <>
        <Reveal>
          <Text
            weight="bold"
            color="onTint"
            align="center"
            style={{ fontSize: 52, lineHeight: 58 }}
          >
            That’s a wrap.
          </Text>
        </Reveal>
        <Reveal order={2}>
          <Note>{`Here’s to more stickers in ${rewind.year + 1}.`}</Note>
        </Reveal>
      </>
    ),
  });

  return slides;
}

/** One segment of the bar along the top: full once passed, filling now, empty after. */
function Segment({
  state,
  progress,
}: {
  state: "past" | "current" | "future";
  progress: SharedValue<number>;
}) {
  const theme = useTheme();
  const fill = useAnimatedStyle(() => ({
    width: `${(state === "past" ? 1 : state === "current" ? progress.get() : 0) * 100}%`,
  }));

  return (
    <Box flex={1} radius="full" overflow="hidden" style={{ height: 3 }}>
      <Box
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.onTint, opacity: 0.35 },
        ]}
      />
      <Animated.View
        style={[{ height: "100%", backgroundColor: theme.onTint }, fill]}
      />
    </Box>
  );
}

/**
 * Full-screen, tap-through story of the year, like Spotify Wrapped: a progress bar per slide, tap the
 * right side for the next slide and the left for the previous one, hold to pause, X to close.
 */
export function RewindStory({ rewind }: { rewind: Rewind }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const slides = buildSlides(rewind);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);

  const close = () => router.back();
  const go = (next: number) => {
    if (next < 0) return;
    if (next >= slides.length) return close();
    Haptic.selection();
    setIndex(next);
  };

  // The slide showing now, so a bar that finishes late (after a tap already moved on) is ignored.
  const current = useRef(index);
  useEffect(() => {
    current.current = index;
  }, [index]);

  /** The bar of slide `from` filled up: move on, unless the slide has already changed. */
  const advance = (from: number) => {
    if (current.current === from) go(from + 1);
  };

  const play = (from: number) => {
    if (reduceMotion) return;
    const slide = index;
    progress.set(
      withTiming(
        1,
        { duration: SLIDE_MS * (1 - from), easing: Easing.linear },
        (finished) => {
          if (finished) scheduleOnRN(advance, slide);
        },
      ),
    );
  };

  // Each slide starts its bar from empty (with Reduce Motion on, slides only move when tapped).
  // Starting a new animation replaces the one before it, so nothing is cancelled here: cancelling in
  // a cleanup could land after the new bar had started and leave it stuck.
  useEffect(() => {
    progress.set(0);
    play(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const hold = () => cancelAnimation(progress);
  const release = () => play(progress.get());

  const slide = slides[index];

  return (
    <Box flex={1} style={{ backgroundColor: theme[slide.background] }}>
      {/* The content is remounted per slide so its entrance animations play again. */}
      <Box
        key={slide.key}
        center
        flex={1}
        gap="lg"
        style={{
          paddingHorizontal: Spacing.xxl,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {slide.content}
      </Box>

      {/* Tap zones: left third goes back, the rest goes forward; holding anywhere pauses. */}
      <Box row style={StyleSheet.absoluteFill}>
        <Pressable
          feedback="none"
          accessibilityLabel="Previous"
          style={{ flex: 1 }}
          onPressIn={hold}
          onPressOut={release}
          onPress={() => go(index - 1)}
        />
        <Pressable
          feedback="none"
          accessibilityLabel="Next"
          style={{ flex: 2 }}
          onPressIn={hold}
          onPressOut={release}
          onPress={() => go(index + 1)}
        />
      </Box>

      <Box
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: insets.top + Spacing.sm,
          paddingHorizontal: Spacing.md,
          gap: Spacing.md,
        }}
      >
        <Box row gap="xs">
          {slides.map((item, position) => (
            <Segment
              key={item.key}
              progress={progress}
              state={
                position < index
                  ? "past"
                  : position === index
                    ? "current"
                    : "future"
              }
            />
          ))}
        </Box>
        <Box row justify="flex-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={close}
          >
            <Icon icon={X} size={26} color="onTint" strokeWidth={2.25} />
          </Pressable>
        </Box>
      </Box>
    </Box>
  );
}
