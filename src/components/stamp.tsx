import { useId, useState, type ReactNode } from "react";
import { PanResponder } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";

import { Box, Image, Text } from "@/components/ui";
import { Springs } from "@/constants/motion";
import { Colors } from "@/constants/theme";
import type { Sticker } from "@/db/schema";
import { placeLabel } from "@/lib/location";
import { getStickerUri } from "@/lib/sticker-storage";

// Pastel paper, an iOS system color panel for the artwork and a dark ink for the caption.
const PALETTES = [
  { paper: "#E8F0FE", panel: Colors.light.systemBlue, ink: "#1D3FB8" },
  { paper: "#FDEBE8", panel: Colors.light.systemRed, ink: "#7A1F12" },
  { paper: "#FFF4DD", panel: Colors.light.systemOrange, ink: "#7A5410" },
  { paper: "#E6F6EC", panel: Colors.light.systemGreen, ink: "#14502F" },
  { paper: "#F1E9FB", panel: Colors.light.systemPurple, ink: "#43237E" },
];

const MARGIN = 22;
/** How far a drag has to go to turn the card all the way round. */
const FLIP_DISTANCE = 180;
const CAPTION = 64;

export const stampPalette = (id: number) => PALETTES[id % PALETTES.length];

/** Perforated paper of the given size; children are laid out on top of it. */
export function StampFrame({
  width,
  height,
  paper,
  hole = 5,
  children,
}: {
  width: number;
  height: number;
  paper: string;
  /** Radius of the perforation holes; they are spaced 3.2 radii apart. */
  hole?: number;
  children?: ReactNode;
}) {
  const maskId = `perforation-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const step = hole * 3.2;

  // Holes along every edge, evenly spread and centered.
  const holes = (length: number) => {
    const count = Math.floor(length / step);
    const start = (length - (count - 1) * step) / 2;
    return Array.from({ length: count }, (_, index) => start + index * step);
  };

  return (
    <Box style={{ width, height }}>
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        <Defs>
          <Mask id={maskId} x={0} y={0} width={width} height={height}>
            <Rect width={width} height={height} fill="#fff" />
            {holes(width).flatMap((x) => [
              <Circle key={`t${x}`} cx={x} cy={0} r={hole} fill="#000" />,
              <Circle key={`b${x}`} cx={x} cy={height} r={hole} fill="#000" />,
            ])}
            {holes(height).flatMap((y) => [
              <Circle key={`l${y}`} cx={0} cy={y} r={hole} fill="#000" />,
              <Circle key={`r${y}`} cx={width} cy={y} r={hole} fill="#000" />,
            ])}
          </Mask>
        </Defs>
        <Rect
          width={width}
          height={height}
          fill={paper}
          mask={`url(#${maskId})`}
        />
      </Svg>
      {children}
    </Box>
  );
}

/** Perforated stamp showing one sticker. */
export function Stamp({ sticker, width }: { sticker: Sticker; width: number }) {
  const palette = stampPalette(sticker.id);
  const height = Math.round(width * 1.22);

  return (
    <StampFrame width={width} height={height} paper={palette.paper}>
      <Box style={{ flex: 1, padding: MARGIN }}>
        <Box
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: palette.panel,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: getStickerUri(sticker.path) }}
            contentFit="contain"
            style={{ width: "100%", height: "100%" }}
          />
        </Box>
        <Box
          style={{
            height: CAPTION,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 8,
          }}
        >
          <Text
            variant="title2"
            weight="bold"
            numberOfLines={1}
            style={{ color: palette.ink }}
          >
            {[sticker.name, ...sticker.emojis].join(" ")}
          </Text>
        </Box>
      </Box>
    </StampFrame>
  );
}

/** Small stamp without a caption, for map markers. */
export function StampMark({
  sticker,
  width,
}: {
  sticker: Sticker;
  width: number;
}) {
  const palette = stampPalette(sticker.id);
  const margin = Math.round(width * 0.14);

  return (
    <StampFrame
      width={width}
      height={Math.round(width * 1.2)}
      paper={palette.paper}
      hole={2.5}
    >
      <Box
        style={{
          flex: 1,
          margin,
          borderRadius: 5,
          backgroundColor: palette.panel,
          padding: 3,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: getStickerUri(sticker.path) }}
          contentFit="contain"
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
    </StampFrame>
  );
}

type BackProps = {
  sticker: Sticker;
  width: number;
  packName?: string | null;
  tags: string[];
};

