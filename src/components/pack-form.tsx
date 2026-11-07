import { eq } from "drizzle-orm";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import {
  Box,
  KeyboardAvoid,
  RouteSheet,
  Button,
  DiscardConfirm,
  HeaderButton,
  Image,
  ListRow,
  ListSection,
  ScrollView,
  Screen,
  SheetHeader,
  TextField,
  showToast,
} from "@/components/ui";
import { db } from "@/db";
import { createPack, updatePack } from "@/db/mutations";
import { packs } from "@/db/schema";
import { useSheetAction } from "@/hooks/use-sheet-open";
import { useConfirmDiscard } from "@/hooks/use-confirm-discard";
import { Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { Haptic } from "@/lib/haptics";
import {
  deleteStickerImage,
  getStickerUri,
  saveStickerImage,
} from "@/lib/sticker-storage";

/**
 * Create or edit a pack. Shown as a sheet (title bar drawn inside it) or, with `asPage`, as a pushed
 * page under the app's header — opened from inside another sheet, where a second sheet misbehaves.
 */
/** The form is short: the sheet is only as tall as it needs to be. */
const PACK_SHEET_HEIGHT = 540;

export function PackForm({ asPage = false }: { asPage?: boolean }) {
  const router = useRouter();
  const headerInset = useHeaderInset();
  // Opened with a `packId` to edit that pack instead of creating one.
  const { packId } = useLocalSearchParams<{ packId?: string }>();
  const [existing] = useState(() =>
    packId
      ? db
          .select()
          .from(packs)
          .where(eq(packs.id, Number(packId)))
          .get()
      : undefined,
  );
  const editing = existing !== undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [author, setAuthor] = useState(existing?.author ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  // The cover shown in the form: a stored image, or a just-picked file that is copied in on save.
  const [cover, setCover] = useState<{ uri: string; picked: boolean } | null>(
    existing?.coverPath
      ? { uri: getStickerUri(existing.coverPath), picked: false }
      : null,
  );

  const [choosing, setChoosing] = useState(false);
  const chooseCover = async () => {
    if (choosing) return;
    setChoosing(true);
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
    } finally {
      setChoosing(false);
    }
    if (result.canceled) return;
    Haptic.selection();
    setCover({ uri: result.assets[0].uri, picked: true });
  };

  const canSave = name.trim().length > 0;
  const dirty =
    name !== (existing?.name ?? "") ||
    author !== (existing?.author ?? "") ||
    description !== (existing?.description ?? "") ||
    (cover?.picked ?? false) ||
    (cover === null && !!existing?.coverPath);
  const { allowLeave, confirm } = useConfirmDiscard(dirty);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let coverPath = existing?.coverPath ?? null;
      if (cover?.picked) coverPath = await saveStickerImage(cover.uri);
      else if (cover === null) coverPath = null;

      if (existing)
        updatePack({ id: existing.id, name, author, description, coverPath });
      else createPack({ name, author, description, coverPath });
      // The replaced or removed cover file is no longer used by anything.
      if (existing?.coverPath && existing.coverPath !== coverPath)
        deleteStickerImage(existing.coverPath);
      Haptic.success();
      allowLeave();
      router.back();
    } catch (error) {
      setSaving(false);
      Haptic.error();
      showToast(
        editing ? "Couldn’t Save Pack" : "Couldn’t Create Pack",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const content = (
    <Screen>
      {asPage ? (
        <Stack.Screen
          options={{
            title: editing ? "Edit Pack" : "New Pack",
            headerRight: () => (
              <HeaderButton
                label={editing ? "Save" : "Create"}
                bold
                disabled={!canSave}
                onPress={save}
              />
            ),
          }}
        />
      ) : (
        <SheetHeader title={editing ? "Edit Pack" : "New Pack"} />
      )}
      <ScrollView
        gap="lg"
        py="md"
        contentContainerStyle={
          asPage && { paddingTop: headerInset + Spacing.sm }
        }
      >
        <ListSection>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Name"
            returnKeyType="done"
            onSubmitEditing={() => canSave && save()}
          />
        </ListSection>
        <ListSection footer="Shown on the pack's card. Without one, its newest stickers are shown.">
          <ListRow
            label={cover ? "Change Cover Image" : "Add Cover Image"}
            tinted
            loading={choosing}
            onPress={chooseCover}
            trailing={
              cover ? (
                <Box
                  radius="md"
                  overflow="hidden"
                  style={{ width: 44, height: 44 }}
                >
                  <Image
                    source={{ uri: cover.uri }}
                    contentFit="cover"
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              ) : undefined
            }
          />
          {cover && (
            <ListRow
              label="Remove Cover Image"
              tinted
              onPress={() => setCover(null)}
            />
          )}
        </ListSection>
        <ListSection footer="Shown to people you share this pack with.">
          <TextField
            value={author}
            onChangeText={setAuthor}
            placeholder="Author"
          />
          <TextField
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
          />
        </ListSection>
        {asPage && (
          <Box px="lg">
            <Button
              title={editing ? "Save Changes" : "Create Pack"}
              loading={saving}
              disabled={!canSave || (editing && !dirty)}
              onPress={save}
            />
          </Box>
        )}
      </ScrollView>
    </Screen>
  );

  // As a sheet, the save button lives in the tab bar while the sheet is open.
  useSheetAction(
    asPage
      ? null
      : {
          label: editing ? "Save Changes" : "Create Pack",
          loading: saving,
          disabled: !canSave || (editing && !dirty),
          onPress: save,
        },
  );

  // As a sheet it is drawn on the frosted `RouteSheet`; as a page it fills the screen.
  return asPage ? (
    <Box flex={1}>
      {content}
      <DiscardConfirm {...confirm} />
    </Box>
  ) : (
    <Box flex={1}>
      <RouteSheet dirty={dirty && !saving} maxHeight={PACK_SHEET_HEIGHT}>
        <Box flex={1}>
          {/* Lifts the form above the keyboard, so the lower fields stay in view while typing. */}
          <KeyboardAvoid>{content}</KeyboardAvoid>
          <DiscardConfirm {...confirm} />
        </Box>
      </RouteSheet>
    </Box>
  );
}
