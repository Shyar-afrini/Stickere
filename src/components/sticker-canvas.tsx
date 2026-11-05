import {
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Image as SkiaImage,
  Morphology,
  Paint,
  Path,
  Skia,
  Paragraph,
  TextAlign,
  TextDirection,
  rect as skRect,
  rrect,
  useImage,
  type CanvasRef,
  type SkPath,
  type SkImage,
} from "@shopify/react-native-skia";
import { File } from "expo-file-system";
import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Keyboard, PanResponder, Platform, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { Spinner, Text } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import type { EditorState, Layer, StickerEditorStore, Stroke } from "@/lib/sticker-editor-store";

const TEXT_SIZE = 48;
const EMOJI_SIZE = 56;
/** Text wraps at this width, so long lines become several lines. */
const GLYPH_WIDTH = 300;
const IMAGE_BOX = 120;
const CHECK = 12;
/** Empty margin around the photo, so the eraser and paint can reach past its edges. */
const PADDING = 36;
/** Thickest white outline; below PADDING so it always fits on the canvas. */
export const OUTLINE_MAX = 32;
const LOUPE_RADIUS = 56;
const LOUPE_ZOOM = 2;
/** How far above the finger the loupe floats, so the hand never covers it. */
const LOUPE_OFFSET = 96;

const emptyPath = Skia.Path.Make();

type Frame = { x: number; y: number; width: number; height: number };

/** Where the photo sits inside the square canvas. */
export function baseRect(side: number, state: Pick<EditorState, "baseWidth" | "baseHeight">): Frame {
  // On a small canvas the margin shrinks too, so the photo never ends up with no room at all.
  const room = side - Math.min(PADDING, side * 0.1) * 2;
  const scale = Math.min(room / state.baseWidth, room / state.baseHeight);
  const width = state.baseWidth * scale;
  const height = state.baseHeight * scale;
  return { x: (side - width) / 2, y: (side - height) / 2, width, height };
}

/** The part of the canvas that becomes the sticker: the photo, or its inscribed square for a circle frame. */
export function exportRect(side: number, state: EditorState): Frame {
  const base = baseRect(side, state);
  if (state.outline && state.frame === "none") {
    return {
      x: base.x - state.outlineWidth,
      y: base.y - state.outlineWidth,
      width: base.width + state.outlineWidth * 2,
      height: base.height + state.outlineWidth * 2,
    };
  }
  if (state.frame !== "circle") return base;
  const size = Math.min(base.width, base.height);
  return { x: base.x + (base.width - size) / 2, y: base.y + (base.height - size) / 2, width: size, height: size };
}

function strokePath(stroke: Stroke) {
  const builder = Skia.PathBuilder.Make();
  builder.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => builder.lineTo(point.x, point.y));
  // A single tap still leaves a dot because the cap is round.
  if (stroke.points.length === 1) builder.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y);
  return builder.build();
}

