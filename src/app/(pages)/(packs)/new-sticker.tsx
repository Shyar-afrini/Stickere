import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useWindowDimensions } from "react-native";

import { SHEET_HEIGHT } from "@/constants/sheet";

import {
  Box,
  Chip,
  HeaderButton,
  Image,
  KeyboardAvoid,
  ListRow,
  ListSection,
  Screen,
  ScrollView,
  SheetHeader,
  TabStrip,
  Text,
  TextField,
  Toggle,
  showAlert,
} from "@/components/ui";
import { db } from "@/db";
import { createSticker, updateSticker } from "@/db/mutations";
import { stickers } from "@/db/schema";
import { useConfirmDiscard } from "@/hooks/use-confirm-discard";
import { usePacks } from "@/hooks/use-packs";
import { deleteDraft } from "@/lib/drafts";
import { Haptic } from "@/lib/haptics";
import { parseEmojis } from "@/lib/emoji";
import {
  describeLocation,
  getCurrentStickerLocation,
  type StickerLocation,
} from "@/lib/location";
import type { PickedImage } from "@/lib/pick-image";
import { openAppSettings } from "@/lib/platform";
import { getStickerUri } from "@/lib/sticker-storage";
import { getPopularTags, getStickerTags, normalizeTag } from "@/lib/tags";

