import { and, desc, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { Send, X } from "lucide-react-native";
import { useRef, useState, type ComponentRef } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { scheduleOnRN } from "react-native-worklets";

import {
  CARD_RATIO,
  GRID_COUNT,
  QrCard,
  StampCard,
} from "@/components/share-card";
import { StampMark, stampPalette } from "@/components/stamp";
import {
  Box,
  Icon,
  Pressable,
  RouteSheet,
  Screen,
  useSheetClose,
  TabStrip,
  Text,
  showToast,
} from "@/components/ui";
import { Duration, Springs } from "@/constants/motion";
import { db } from "@/db";
import { packs, stickerTags, stickers, tags, type Sticker } from "@/db/schema";
import { useTheme } from "@/hooks/use-theme";
import { Haptic } from "@/lib/haptics";
import { placeLabel } from "@/lib/location";

type CardStyle = "stamp" | "qr";
const STYLES: { key: CardStyle; label: string }[] = [
  { key: "stamp", label: "Stamp" },
  { key: "qr", label: "QR code" },
];
/** Stamps that follow the card on its way out. */
const TRAIL = 3;
const FLY = {
  duration: 460,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** Resolves once the shared value's animation has finished. */
const wait = (start: (done: () => void) => void) =>
  new Promise<void>((resolve) => start(resolve));
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Share sheet laid out like a small publication: a title block over a panel showing the card. Pick a
 * card style, then send: the card is pressed, flies off with a trail of stamps and is postmarked
 * before the system share sheet opens.
 */
function ShareBody() {
  const close = useSheetClose();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { stickerId } = useLocalSearchParams<{ stickerId: string }>();
  const id = Number(stickerId);
  const { data } = useLiveQuery(
    db.select().from(stickers).where(eq(stickers.id, id)).limit(1),
    [id],
  );
  const { data: tagRows } = useLiveQuery(
    db
      .select({ name: tags.name })
      .from(stickerTags)
      .innerJoin(tags, eq(tags.id, stickerTags.tagId))
      .where(eq(stickerTags.stickerId, id))
      .orderBy(tags.name),
    [id],
  );
  const sticker = data[0];
  const { data: packRows } = useLiveQuery(
    db
      .select({ name: packs.name })
      .from(packs)
      .where(eq(packs.id, sticker?.packId ?? -1)),
    [sticker?.packId],
  );

  const { data: others } = useLiveQuery(
    db
      .select()
      .from(stickers)
      .where(
        and(eq(stickers.packId, sticker?.packId ?? -1), ne(stickers.id, id)),
      )
      .orderBy(desc(stickers.id))
      .limit(GRID_COUNT),
    [sticker?.packId, id],
  );

  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [style, setStyle] = useState<CardStyle>("stamp");
  const [area, setArea] = useState(0);
  const [busy, setBusy] = useState(false);
  // 0 = card at rest, 1 = card gone; `press` squeezes it first; `mark` is the postmark stamping down.
  const fly = useSharedValue(0);
  const press = useSharedValue(0);
  const mark = useSharedValue(0);

  const panelPadding = 20;
  const cardWidth = Math.max(
    0,
    Math.min(
      windowWidth - 2 * 16 - 2 * panelPadding,
      300,
      (area - 24) / CARD_RATIO,
    ),
  );
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const tagNames = tagRows.map((tag) => tag.name);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fly.get(), [0, 0.7, 1], [1, 1, 0]),
    transform: [
      { translateX: interpolate(fly.get(), [0, 1], [0, 120]) },
      { translateY: interpolate(fly.get(), [0, 1], [0, -(cardHeight + 160)]) },
      { rotate: `${interpolate(fly.get(), [0, 1], [0, 10])}deg` },
      {
        scale:
          interpolate(press.get(), [0, 1], [1, 0.95]) *
          interpolate(fly.get(), [0, 1], [1, 0.6]),
      },
    ],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.get(),
    transform: [
      { rotate: "-14deg" },
      { scale: interpolate(mark.get(), [0, 1], [2.2, 1]) },
    ],
  }));

  const send = async () => {
    const card = cardRef.current;
    if (busy || !card || !sticker) return;
    setBusy(true);
    try {
      // Capture while the card is at rest, then play the send-off.
      const uri = await captureRef(card, { format: "png", quality: 1 });
      Haptic.tap();
      press.set(
        withTiming(1, {
          duration: Duration.fast,
          reduceMotion: ReduceMotion.System,
        }),
      );
      await pause(Duration.fast);
      await wait((done) =>
        fly.set(
          withTiming(1, FLY, (finished) => {
            if (finished) scheduleOnRN(done);
          }),
        ),
      );
      // The postmark lands as the share sheet is about to open.
      Haptic.success();
      mark.set(withSpring(1, Springs.snappy));
      await pause(520);
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      showToast(
        "Couldn’t Share",
        "Something went wrong while making the card.",
      );
    } finally {
      // Back from sharing: the postmark fades and the card settles in again.
      mark.set(
        withTiming(0, {
          duration: Duration.standard,
          reduceMotion: ReduceMotion.System,
        }),
      );
      press.set(0);
      fly.set(withDelay(Duration.standard, withSpring(0, Springs.gentle)));
      setBusy(false);
    }
  };

  const palette = sticker ? stampPalette(sticker.id) : undefined;
  const place = sticker ? placeLabel(sticker) : "";
  const made = sticker?.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const caption = sticker?.story?.trim();

  return (
    <Screen>
      {/* Top bar: close on the left, the send action on the right. */}
      <Box
        row
        align="center"
        px="lg"
        style={{
          paddingTop: 28,
          paddingBottom: 12,
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
        >
          <Box
            center
            radius="full"
            bg="systemFill"
            style={{ width: 40, height: 40 }}
          >
            <Icon icon={X} size={20} color="label" strokeWidth={2.25} />
          </Box>
        </Pressable>
        <Pressable
          feedback="scale"
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={busy || !sticker}
          onPress={send}
        >
          <Box
            row
            center
            gap="sm"
            radius="full"
            style={{
              height: 40,
              paddingHorizontal: 18,
              backgroundColor: theme.systemRed,
            }}
          >
            <Icon icon={Send} size={16} color="onTint" strokeWidth={2.25} />
            <Text variant="subheadline" weight="bold" color="onTint">
              Send
            </Text>
          </Box>
        </Pressable>
      </Box>

      {sticker ? (
        <Animated.View
          entering={FadeInDown.springify()
            .damping(24)
            .reduceMotion(ReduceMotion.System)}
          style={{ flex: 1, marginHorizontal: 16, marginBottom: 24 }}
        >
          <Box
            flex={1}
            bg="secondarySystemGroupedBackground"
            overflow="hidden"
            style={{ borderRadius: 28 }}
          >
            <Box
              row
              align="center"
              style={{
                paddingHorizontal: panelPadding,
                paddingVertical: 14,
                justifyContent: "space-between",
              }}
            >
              <Text
                variant="callout"
                style={{ fontFamily: "Calvino", fontWeight: "normal" }}
              >
                Stickerê
              </Text>
              <Text
                variant="caption1"
                color="secondaryLabel"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {[packRows[0]?.name, made].filter(Boolean).join(" · ")}
              </Text>
            </Box>
            <Box bg="separator" style={{ height: 1, opacity: 0.5 }} />

            <Box
              gap="sm"
              style={{
                paddingHorizontal: panelPadding,
                paddingTop: 20,
                paddingBottom: 16,
              }}
            >
              <Text
                weight="bold"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontSize: 34, lineHeight: 40, letterSpacing: -1 }}
              >
                {sticker.name}
              </Text>
              <Text
                variant="subheadline"
                color="secondaryLabel"
                numberOfLines={2}
              >
                {caption || place || "A sticker worth sending."}
              </Text>
            </Box>

            <TabStrip tabs={STYLES} value={style} onChange={setStyle} />

            <Box
              flex={1}
              center
              onLayout={(event) => setArea(event.nativeEvent.layout.height)}
            >
              {cardWidth > 0 ? (
                <Box style={{ width: cardWidth, height: cardHeight }}>
                  {/* Trail of small stamps that chase the card as it leaves. */}
                  {Array.from({ length: TRAIL }, (_, index) => (
                    <Trail
                      key={index}
                      index={index}
                      fly={fly}
                      sticker={sticker}
                    />
                  ))}
                  <Animated.View
                    // Changing the style plays the entrance again, so the card swaps with a little motion.
                    key={style}
                    entering={FadeInDown.duration(Duration.slow).reduceMotion(
                      ReduceMotion.System,
                    )}
                    style={cardStyle}
                  >
                    <View ref={cardRef} collapsable={false}>
                      {style === "stamp" ? (
                        <StampCard
                          sticker={sticker}
                          tags={tagNames}
                          width={cardWidth}
                          others={others}
                        />
                      ) : (
                        <QrCard
                          sticker={sticker}
                          tags={tagNames}
                          width={cardWidth}
                        />
                      )}
                    </View>
                  </Animated.View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        alignSelf: "center",
                        top: cardHeight / 2 - 52,
                        width: 104,
                        height: 104,
                        borderRadius: 52,
                        borderWidth: 3,
                        borderColor: palette?.panel,
                        backgroundColor: theme.secondarySystemGroupedBackground,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      markStyle,
                    ]}
                  >
                    <Text
                      variant="caption2"
                      weight="bold"
                      style={{ color: palette?.panel, letterSpacing: 1.5 }}
                    >
                      POSTED
                    </Text>
                    <Text variant="caption2" style={{ color: palette?.ink }}>
                      {new Date().toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </Animated.View>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

/** One small stamp that slips out behind the card, a little later each. */
function Trail({
  index,
  fly,
  sticker,
}: {
  index: number;
  fly: SharedValue<number>;
  sticker: Sticker;
}) {
  const style = useAnimatedStyle(() => {
    const lag = index * 0.12;
    const t = Math.min(1, Math.max(0, (fly.get() - lag) / (1 - lag)));
    return {
      opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 0.9, 0.9, 0]),
      transform: [
        { translateX: interpolate(t, [0, 1], [0, 150 + index * 40]) },
        { translateY: interpolate(t, [0, 1], [0, -260 - index * 70]) },
        { rotate: `${interpolate(t, [0, 1], [0, index % 2 ? 24 : -18])}deg` },
        { scale: interpolate(t, [0, 1], [0.8, 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: "35%", top: "40%" }, style]}
    >
      <StampMark sticker={sticker} width={48} />
    </Animated.View>
  );
}

export default function ShareSticker() {
  return (
    <RouteSheet>
      <ShareBody />
    </RouteSheet>
  );
}