/** Decodes a local file ourselves, so odd URIs (spaces, encoding) can't stop the photo from loading. */
function useLocalImage(uri: string) {
  const [result, setResult] = useState<{ uri: string; image: SkImage | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let image: SkImage | null = null;
      try {
        const bytes = await new File(uri).bytes();
        image = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
      } catch {
        image = null;
      }
      if (!cancelled) setResult({ uri, image });
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const current = result?.uri === uri ? result : null;
  return {
    image: current?.image ?? null,
    failed: current !== null && current.image === null,
  };
}

type Drag = { id: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };

/** Places a layer; the one being dragged follows the finger on the UI thread, without re-rendering. */
function LayerGroup({ op, drag, children }: { op: Layer; drag: Drag; children: ReactNode }) {
  const transform = useDerivedValue(() => {
    const moving = drag.id.value === op.id;
    return [
      { translateX: op.x + (moving ? drag.x.value : 0) },
      { translateY: op.y + (moving ? drag.y.value : 0) },
      { rotate: op.rotation },
      { scale: op.scale },
    ];
  });
  return <Group transform={transform}>{children}</Group>;
}

/** The shape of its children grown by `width` and painted in one colour. */
function Silhouette({ color, width, children }: { color: string; width: number; children: ReactNode }) {
  return (
    <Group
      layer={
        <Paint>
          <Morphology operator="dilate" radius={width} />
          <ColorMatrix matrix={solidMatrix(color)} />
        </Paint>
      }
    >
      {children}
    </Group>
  );
}

/** Children with an outline of their own shape, when `on`. */
function Outlined({
  on,
  color,
  width,
  children,
}: {
  on: boolean;
  color: string;
  width: number;
  children: ReactNode;
}) {
  if (!on) return <>{children}</>;
  return (
    <>
      <Silhouette color={color} width={width}>
        {children}
      </Silhouette>
      {children}
    </>
  );
}

function ImageLayer({ layer }: { layer: Layer }) {
  const image = useImage(layer.value);
  if (!image) return null;
  const ratio = image.width() / image.height();
  const width = ratio >= 1 ? IMAGE_BOX : IMAGE_BOX * ratio;
  const height = ratio >= 1 ? IMAGE_BOX / ratio : IMAGE_BOX;
  return (
    <Outlined on={layer.outline} color={layer.outlineColor} width={layer.outlineWidth}>
      <SkiaImage image={image} x={-width / 2} y={-height / 2} width={width} height={height} fit="fill" />
    </Outlined>
  );
}

/** Colour matrix that paints everything in one colour and keeps the alpha. */
function solidMatrix(hex: string) {
  const value = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((part) => part / 255);
  return [0, 0, 0, 0, r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0, 0, 0, 1, 0];
}

const RIGHT_TO_LEFT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/**
 * Text and emoji go through Skia's paragraph layout, which shapes Arabic and other scripts,
 * mixes left-to-right and right-to-left runs, and falls back to a system font for any glyph
 * the first font lacks (a plain Skia font only has the glyphs of one family).
 */
function GlyphLayer({ layer }: { layer: Layer }) {
  const paragraph = useMemo(() => {
    const emoji = layer.type === "emoji";
    const builder = Skia.ParagraphBuilder.Make({
      textAlign: TextAlign.Center,
      textDirection: RIGHT_TO_LEFT.test(layer.value) ? TextDirection.RTL : TextDirection.LTR,
    });
    builder
      .pushStyle({
        color: Skia.Color(emoji ? "#000000" : layer.color),
        fontSize: emoji ? EMOJI_SIZE : TEXT_SIZE,
        fontStyle: { weight: emoji || !layer.bold ? 400 : 700 },
        fontFamilies: Platform.select({
          ios: ["Helvetica Neue", "Apple Color Emoji"],
          default: ["sans-serif", "Noto Color Emoji"],
        }),
      })
      .addText(layer.value)
      .pop();
    const built = builder.build();
    built.layout(GLYPH_WIDTH);
    return built;
  }, [layer.value, layer.color, layer.type, layer.bold]);

  return (
    <Outlined on={layer.type === "text" && layer.outline} color={layer.outlineColor} width={layer.outlineWidth}>
      <Paragraph paragraph={paragraph} x={-GLYPH_WIDTH / 2} y={-paragraph.getHeight() / 2} width={GLYPH_WIDTH} />
    </Outlined>
  );
}

type Props = {
  store: StickerEditorStore;
  side: number;
  canvasRef: RefObject<CanvasRef | null>;
};

/**
 * Square editing surface: a checkerboard, then a transparent Skia canvas holding
 * the photo and everything drawn on it. Only the Skia canvas is exported, so the
 * checkerboard and the selection ring never end up in the sticker.
 */
export function StickerCanvas({ store, side, canvasRef }: Props) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { image, failed } = useLocalImage(state.baseUri);
  const theme = useTheme();
  const [checkLight, checkDark] = [theme.systemGray6, theme.systemGray5];

  const livePath = useSharedValue<SkPath>(emptyPath);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const loupeOn = useSharedValue(0);
  const drag: Drag = { id: useSharedValue(-1), x: useSharedValue(0), y: useSharedValue(0) };

  const [responder] = useState(() => {
    const finish = (dx: number, dy: number) => {
      // The offset stays until the committed position has rendered, so nothing jumps.
      if (store.draggingLayer) store.commitDrag(dx, dy);
    };
    const builder = Skia.PathBuilder.Make();
    const extend = (x: number, y: number, first: boolean) => {
      if (first) builder.reset().moveTo(x, y);
      // A single tap still leaves a dot because the cap is round.
      builder.lineTo(first ? x + 0.01 : x, y);
      livePath.set(builder.build());
    };
    const endStroke = () => {
      loupeOn.set(0);
      store.commitStroke();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Once a stroke or drag starts, nothing else (like a screen gesture) may take it over.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        // Touching the photo puts the keyboard away.
        Keyboard.dismiss();
        const { locationX, locationY } = event.nativeEvent;
        store.touchStart(locationX, locationY);
        drag.x.set(0);
        drag.y.set(0);
        drag.id.set(store.draggingLayer ? (store.state.selectedId ?? -1) : -1);
        if (store.activeStroke) {
          touchX.set(locationX);
          touchY.set(locationY);
          loupeOn.set(1);
          extend(locationX, locationY, true);
        }
      },
      onPanResponderMove: (event, gesture) => {
        if (store.draggingLayer) {
          drag.x.set(gesture.dx);
          drag.y.set(gesture.dy);
          return;
        }
        const { locationX, locationY } = event.nativeEvent;
        store.touchMove(locationX, locationY, gesture.dx, gesture.dy);
        if (store.activeStroke) {
          touchX.set(locationX);
          touchY.set(locationY);
          extend(locationX, locationY, false);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        endStroke();
        finish(gesture.dx, gesture.dy);
      },
      onPanResponderTerminate: (_event, gesture) => {
        endStroke();
        finish(gesture.dx, gesture.dy);
      },
    });
  });

  useEffect(() => {
    // The committed stroke is in `ops` now, so the live copy can go.
    if (store.consumeStrokeReset()) livePath.set(emptyPath);
    if (!store.consumeDragReset()) return;
    drag.id.set(-1);
    drag.x.set(0);
    drag.y.set(0);
  }, [state, store, livePath, drag.id, drag.x, drag.y]);

  // Fall back to the decoded size if the dimensions passed along were missing.
  const known = state.baseWidth > 0 && state.baseHeight > 0;
  const base = baseRect(side, known || !image ? state : { baseWidth: image.width(), baseHeight: image.height() });
  const clip = useMemo(() => {
    if (state.frame === "none") return undefined;
    const area = exportRect(side, state);
    const radius = state.frame === "circle" ? area.width / 2 : Math.min(area.width, area.height) * 0.14;
    return rrect(skRect(area.x, area.y, area.width, area.height), radius, radius);
  }, [side, state]);

  // A separate layer is only needed for the eraser, which clears pixels instead of painting.
  const layered = state.tool === "eraser" || state.ops.some((op) => op.kind === "stroke" && op.erase);
  const drawing = state.tool === "paint" || state.tool === "eraser";

  const selected = store.selected();

  // The loupe floats above the finger (below it near the top edge) and shows the area under it magnified.
  const loupeCenter = useDerivedValue(() => {
    const above = touchY.value - LOUPE_OFFSET;
    return {
      x: Math.min(Math.max(touchX.value, LOUPE_RADIUS), side - LOUPE_RADIUS),
      y: above < LOUPE_RADIUS + 4 ? touchY.value + LOUPE_OFFSET : above,
    };
  });
  const loupeCx = useDerivedValue(() => loupeCenter.value.x);
  const loupeCy = useDerivedValue(() => loupeCenter.value.y);
  const loupeClip = useDerivedValue(() =>
    rrect(
      skRect(loupeCenter.value.x - LOUPE_RADIUS, loupeCenter.value.y - LOUPE_RADIUS, LOUPE_RADIUS * 2, LOUPE_RADIUS * 2),
      LOUPE_RADIUS,
      LOUPE_RADIUS,
    ),
  );
  const loupeZoom = useDerivedValue(() => [
    { translateX: loupeCenter.value.x },
    { translateY: loupeCenter.value.y },
    { scale: LOUPE_ZOOM },
    { translateX: -touchX.value },
    { translateY: -touchY.value },
  ]);

  const content = (
    <Group layer={layered} clip={clip}>
      <SkiaImage image={image} x={base.x} y={base.y} width={base.width} height={base.height} fit="fill" />
      {state.ops.map((op) =>
        op.kind === "stroke" ? (
          <Path
            key={op.id}
            path={strokePath(op)}
            style="stroke"
            strokeWidth={op.width}
            strokeCap="round"
            strokeJoin="round"
            color={op.color}
            blendMode={op.erase ? "clear" : "srcOver"}
          />
        ) : (
          <LayerGroup key={op.id} op={op} drag={drag}>
            {op.type === "image" ? (
              <ImageLayer layer={op} />
            ) : (
              <GlyphLayer layer={op} />
            )}
          </LayerGroup>
        ),
      )}
      {drawing && (
        <Path
          path={livePath}
          style="stroke"
          strokeWidth={state.brush}
          strokeCap="round"
          strokeJoin="round"
          color={state.color}
          blendMode={state.tool === "eraser" ? "clear" : "srcOver"}
        />
      )}
    </Group>
  );

  // The photo's outline follows the photo only (what is left after erasing), not the stickers or
  // text on top, which have outlines of their own.
  const scene =
    state.outline && state.frame === "none" ? (
      <>
        <Silhouette color="#FFFFFF" width={state.outlineWidth}>
          <SkiaImage image={image} x={base.x} y={base.y} width={base.width} height={base.height} fit="fill" />
          {state.ops.map((op) =>
            op.kind === "stroke" && op.erase ? (
              <Path
                key={op.id}
                path={strokePath(op)}
                style="stroke"
                strokeWidth={op.width}
                strokeCap="round"
                strokeJoin="round"
                color="#000"
                blendMode="clear"
              />
            ) : null,
          )}
          {state.tool === "eraser" && (
            <Path
              path={livePath}
              style="stroke"
              strokeWidth={state.brush}
              strokeCap="round"
              strokeJoin="round"
              color="#000"
              blendMode="clear"
            />
          )}
        </Silhouette>
        {content}
      </>
    ) : (
      content
    );

  return (
    <View style={{ width: side, height: side }} {...responder.panHandlers}>
      <Svg width={side} height={side} style={{ position: "absolute" }}>
        <Defs>
          <Pattern id="checker" width={CHECK * 2} height={CHECK * 2} patternUnits="userSpaceOnUse">
            <Rect width={CHECK * 2} height={CHECK * 2} fill={checkLight} />
            <Rect width={CHECK} height={CHECK} fill={checkDark} />
            <Rect x={CHECK} y={CHECK} width={CHECK} height={CHECK} fill={checkDark} />
          </Pattern>
        </Defs>
        <Rect width={side} height={side} fill="url(#checker)" />
      </Svg>

      {!image ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {failed ? (
            <Text variant="footnote" color="secondaryLabel" style={{ textAlign: "center", padding: 24 }}>
              This photo couldn’t be opened. Try another one.
            </Text>
          ) : (
            <Spinner size="large" />
          )}
        </View>
      ) : (
        <Canvas ref={canvasRef} style={{ width: side, height: side }}>
          {scene}
          {drawing && (
            <Group opacity={loupeOn}>
              <Group clip={loupeClip}>
                <Circle cx={loupeCx} cy={loupeCy} r={LOUPE_RADIUS} color={checkLight} />
                <Group transform={loupeZoom}>{scene}</Group>
                <Circle
                  cx={loupeCx}
                  cy={loupeCy}
                  r={(state.brush * LOUPE_ZOOM) / 2}
                  style="stroke"
                  strokeWidth={1.5}
                  color={theme.systemBlue}
                />
              </Group>
              <Circle cx={loupeCx} cy={loupeCy} r={LOUPE_RADIUS} style="stroke" strokeWidth={3} color="#FFFFFF" />
            </Group>
          )}
        </Canvas>
      )}

      {selected && <SelectionRing layer={selected} drag={drag} />}
    </View>
  );
}

function SelectionRing({ layer, drag }: { layer: Layer; drag: Drag }) {
  const theme = useTheme();
  const follow = useAnimatedStyle(() => {
    const moving = drag.id.value === layer.id;
    return {
      transform: [
        { translateX: moving ? drag.x.value : 0 },
        { translateY: moving ? drag.y.value : 0 },
        { rotate: `${layer.rotation}rad` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: layer.x - layer.radius * layer.scale,
          top: layer.y - layer.radius * layer.scale,
          width: layer.radius * 2 * layer.scale,
          height: layer.radius * 2 * layer.scale,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: theme.systemBlue,
          borderRadius: 6,
        },
        follow,
      ]}
    />
  );
}