/** The back of a stamp: the caption in handwriting, then where and when it was made, and its tags. */
export function StampBack({ sticker, width, packName, tags }: BackProps) {
  const palette = stampPalette(sticker.id);
  const height = Math.round(width * 1.22);
  const place = placeLabel(sticker);
  const made = sticker.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const caption = sticker.story?.trim();

  return (
    <StampFrame width={width} height={height} paper={palette.paper}>
      <Box
        style={{
          flex: 1,
          padding: MARGIN,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box style={{ alignItems: "center", gap: 2 }}>
          {packName ? (
            <Text
              variant="caption1"
              weight="bold"
              style={{ color: palette.panel, letterSpacing: 1.2 }}
            >
              {packName.toUpperCase()}
            </Text>
          ) : null}
          <Text
            variant="title3"
            weight="bold"
            numberOfLines={1}
            style={{ color: palette.ink }}
          >
            {sticker.name}
          </Text>
        </Box>

        <Box
          style={{
            flex: 1,
            justifyContent: "center",
            paddingVertical: 12,
            paddingHorizontal: 4,
          }}
        >
          <Text
            align="center"
            numberOfLines={7}
            adjustsFontSizeToFit
            style={{
              fontFamily: "Caveat",
              fontWeight: "normal",
              fontSize: 26,
              lineHeight: 30,
              letterSpacing: 0,
              color: palette.ink,
              opacity: caption ? 1 : 0.45,
              transform: [{ rotate: "-2deg" }],
            }}
          >
            {caption || "No caption yet…"}
          </Text>
        </Box>

        <Box style={{ alignItems: "center", gap: 2, paddingHorizontal: 6 }}>
          {place ? (
            <Text
              variant="footnote"
              weight="semibold"
              align="center"
              numberOfLines={2}
              style={{ color: palette.ink }}
            >
              {place}
            </Text>
          ) : null}
          <Text
            variant="caption1"
            align="center"
            style={{ color: palette.ink, opacity: 0.8 }}
          >
            Made {made}
          </Text>
          {tags.length > 0 ? (
            <Text
              variant="caption1"
              align="center"
              numberOfLines={1}
              style={{ color: palette.panel }}
            >
              {tags.map((tag) => `#${tag}`).join("  ")}
            </Text>
          ) : null}
        </Box>
      </Box>
    </StampFrame>
  );
}

/**
 * Two faces on one card. Drag across it in any direction to turn it: sideways spins it around the
 * vertical axis, up or down around the horizontal one. The card follows the finger and settles on
 * whichever face is nearer when released, or the other one after a quick flick.
 */
export function FlipCard({
  front,
  back,
}: {
  front: ReactNode;
  back: ReactNode;
}) {
  /** 0 = front showing, 1 = back showing. */
  const turn = useSharedValue(0);
  /** Axis of the current drag: 0 spins around the vertical axis, 1 around the horizontal one. */
  const axis = useSharedValue(0);
  /** Which way round the card turns, so it goes the way the finger does. */
  const direction = useSharedValue(1);

  const [responder] = useState(() => {
    let start = 0;
    let locked = false;
    const settle = (target: number) =>
      turn.set(withSpring(target, Springs.settle));

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 8,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start = turn.get() > 0.5 ? 1 : 0;
        locked = false;
      },
      onPanResponderMove: (_event, gesture) => {
        const sideways = Math.abs(gesture.dx) >= Math.abs(gesture.dy);
        const distance = sideways ? gesture.dx : gesture.dy;
        // The axis and direction are fixed by where the drag first heads.
        if (!locked) {
          locked = true;
          axis.set(sideways ? 0 : 1);
          direction.set(
            (distance >= 0 ? 1 : -1) *
              (start === 0 ? 1 : -1) *
              (sideways ? 1 : -1),
          );
        }
        const along = axis.get() === 0 ? gesture.dx : gesture.dy;
        const progress = Math.min(Math.abs(along) / FLIP_DISTANCE, 1);
        turn.set(start === 0 ? progress : 1 - progress);
      },
      onPanResponderRelease: (_event, gesture) => {
        const flicked = Math.hypot(gesture.vx, gesture.vy) > 0.6;
        settle(flicked ? 1 - start : turn.get() > 0.5 ? 1 : 0);
      },
      onPanResponderTerminate: () => settle(start),
    });
  });

  // Back face is the front's angle minus half a turn, so it is upright once the card is fully turned.
  const faceStyle = (offset: number) => () => {
    "worklet";
    const angle = `${direction.value * (turn.value * 180 - offset)}deg`;
    return {
      transform:
        axis.value === 0
          ? [{ perspective: 1200 }, { rotateY: angle }]
          : [{ perspective: 1200 }, { rotateX: angle }],
    };
  };
  const frontStyle = useAnimatedStyle(faceStyle(0));
  const backStyle = useAnimatedStyle(faceStyle(180));

  return (
    <Box {...responder.panHandlers}>
      <Animated.View style={[{ backfaceVisibility: "hidden" }, frontStyle]}>
        {front}
      </Animated.View>
      <Animated.View
        style={[
          { position: "absolute", backfaceVisibility: "hidden" },
          backStyle,
        ]}
      >
        {back}
      </Animated.View>
    </Box>
  );
}