export default function NewSticker() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{
    packId?: string;
    stickerId?: string;
    uri?: string;
    width?: string;
    height?: string;
    mimeType?: string;
    name?: string;
    assetId?: string;
    /** Draft this sticker was made from; it is removed once the sticker is saved. */
    draftId?: string;
    latitude?: string;
    longitude?: string;
    radiusMeters?: string;
    placeName?: string;
    locality?: string;
    country?: string;
  }>();
  const { packs } = usePacks();
  // Opened with a `stickerId` to edit an existing sticker instead of adding one.
  const [existing] = useState(() =>
    params.stickerId
      ? db.select().from(stickers).where(eq(stickers.id, Number(params.stickerId))).get()
      : undefined,
  );
  const editing = existing !== undefined;
  const [tab, setTab] = useState<EditorTab>("details");

  // The image from the editing step. Without one (opened straight from a sticker), the saved image.
  const [original] = useState<PickedImage | null>(
    params.uri
      ? {
          uri: params.uri,
          width: Number(params.width),
          height: Number(params.height),
          mimeType: params.mimeType ?? "image/png",
        }
      : existing
        ? {
            uri: getStickerUri(existing.path),
            width: existing.width,
            height: existing.height,
            mimeType: existing.mimeType,
          }
        : null,
  );
  const image = original;
  const [name, setName] = useState(existing?.name ?? params.name ?? "Sticker");
  const [emojiText, setEmojiText] = useState(existing?.emojis.join("") ?? "");
  const [tagList, setTagList] = useState<string[]>(() =>
    existing ? getStickerTags(existing.id) : [],
  );
  const [tagText, setTagText] = useState("");
  const [popularTags] = useState(() => getPopularTags());
  const [chosenPackId, setChosenPackId] = useState<number>();
  // Pack ids that existed when "New Pack…" was tapped; a pack that appears after that is the new one.
  const [packsBeforeNew, setPacksBeforeNew] = useState<number[]>();
  const createdPackId = packsBeforeNew
    ? packs.find((pack) => !packsBeforeNew.includes(pack.id))?.id
    : undefined;
  // Photos suggested from a trip arrive with the place they were taken.
  const initialLocation: StickerLocation | null =
    existing?.latitude != null && existing.longitude != null
      ? {
          latitude: existing.latitude,
          longitude: existing.longitude,
          radiusMeters: existing.radiusMeters ?? 100,
          placeName: existing.placeName,
          locality: existing.locality,
          country: existing.country,
        }
      : params.latitude && params.longitude
      ? {
          latitude: Number(params.latitude),
          longitude: Number(params.longitude),
          radiusMeters: Number(params.radiusMeters) || 100,
          placeName: params.placeName || null,
          locality: params.locality || null,
          country: params.country || null,
        }
      : null;
  // Where the current photo was taken; turning the location on prefers it over the GPS fix.
  const [photoLocation] = useState(initialLocation);
  const [locationOn, setLocationOn] = useState(initialLocation !== null);
  const [location, setLocation] = useState<StickerLocation | null>(initialLocation);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Explicit choice, then a pack just made from here, then the pack this screen was opened from,
  // then the first pack.
  const selectedPackId =
    chosenPackId ??
    createdPackId ??
    (existing?.packId ?? (params.packId ? Number(params.packId) : packs[0]?.id));

  // Anything typed or picked here that leaving would lose. The image itself stays in the editor's draft.
  const [initialTags] = useState(tagList);
  const dirty =
    name !== (existing?.name ?? params.name ?? "Sticker") ||
    emojiText !== (existing?.emojis.join("") ?? "") ||
    tagList.join(",") !== initialTags.join(",") ||
    chosenPackId !== undefined ||
    locationOn !== (initialLocation !== null);
  const allowLeave = useConfirmDiscard(dirty && !saving);

  const canSave =
    image !== null &&
    selectedPackId !== undefined &&
    name.trim().length > 0 &&
    !locating &&
    !saving;

  const addTag = (text: string) => {
    const tag = normalizeTag(text);
    if (tag && !tagList.includes(tag)) setTagList([...tagList, tag]);
    setTagText("");
  };

  const toggleLocation = async (enabled: boolean) => {
    if (!enabled) {
      setLocationOn(false);
      setLocation(null);
      return;
    }

    setLocationOn(true);
    if (photoLocation) {
      setLocation(photoLocation);
      return;
    }

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
            { text: "Open Settings", onPress: () => openAppSettings() },
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
      if (existing) {
        await updateSticker({
          id: existing.id,
          packId: selectedPackId,
          name,
          emojis: parseEmojis(emojiText),
          tags: tagList,
          location,
          image:
            image.uri === original?.uri && original.uri === getStickerUri(existing.path)
              ? undefined
              : {
                  sourceUri: image.uri,
                  width: image.width,
                  height: image.height,
                  mimeType: image.mimeType,
                },
        });
      } else {
        await createSticker({
          packId: selectedPackId,
          name,
          sourceUri: image.uri,
          width: image.width,
          height: image.height,
          mimeType: image.mimeType,
          emojis: parseEmojis(emojiText),
          tags: tagList,
          location: location ?? undefined,
          sourceAssetId: params.assetId,
        });
      }
      if (params.draftId) deleteDraft(params.draftId);
      // Clear the editing steps off the stack, then show the pack the sticker is in.
      Haptic.success();
      allowLeave();
      router.dismissAll();
      router.push({ pathname: "/(pages)/(packs)/[id]", params: { id: selectedPackId } });
    } catch (error) {
      setSaving(false);
      Haptic.error();
      showAlert(
        editing ? "Couldn’t Save Sticker" : "Couldn’t Add Sticker",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const tabs: { key: EditorTab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "tags", label: "Tags" },
    ...(params.packId && !editing ? [] : [{ key: "pack" as const, label: "Pack" }]),
    { key: "place", label: "Place" },
  ];

  return (
    <Screen>
      <SheetHeader
        title={editing ? "Edit Sticker" : "New Sticker"}
        left={<HeaderButton label="Cancel" onPress={router.back} />}
        right={
          <HeaderButton
            label={editing ? "Save" : "Add"}
            bold
            disabled={!canSave}
            loading={saving}
            onPress={save}
          />
        }
      />
        <KeyboardAvoid keyboardVerticalOffset={windowHeight * (1 - SHEET_HEIGHT)}>
          <Box
            flex={1}
            center
            bg="secondarySystemGroupedBackground"
            radius="xl"
            overflow="hidden"
            style={{ margin: 16, marginTop: 4, marginBottom: 12 }}
          >
            {image ? (
              <Image
                source={{ uri: image.uri }}
                contentFit="contain"
                style={{ width: "100%", height: "100%" }}
              />
            ) : null}
          </Box>

          <TabStrip tabs={tabs} value={tab} onChange={setTab} />

          <Box flex={1}>
            <ScrollView gap="md" py="md">
              {tab === "details" && (
                <ListSection footer="Up to 3 emoji. Needed to share to WhatsApp and Telegram.">
                  <TextField value={name} onChangeText={setName} placeholder="Name" />
                  <TextField
                    value={emojiText}
                    onChangeText={setEmojiText}
                    placeholder="Emoji 😀"
                    autoCorrect={false}
                  />
                </ListSection>
              )}

              {tab === "tags" && (
                <>
                  <ListSection footer="Tags help you find stickers later. Press return or comma to add one.">
                    <TextField
                      value={tagText}
                      onChangeText={(text) =>
                        text.endsWith(",") ? addTag(text.slice(0, -1)) : setTagText(text)
                      }
                      onSubmitEditing={() => addTag(tagText)}
                      placeholder="Add a tag"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      blurOnSubmit={false}
                    />
                  </ListSection>
                  {tagList.length > 0 && (
                    <Box row gap="sm" px="lg" style={{ flexWrap: "wrap" }}>
                      {tagList.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          tinted
                          onRemove={() => setTagList(tagList.filter((entry) => entry !== tag))}
                        />
                      ))}
                    </Box>
                  )}
                  {popularTags.some((tag) => !tagList.includes(tag)) && (
                    <Box gap="sm" px="lg">
                      <Text variant="footnote" color="secondaryLabel">
                        YOUR TAGS
                      </Text>
                      <Box row gap="sm" style={{ flexWrap: "wrap" }}>
                        {popularTags
                          .filter((tag) => !tagList.includes(tag))
                          .map((tag) => (
                            <Chip key={tag} label={tag} onPress={() => addTag(tag)} />
                          ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {tab === "pack" && (
                <ListSection>
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
                    onPress={() => {
                      // The pack made there is picked automatically when this sheet shows again.
                      setChosenPackId(undefined);
                      setPacksBeforeNew(packs.map((pack) => pack.id));
                      router.push("/(pages)/(packs)/pack-page");
                    }}
                  />
                </ListSection>
              )}

              {tab === "place" && (
                <ListSection footer={
                  photoLocation
                    ? "Taken from where the photo was captured."
                    : "This photo has no location, so your current position is used."
                }>
                  <ListRow
                    label={photoLocation ? "Photo Location" : editing ? "Saved Place" : "Current Location"}
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
              )}
            </ScrollView>
          </Box>
        </KeyboardAvoid>
    </Screen>
  );
}

type EditorTab = "details" | "tags" | "pack" | "place";
