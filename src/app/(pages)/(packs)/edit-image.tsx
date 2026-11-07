import { ImageFormat, useCanvasRef } from "@shopify/react-native-skia";
import { desc } from "drizzle-orm";
import { File, Paths } from "expo-file-system";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Eraser,
  Frame as FrameIcon,
  Minus,
  Paintbrush,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Smile,
  Trash2,
  Type,
  Save,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Keyboard, useWindowDimensions } from "react-native";

import { OUTLINE_MAX, StickerCanvas, exportRect } from "@/components/sticker-canvas";
import {
  Box,
  HStack,
  HeaderButton,
  HScroll,
  Icon,
  Image,
  ListRow,
  ListSection,
  Pressable,
  Screen,
  ScrollView,
  Slider,
  Text,
  TextField,
  Toggle,
  showAlert,
} from "@/components/ui";
import { Colors } from "@/constants/theme";
import { db } from "@/db";
import { inOpenPack } from "@/db/filters";
import { stickers } from "@/db/schema";
import { StickerEditorStore, type Frame, type Tool } from "@/lib/sticker-editor-store";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTheme } from "@/hooks/use-theme";
import { getDraft, saveDraft } from "@/lib/drafts";
import { getStickerUri } from "@/lib/sticker-storage";
import { makeSticker } from "../../../../modules/sticker-kit";

// Text colors for stickers are fixed, so they take the light iOS system colors in either theme.
const COLORS = [
  "#FFFFFF",
  "#000000",
  Colors.light.systemRed,
  Colors.light.systemOrange,
  Colors.light.systemYellow,
  Colors.light.systemGreen,
  Colors.light.systemBlue,
  Colors.light.systemPurple,
  Colors.light.systemPink,
];
const BRUSHES = [8, 18, 34];
const EMOJIS = ["😀", "😂", "😍", "😎", "🥳", "😭", "🔥", "💖", "👍", "🎉", "✨", "⭐", "🌈", "🍕", "☕", "🐶", "🐱", "🌸", "🚀", "👑"];
const FRAMES: { key: Frame; label: string }[] = [
  { key: "none", label: "None" },
  { key: "rounded", label: "Rounded" },
  { key: "circle", label: "Circle" },
];
const TOOLS: { key: Tool; label: string; icon: LucideIcon }[] = [
  { key: "cutout", label: "Cut Out", icon: Scissors },
  { key: "write", label: "Write", icon: Type },
  { key: "paint", label: "Paint", icon: Paintbrush },
  { key: "sticker", label: "Sticker", icon: Smile },
  { key: "eraser", label: "Eraser", icon: Eraser },
  { key: "frame", label: "Frame", icon: FrameIcon },
];

/** Rough half-size of a text layer; text wraps at 300 wide, so the box never grows past half of that. */
const textRadius = (value: string) => Math.min(150, Math.max(30, (value.length * 48 * 0.6) / 2));

function ColorRow({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const theme = useTheme();
  return (
    <HScroll gap="sm">
      {COLORS.map((color) => (
        <Pressable key={color} accessibilityLabel={`Color ${color}`} onPress={() => onChange(color)}>
          <Box
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: color,
              borderWidth: value === color ? 3 : 1,
              borderColor: value === color ? theme.systemBlue : theme.systemGray3,
            }}
          />
        </Pressable>
      ))}
    </HScroll>
  );
}

function BrushRow({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  const theme = useTheme();
  return (
    <HStack gap="lg" justify="center">
      {BRUSHES.map((size) => (
        <Pressable
          key={size}
          accessibilityLabel={`Brush size ${size}`}
          onPress={() => onChange(size)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: value === size ? 2 : 0,
            borderColor: theme.systemBlue,
          }}
        >
          <Box style={{ width: size / 1.5 + 4, height: size / 1.5 + 4, borderRadius: size, backgroundColor: theme.systemGray }} />
        </Pressable>
      ))}
    </HStack>
  );
}

