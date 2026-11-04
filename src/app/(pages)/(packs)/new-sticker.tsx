import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";

import { StickerEraser } from "@/components/sticker-eraser";
import { makeSticker } from "../../../../modules/sticker-kit";

import {
  Box,
  HeaderButton,
  Image,
  ListRow,
  ListSection,
  Screen,
  ScrollView,
  Spinner,
  TextField,
  Toggle,
  showAlert,
} from "@/components/ui";
import { createSticker } from "@/db/mutations";
import { usePacks } from "@/hooks/use-packs";
import { parseEmojis } from "@/lib/emoji";
import { pickImage, type PickedImage } from "@/lib/pick-image";
import {
  describeLocation,
  getCurrentStickerLocation,
  type StickerLocation,
} from "@/lib/location";

export default function NewSticker() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    packId?: string;
    uri?: string;
    width?: string;
    height?: string;
    mimeType?: string;
    name?: string;
  }>();
  const { packs } = usePacks();

  const [cutImage, setCutImage] = useState<PickedImage | null>(null);
  // The photo as picked; `image` is what gets saved (the cut-out, once made).
  const [original, setOriginal] = useState<PickedImage | null>(
    params.uri
      ? {
          uri: params.uri,
          width: Number(params.width),
          height: Number(params.height),
          mimeType: params.mimeType ?? "image/png",
        }
      : null,
  );
  const [cutOut, setCutOut] = useState(false);
  const [outline, setOutline] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [erasing, setErasing] = useState(false);
  const image = cutOut && cutImage ? cutImage : original;
  const [name, setName] = useState(params.name ?? "Sticker");
  const [emojiText, setEmojiText] = useState("");
  const [chosenPackId, setChosenPackId] = useState<number>();
  const [locationOn, setLocationOn] = useState(false);
  const [location, setLocation] = useState<StickerLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Explicit choice, then the pack this screen was opened from, then the most
  // recently updated pack.
  const selectedPackId =
    chosenPackId ?? (params.packId ? Number(params.packId) : packs[0]?.id);

  const canSave =
    image !== null &&
    selectedPackId !== undefined &&
    name.trim().length > 0 &&
    !locating &&
    !processing &&
    !saving;

  const changeImage = async () => {
    const picked = await pickImage();
    if (!picked) return;

    setOriginal(picked);
    setCutImage(null);
    setCutOut(false);
  };

  const runCutOut = async (source: PickedImage, withOutline: boolean) => {
    setProcessing(true);
    try {
      const made = await makeSticker(source.uri, { outline: withOutline });
      setCutImage({
        uri: made.uri,
        width: made.width,
        height: made.height,
        mimeType: "image/png",
      });
      setCutOut(true);
    } catch (error) {
      setCutOut(false);
      showAlert(
        "Couldn’t Remove Background",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const toggleCutOut = (enabled: boolean) => {
    if (!original) return;
    if (!enabled) return setCutOut(false);
    void runCutOut(original, outline);
  };

  const toggleOutline = (enabled: boolean) => {
    setOutline(enabled);
    if (cutOut && original) void runCutOut(original, enabled);
  };

  const toggleLocation = async (enabled: boolean) => {
    if (!enabled) {
      setLocationOn(false);
      setLocation(null);
      return;
    }

    setLocationOn(true);
    setLocating(true);
    try {
      const result = await getCurrentStickerLocation();
      if (result.status === "denied") {
        setLocationOn(false);
        showAlert(
          "Location Access Needed",
          "Allow location access in Settings to tag stickers with where they belong.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        setLocation(result.location);
      }
    } catch {
      setLocationOn(false);
      showAlert("Couldn’t Get Location", "Please try again in a moment.");
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!image || selectedPackId === undefined) return;

    setSaving(true);
    try {
      await createSticker({
        packId: selectedPackId,
        name,
        sourceUri: image.uri,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        emojis: parseEmojis(emojiText),
        location: location ?? undefined,
      });
      router.back();
    } catch (error) {
      setSaving(false);
      showAlert(
        "Couldn’t Add Sticker",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "New Sticker",
          headerLeft: () => (
            <HeaderButton label="Cancel" onPress={router.back} />
          ),
          headerRight: () => (
            <HeaderButton label="Add" bold disabled={!canSave} onPress={save} />
          ),
        }}
      />
      <ScrollView gap="xl" py="lg">
        {erasing && cutImage ? (
          <StickerEraser
            uri={cutImage.uri}
            width={cutImage.width}
            height={cutImage.height}
            onCancel={() => setErasing(false)}
            onDone={(edited) => {
              setCutImage({ ...edited, mimeType: "image/png" });
              setErasing(false);
            }}
          />
        ) : (
          <>
            <Box
              aspectRatio={1}
              center
              bg="secondarySystemGroupedBackground"
              radius="xl"
              overflow="hidden"
              style={{ marginHorizontal: 16 }}
            >
              {processing ? (
                <Spinner size="large" />
              ) : image ? (
                <Image
                  source={{ uri: image.uri }}
                  contentFit="contain"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </Box>

            <ListSection>
              <ListRow label="Change Photo" tinted onPress={changeImage} />
            </ListSection>
          </>
        )}

        <ListSection
          title="Sticker"
          footer={
            original
              ? "Cuts the subject out of the photo. Works best on a physical device."
              : "Choose a photo to turn it into a sticker."
          }
        >
          <ListRow
            label="Remove Background"
            trailing={
              <Toggle
                value={cutOut}
                onValueChange={toggleCutOut}
                disabled={!original || processing}
              />
            }
          />
          <ListRow
            label="White Outline"
            trailing={
              <Toggle
                value={outline}
                onValueChange={toggleOutline}
                disabled={!original || processing}
              />
            }
          />
          <ListRow
            label="Erase Leftovers"
            tinted={cutOut}
            onPress={cutOut && !processing ? () => setErasing(true) : undefined}
          />
        </ListSection>

        <ListSection title="Name">
          <TextField value={name} onChangeText={setName} placeholder="Name" />
        </ListSection>

        <ListSection
          title="Emoji"
          footer="Up to 3 emoji. Needed to share this sticker to WhatsApp and Telegram."
        >
          <TextField
            value={emojiText}
            onChangeText={setEmojiText}
            placeholder="😀"
            autoCorrect={false}
          />
        </ListSection>

        {params.packId ? null : (
          <ListSection title="Pack">
            {packs.map((pack) => (
              <ListRow
                key={pack.id}
                label={pack.name}
                accessory={pack.id === selectedPackId ? "checkmark" : undefined}
                onPress={() => setChosenPackId(pack.id)}
              />
            ))}
            <ListRow
              label="New Pack…"
              tinted
              onPress={() => router.push("/(pages)/(packs)/new-pack")}
            />
          </ListSection>
        )}

        <ListSection footer="Tie this sticker to the place where it belongs.">
          <ListRow
            label="Current Location"
            detail={
              !locationOn
                ? undefined
                : locating
                  ? "Finding your location…"
                  : location
                    ? describeLocation(location)
                    : undefined
            }
            trailing={
              <Toggle
                value={locationOn}
                onValueChange={toggleLocation}
                disabled={locating}
              />
            }
          />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}
