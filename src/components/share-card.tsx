import { useMemo } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Rect,
  Stop,
} from "react-native-svg";

import { Stamp, StampFrame, StampMark, stampPalette } from "@/components/stamp";
import { Box, Text } from "@/components/ui";
import type { Sticker } from "@/db/schema";
import { placeLabel } from "@/lib/location";

/** Share cards are this many times as high as they are wide. */
export const CARD_RATIO = 1.72;

/** Warm craft paper and the dark brown ink printed on it. */
const PAPER = "#D6CBB1";
const PAPER_EDGE = "#C4B796";
const INK = "#3B2F1E";
const GRID_COLUMNS = 3;
const GRID_ROWS = 2;
export const GRID_COUNT = GRID_COLUMNS * GRID_ROWS;

type CardProps = {
  sticker: Sticker;
  tags: string[];
  width: number;
  /** Other stickers of the same pack, shown as a grid of small stamps. */
  others?: Sticker[];
};

/** What the QR code opens: the place in maps when there is one, otherwise a short note. */
function qrValue(sticker: Sticker, tags: string[]) {
  if (sticker.latitude != null && sticker.longitude != null) {
    return `https://maps.google.com/?q=${sticker.latitude},${sticker.longitude}`;
  }
  const hashtags = tags.map((tag) => `#${tag}`).join(" ");
  return ["Stickerê", [sticker.name, ...sticker.emojis].join(" "), hashtags]
    .filter(Boolean)
    .join(" · ");
}

/** Paper with a soft vignette and a scatter of fibres and specks, the same for the same sticker. */
function Paper({
  width,
  height,
  seed,
}: {
  width: number;
  height: number;
  seed: number;
}) {
  const marks = useMemo(() => {
    // A stable pseudo-random value per mark and field, so the same sticker always gets the same paper.
    const random = (index: number, field: number) => {
      const value =
        Math.sin(seed * 12.9898 + index * 78.233 + field * 37.719) * 43758.5453;
      return value - Math.floor(value);
    };
    return Array.from({ length: 90 }, (_, index) => ({
      key: index,
      x: random(index, 0) * width,
      y: random(index, 1) * height,
      length: 2 + random(index, 2) * 7,
      angle: random(index, 3) * Math.PI,
      dark: random(index, 4) > 0.35,
      speck: random(index, 5) > 0.55,
    }));
  }, [seed, width, height]);

  return (
    <Svg width={width} height={height} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id={`paper-${seed}`} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor={PAPER} />
          <Stop offset="1" stopColor={PAPER_EDGE} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#paper-${seed})`} />
      {marks.map((mark) =>
        mark.speck ? (
          <Circle
            key={mark.key}
            cx={mark.x}
            cy={mark.y}
            r={0.6 + mark.length / 8}
            fill={mark.dark ? "rgba(90,70,40,0.18)" : "rgba(255,255,255,0.28)"}
          />
        ) : (
          <Line
            key={mark.key}
            x1={mark.x}
            y1={mark.y}
            x2={mark.x + Math.cos(mark.angle) * mark.length}
            y2={mark.y + Math.sin(mark.angle) * mark.length}
            stroke={mark.dark ? "rgba(90,70,40,0.16)" : "rgba(255,255,255,0.3)"}
            strokeWidth={0.7}
          />
        ),
      )}
    </Svg>
  );
}

function Frame({
  sticker,
  width,
  children,
}: {
  sticker: Sticker;
  width: number;
  children: React.ReactNode;
}) {
  const height = Math.round(width * CARD_RATIO);

  return (
    <View
      collapsable={false}
      style={{
        width,
        height,
        borderRadius: 22,
        borderCurve: "continuous",
        overflow: "hidden",
      }}
    >
      <Paper width={width} height={height} seed={sticker.id + 1} />
      <Box style={{ flex: 1, padding: width * 0.075, alignItems: "center" }}>
        {children}
      </Box>
    </View>
  );
}

/** Name, place and date, the caption in handwriting, and the wordmark. */
function Footer({ sticker, tags }: Pick<CardProps, "sticker" | "tags">) {
  const place = placeLabel(sticker);
  const made = sticker.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const caption = sticker.story?.trim();

  return (
    <Box
      row
      align="flex-end"
      gap="md"
      style={{ alignSelf: "stretch", justifyContent: "space-between" }}
    >
      <Box style={{ flex: 1, gap: 2 }}>
        <Text
          variant="headline"
          weight="bold"
          numberOfLines={1}
          style={{ color: INK }}
        >
          {[sticker.name, ...sticker.emojis].join(" ")}
        </Text>
        <Text
          variant="caption1"
          numberOfLines={1}
          style={{ color: INK, opacity: 0.75 }}
        >
          {[place, made].filter(Boolean).join(" · ")}
        </Text>
        {caption ? (
          <Text
            numberOfLines={2}
            style={{
              color: INK,
              fontFamily: "Caveat",
              fontWeight: "normal",
              fontSize: 19,
              lineHeight: 20,
              letterSpacing: 0,
            }}
          >
            {caption}
          </Text>
        ) : tags.length > 0 ? (
          <Text
            variant="caption2"
            numberOfLines={1}
            style={{ color: INK, opacity: 0.75 }}
          >
            {tags.map((tag) => `#${tag}`).join("  ")}
          </Text>
        ) : null}
      </Box>
      <Text
        variant="callout"
        style={{ color: INK, fontFamily: "Calvino", fontWeight: "normal" }}
      >
        Stickerê
      </Text>
    </Box>
  );
}

/** The stamp large at the top, a grid of the pack's other stamps below it, the details at the bottom. */
export function StampCard({ sticker, tags, width, others = [] }: CardProps) {
  const inner = width * (1 - 0.15);
  const bigWidth = Math.round(inner * 0.58);
  const gap = Math.round(width * 0.04);
  const small = Math.floor(
    (inner * 0.9 - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );
  const rows = Array.from({ length: GRID_ROWS }, (_, row) =>
    others.slice(row * GRID_COLUMNS, row * GRID_COLUMNS + GRID_COLUMNS),
  ).filter((row) => row.length > 0);

  return (
    <Frame sticker={sticker} width={width}>
      <Stamp sticker={sticker} width={bigWidth} />
      <Box
        style={{ flex: 1, justifyContent: "center", gap, paddingVertical: gap }}
      >
        {rows.map((row, index) => (
          <Box key={index} row center style={{ gap }}>
            {row.map((other) => (
              <StampMark key={other.id} sticker={other} width={small} />
            ))}
          </Box>
        ))}
      </Box>
      <Footer sticker={sticker} tags={tags} />
    </Frame>
  );
}

/** A large QR code on its own perforated paper, with the details under it. */
export function QrCard({ sticker, tags, width }: CardProps) {
  const palette = stampPalette(sticker.id);
  const inner = width * (1 - 0.15);
  const frame = Math.round(inner * 0.9);
  const qr = frame - 56;

  return (
    <Frame sticker={sticker} width={width}>
      <Box
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <StampFrame width={frame} height={frame} paper="#FFFFFF">
          <Box center style={{ flex: 1 }}>
            <QRCode
              value={qrValue(sticker, tags)}
              size={qr}
              color="#111111"
              backgroundColor="#FFFFFF"
            />
          </Box>
        </StampFrame>
        <Text
          variant="caption1"
          weight="semibold"
          style={{ color: palette.ink }}
        >
          {sticker.latitude != null
            ? "Scan to open this place"
            : "Scan to read the details"}
        </Text>
      </Box>
      <Footer sticker={sticker} tags={tags} />
    </Frame>
  );
}