/** First step of creating a sticker: tools on top of the photo, then Next goes to the details. */
export default function EditImage() {
  const router = useRouter();
  const headerInset = useHeaderInset();
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const routeParams = useLocalSearchParams<Record<string, string>>();
  // Opened from the drafts list: carry on from the saved picture and its original params.
  const [draft] = useState(() => (routeParams.draftId ? getDraft(routeParams.draftId) : undefined));
  const params = draft ? { ...draft.params, draftId: draft.id } : routeParams;
  const original = {
    uri: draft ? draft.originalUri : params.uri,
    width: Number(params.width),
    height: Number(params.height),
  };

  // What a draft needs besides the picture, fixed at open so autosaving doesn't depend on route changes.
  const [carried] = useState(() => {
    const { draftId: _resumed, ...rest } = params;
    return {
      params: Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, String(value)])),
      originalUri: original.uri,
    };
  });

  const [store] = useState(() => new StickerEditorStore(original, draft?.editor));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const canvasRef = useCanvasRef();
  const [side, setSide] = useState(0);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [mine] = useState(() =>
    db.select().from(stickers).where(inOpenPack()).orderBy(desc(stickers.id)).limit(16).all(),
  );

  // Every change is kept as a draft until the sticker is created; the first one makes the draft.
  const draftId = useRef(draft?.id);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(false);

  const persist = () => {
    saving.current = saving.current.then(async () => {
      try {
        draftId.current = await saveDraft({
          id: draftId.current,
          params: carried.params,
          originalUri: carried.originalUri,
          editor: store.snapshot(),
        });
      } catch {
        // Autosave is best effort; the editor keeps working.
      }
    });
    return saving.current;
  };

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    timer.current = setTimeout(persist, 600);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ops, state.frame, state.outline, state.outlineWidth, state.outlineColor, state.baseUri]);

  const cutOut = state.baseUri !== original.uri;
  const selected = store.selected();
  const selectedText = selected?.type === "text" ? selected : undefined;
  const changed = state.ops.length > 0 || state.frame !== "none" || state.outline || cutOut;

  const runCutOut = async () => {
    setProcessing(true);
    try {
      const made = await makeSticker(original.uri, { outline: false });
      store.setBase(made);
    } catch (error) {
      showAlert("Couldn’t Remove Background", error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleCutOut = (enabled: boolean) => {
    if (enabled) void runCutOut();
    else store.setBase(original);
  };

  const addText = () => {
    const value = text.trim();
    if (!value) return;
    store.addLayer({
      type: "text",
      value,
      x: side / 2,
      y: side / 2,
      // Text wraps at 300 wide, so the box never grows past half of that.
      radius: textRadius(value),
    });
    setText("");
    Keyboard.dismiss();
  };

  const addGlyph = (type: "emoji" | "image", value: string) =>
    store.addLayer({ type, value, x: side / 2, y: side / 2, radius: type === "emoji" ? 34 : 60 });

  const saveAsDraft = async () => {
    setProcessing(true);
    clearTimeout(timer.current);
    await persist();
    router.back();
  };

  const next = async () => {
    // Settle the autosave first, so the draft id is known and nothing is saved after the sticker is made.
    clearTimeout(timer.current);
    await saving.current;
    const forward = { ...params, ...(draftId.current && { draftId: draftId.current }) };
    if (changed) {
      const snapshot = canvasRef.current?.makeImageSnapshot(exportRect(side, state));
      if (!snapshot) return;
      setProcessing(true);
      try {
        const file = new File(Paths.cache, `sticker-edit-${Date.now()}.png`);
        file.create({ overwrite: true });
        await file.write(snapshot.encodeToBytes(ImageFormat.PNG, 100));
        Object.assign(forward, {
          uri: file.uri,
          width: String(snapshot.width()),
          height: String(snapshot.height()),
          mimeType: "image/png",
        });
      } catch {
        setProcessing(false);
        return showAlert("Couldn’t Save Edits", "Please try again.");
      }
      setProcessing(false);
    }
    router.push({ pathname: "/(pages)/(packs)/new-sticker", params: forward });
  };

  const tool = state.tool;
  // Writing, or a text layer picked: only the text controls are shown.
  const textMode = tool === "write" || selectedText !== undefined;
  const selectedImage = selected?.type === "image" ? selected : undefined;
  const focused = textMode || selectedImage !== undefined;

  return (
    <Screen bg="systemGroupedBackground">
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <>
              {state.ops.length > 0 && (
                <HeaderButton icon={Undo2} accessibilityLabel="Undo" onPress={() => store.undo()} />
              )}
              {store.canRedo && (
                <HeaderButton icon={Redo2} accessibilityLabel="Redo" onPress={() => store.redo()} />
              )}
              <HeaderButton
                icon={Save}
                accessibilityLabel="Save draft"
                disabled={processing || side === 0}
                onPress={saveAsDraft}
              />
              <HeaderButton label="Next" bold disabled={processing || side === 0} onPress={next} />
            </>
          ),
        }}
      />

      <Box
        flex={1}
        center
        style={{ paddingTop: headerInset }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSide(Math.floor(Math.min(width - 32, height - headerInset - 8)));
        }}
      >
        {side > 0 && (
          <Box radius="lg" overflow="hidden">
            <StickerCanvas store={store} side={side} canvasRef={canvasRef} />
          </Box>
        )}
      </Box>

      {/* Capped height: a long panel (text options) scrolls instead of squeezing the canvas away. */}
      <ScrollView
        gap="md"
        py="sm"
        contentInsetAdjustmentBehavior="never"
        style={{ flexGrow: 0, maxHeight: windowHeight * 0.42 }}
      >
        {selected && tool !== "paint" && tool !== "eraser" && (
          <HStack gap="xl" justify="center">
            {(
              [
                [Minus, "Smaller", () => store.updateSelected((l) => ({ scale: Math.max(0.3, l.scale * 0.85) }))],
                [Plus, "Larger", () => store.updateSelected((l) => ({ scale: Math.min(6, l.scale * 1.15) }))],
                [RotateCcw, "Rotate Left", () => store.updateSelected((l) => ({ rotation: l.rotation - Math.PI / 12 }))],
                [RotateCw, "Rotate Right", () => store.updateSelected((l) => ({ rotation: l.rotation + Math.PI / 12 }))],
                [Trash2, "Delete", () => store.removeSelected()],
              ] as [LucideIcon, string, () => void][]
            ).map(([glyph, label, onPress]) => (
              <Pressable key={label} accessibilityLabel={label} onPress={onPress}>
                <Box center bg="secondarySystemGroupedBackground" radius="full" style={{ width: 44, height: 44 }}>
                  <Icon icon={glyph} size={20} color={label === "Delete" ? "systemRed" : "label"} />
                </Box>
              </Pressable>
            ))}
          </HStack>
        )}

        {!focused && tool === "cutout" && (
          <ListSection footer="The outline follows the original photo only. Works best on a physical device.">
            <ListRow
              label="Remove Background"
              trailing={<Toggle value={cutOut} onValueChange={toggleCutOut} disabled={processing} />}
            />
            <ListRow
              label="Outline"
              trailing={
                <Toggle value={state.outline} onValueChange={(outline) => store.set({ outline })} />
              }
            />
            {state.outline && (
              <Box px="lg" pb="sm">
                <Slider
                  accessibilityLabel="Outline width"
                  value={state.outlineWidth}
                  min={2}
                  max={OUTLINE_MAX}
                  onChange={(outlineWidth) => store.set({ outlineWidth })}
                />
                <Box py="sm">
                  <ColorRow
                    value={state.outlineColor}
                    onChange={(outlineColor) => store.set({ outlineColor })}
                  />
                </Box>
              </Box>
            )}
          </ListSection>
        )}

        {textMode && (
          <>
            <ListSection>
              <TextField
                value={selectedText ? selectedText.value : text}
                onChangeText={(value) =>
                  selectedText
                    ? store.updateSelected(() => ({ value, radius: textRadius(value) }))
                    : setText(value)
                }
                onSubmitEditing={selectedText ? () => Keyboard.dismiss() : addText}
                placeholder="Type something…"
                returnKeyType="done"
              />
            </ListSection>
            <ColorRow
              value={selectedText ? selectedText.color : state.color}
              onChange={(color) => (selectedText ? store.updateSelected(() => ({ color })) : store.set({ color }))}
            />
            {selectedText ? (
              <ListSection>
                <ListRow
                  label="Bold"
                  trailing={
                    <Toggle
                      value={selectedText.bold}
                      onValueChange={(bold) => store.updateSelected(() => ({ bold }))}
                    />
                  }
                />
                <ListRow
                  label="Outline"
                  trailing={
                    <Toggle
                      value={selectedText.outline}
                      onValueChange={(outline) => store.updateSelected(() => ({ outline }))}
                    />
                  }
                />
                {selectedText.outline && (
                  <>
                    <Box px="lg">
                      <Slider
                        accessibilityLabel="Outline width"
                        value={selectedText.outlineWidth}
                        min={1}
                        max={12}
                        onChange={(outlineWidth) => store.updateSelected(() => ({ outlineWidth }))}
                      />
                    </Box>
                    <Box py="sm">
                      <ColorRow
                        value={selectedText.outlineColor}
                        onChange={(outlineColor) => store.updateSelected(() => ({ outlineColor }))}
                      />
                    </Box>
                  </>
                )}
              </ListSection>
            ) : (
              <ListSection>
                <ListRow label="Add Text" tinted onPress={addText} />
              </ListSection>
            )}
            <ListSection>
              <ListRow
                label="Done"
                tinted
                onPress={() => {
                  Keyboard.dismiss();
                  store.set({ tool: null, selectedId: null });
                }}
              />
            </ListSection>
          </>
        )}

        {selectedImage && !textMode && (
          <>
            <ListSection footer="Applies to this picture only.">
              <ListRow
                label="Outline"
                trailing={
                  <Toggle
                    value={selectedImage.outline}
                    onValueChange={(outline) => store.updateSelected(() => ({ outline }))}
                  />
                }
              />
              {selectedImage.outline && (
                <>
                  <Box px="lg">
                    <Slider
                      accessibilityLabel="Outline width"
                      value={selectedImage.outlineWidth}
                      min={1}
                      max={12}
                      onChange={(outlineWidth) => store.updateSelected(() => ({ outlineWidth }))}
                    />
                  </Box>
                  <Box py="sm">
                    <ColorRow
                      value={selectedImage.outlineColor}
                      onChange={(outlineColor) => store.updateSelected(() => ({ outlineColor }))}
                    />
                  </Box>
                </>
              )}
            </ListSection>
            <ListSection>
              <ListRow label="Done" tinted onPress={() => store.set({ tool: null, selectedId: null })} />
            </ListSection>
          </>
        )}

        {!focused && (tool === "paint" || tool === "eraser") && (
          <>
            {tool === "paint" && <ColorRow value={state.color} onChange={(color) => store.set({ color })} />}
            <BrushRow value={state.brush} onChange={(brush) => store.set({ brush })} />
          </>
        )}

        {!focused && tool === "sticker" && (
          <>
            <HScroll gap="sm">
              {EMOJIS.map((emoji) => (
                <Pressable key={emoji} accessibilityLabel={emoji} onPress={() => addGlyph("emoji", emoji)}>
                  <Text variant="title1">{emoji}</Text>
                </Pressable>
              ))}
            </HScroll>
            {mine.length > 0 && (
              <HScroll gap="sm">
                {mine.map((sticker) => (
                  <Pressable
                    key={sticker.id}
                    accessibilityLabel={sticker.name}
                    onPress={() => addGlyph("image", getStickerUri(sticker.path))}
                  >
                    <Image
                      source={{ uri: getStickerUri(sticker.path) }}
                      contentFit="contain"
                      style={{ width: 48, height: 48 }}
                    />
                  </Pressable>
                ))}
              </HScroll>
            )}
          </>
        )}

        {!focused && tool === "frame" && (
          <HStack gap="md" justify="center">
            {FRAMES.map((frame) => (
              <Pressable key={frame.key} onPress={() => store.set({ frame: frame.key })}>
                <Box
                  px="xl"
                  py="sm"
                  radius="full"
                  bg={state.frame === frame.key ? "systemBlue" : "secondarySystemGroupedBackground"}
                >
                  <Text color={state.frame === frame.key ? "onTint" : "label"}>{frame.label}</Text>
                </Box>
              </Pressable>
            ))}
          </HStack>
        )}

        {!focused && (
        <Box row style={{ flexWrap: "wrap", paddingHorizontal: 16, gap: 8 }}>
          {TOOLS.map(({ key, label, icon }) => {
            const active = tool === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Keyboard.dismiss();
                  store.set({ tool: active ? null : key, selectedId: active ? state.selectedId : null });
                }}
                style={{ width: "31.5%" }}
              >
                <Box
                  center
                  gap="xs"
                  py="md"
                  radius="md"
                  bg="secondarySystemGroupedBackground"
                  style={{ borderWidth: 1.5, borderColor: active ? theme.systemBlue : "transparent" }}
                >
                  <Icon icon={icon} size={22} color={active ? "systemBlue" : "label"} />
                  <Text variant="footnote" color={active ? "systemBlue" : "label"}>
                    {label}
                  </Text>
                </Box>
              </Pressable>
            );
          })}
        </Box>
        )}
      </ScrollView>
    </Screen>
  );
}
