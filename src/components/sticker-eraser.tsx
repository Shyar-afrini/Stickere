import {
  Canvas,
  Group,
  Image as SkiaImage,
  ImageFormat,
  Path,
  Skia,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import { useMemo, useState } from "react";
import { PanResponder, View } from "react-native";

import { Box, ListRow, ListSection, Spinner, showAlert } from "@/components/ui";

type Point = { x: number; y: number };
type Stroke = Point[];

type Props = {
  /** Transparent cut-out to clean up. */
  uri: string;
  width: number;
  height: number;
  onDone: (result: { uri: string; width: number; height: number }) => void;
  onCancel: () => void;
};

const BRUSH = 28;

/**
 * Finger eraser for a cut-out sticker: draw over leftovers to remove them,
 * undo strokes, then export the result as a transparent PNG.
 */
export function StickerEraser({ uri, width, height, onDone, onCancel }: Props) {
  const image = useImage(uri);
  const canvasRef = useCanvasRef();
  const [side, setSide] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [saving, setSaving] = useState(false);

  // Fit the image inside the square canvas, preserving its aspect ratio.
  const rect = useMemo(() => {
    const scale = Math.min(side / width, side / height);
    const w = width * scale;
    const h = height * scale;
    return { x: (side - w) / 2, y: (side - h) / 2, width: w, height: h };
  }, [side, width, height]);

  const paths = useMemo(
    () =>
      strokes.map((stroke) => {
        const builder = Skia.PathBuilder.Make();
        builder.moveTo(stroke[0].x, stroke[0].y);
        // A single tap still leaves a dot because the cap is round.
        stroke.slice(1).forEach((point) => builder.lineTo(point.x, point.y));
        if (stroke.length === 1)
          builder.lineTo(stroke[0].x + 0.01, stroke[0].y);
        return builder.build();
      }),
    [strokes],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX: x, locationY: y } = event.nativeEvent;
          setStrokes((current) => [...current, [{ x, y }]]);
        },
        onPanResponderMove: (event) => {
          const { locationX: x, locationY: y } = event.nativeEvent;
          setStrokes((current) => {
            const last = current[current.length - 1];
            if (!last) return current;
            return [...current.slice(0, -1), [...last, { x, y }]];
          });
        },
      }),
    [],
  );

  const finish = async () => {
    const snapshot = canvasRef.current?.makeImageSnapshot(rect);
    if (!snapshot) return;

    setSaving(true);
    try {
      const file = new File(Paths.cache, `sticker-edit-${Date.now()}.png`);
      file.create({ overwrite: true });
      await file.write(snapshot.encodeToBytes(ImageFormat.PNG, 100));
      onDone({
        uri: file.uri,
        width: snapshot.width(),
        height: snapshot.height(),
      });
    } catch {
      setSaving(false);
      showAlert("Couldn’t Save Edits", "Please try again.");
    }
  };

  return (
    <>
      <Box
        aspectRatio={1}
        center
        bg="secondarySystemGroupedBackground"
        radius="xl"
        overflow="hidden"
        style={{ marginHorizontal: 16 }}
        onLayout={(event) => setSide(event.nativeEvent.layout.width)}
      >
        {!image || side === 0 ? (
          <Spinner size="large" />
        ) : (
          <View
            style={{ width: side, height: side }}
            {...responder.panHandlers}
          >
            <Canvas ref={canvasRef} style={{ width: side, height: side }}>
              {/* Strokes clear the pixels beneath them, so the layer stays transparent. */}
              <Group layer>
                <SkiaImage
                  image={image}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fit="fill"
                />
                {paths.map((path, index) => (
                  <Path
                    key={index}
                    path={path}
                    style="stroke"
                    strokeWidth={BRUSH}
                    strokeCap="round"
                    strokeJoin="round"
                    blendMode="clear"
                  />
                ))}
              </Group>
            </Canvas>
          </View>
        )}
      </Box>

      <ListSection footer="Draw over any leftovers to erase them.">
        <ListRow
          label="Undo"
          tinted={strokes.length > 0}
          onPress={
            strokes.length > 0
              ? () => setStrokes((s) => s.slice(0, -1))
              : undefined
          }
        />
        <ListRow label="Done" tinted onPress={saving ? undefined : finish} />
        <ListRow label="Cancel" onPress={onCancel} />
      </ListSection>
    </>
  );
}
