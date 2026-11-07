import { useRouter } from "expo-router";
import { FileClock, Trash2 } from "lucide-react-native";
import { useState } from "react";

import {
  Box,
  EmptyState,
  Icon,
  Image,
  Pressable,
  Screen,
  ScrollView,
  Text,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { deleteDraft, listDrafts } from "@/lib/drafts";
import { Haptic } from "@/lib/haptics";

export default function Drafts() {
  const router = useRouter();
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const [drafts, setDrafts] = useState(listDrafts);
  const [armed, setArmed] = useState<string | null>(null);

  if (drafts.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon={FileClock}
          title="No Drafts"
          description="Tap the save button while editing a sticker to finish it later."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        gap="md"
        py="lg"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: headerInset + Spacing.sm,
          paddingBottom: tabInset,
        }}
      >
        {drafts.map((draft) => (
          <Box
            key={draft.id}
            row
            align="center"
            gap="md"
            p="md"
            radius="lg"
            bg="secondarySystemGroupedBackground"
          >
            <Pressable
              accessibilityLabel="Continue editing"
              onPress={() =>
                router.push({
                  pathname: "/(pages)/(packs)/edit-image",
                  params: { draftId: draft.id },
                })
              }
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Image
                source={{ uri: draft.editor.baseUri ?? draft.originalUri }}
                contentFit="contain"
                style={{ width: 64, height: 64, borderRadius: 8 }}
              />
              <Box flex={1}>
                <Text weight="semibold">{draft.params.name || "Sticker"}</Text>
                <Text variant="footnote" color="secondaryLabel">
                  {new Date(draft.updatedAt).toLocaleString()}
                </Text>
              </Box>
            </Pressable>
            <Pressable
              accessibilityLabel={
                armed === draft.id
                  ? "Tap again to delete draft"
                  : "Delete draft"
              }
              onPress={() => {
                if (armed !== draft.id) {
                  Haptic.tap();
                  setArmed(draft.id);
                  return;
                }
                deleteDraft(draft.id);
                setArmed(null);
                setDrafts(listDrafts());
              }}
            >
              {armed === draft.id ? (
                <Text variant="subheadline" weight="semibold" color="systemRed">
                  Delete?
                </Text>
              ) : (
                <Icon icon={Trash2} size={20} color="systemRed" />
              )}
            </Pressable>
          </Box>
        ))}
      </ScrollView>
    </Screen>
  );
}
