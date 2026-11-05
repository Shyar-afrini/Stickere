import { NearbyStrip } from "@/components/nearby-strip";
import { PackCard } from "@/components/pack-card";
import { EmptyState, Grid, HeaderButton, ReorderCell, Screen } from "@/components/ui";
import { reorderPacks } from "@/db/mutations";
import { useReorder } from "@/hooks/use-reorder";
import { useNearbyStickers } from "@/hooks/use-nearby-stickers";
import { usePacks } from "@/hooks/use-packs";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { Stack, useRouter } from "expo-router";
import { Bell, Layers, Sparkles } from "lucide-react-native";

export default function Packs() {
  const router = useRouter();
  const { packs, isLoading } = usePacks();
  const nearby = useNearbyStickers();
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const { controller, order, activeKey, dragging, editing, startEditing, stopEditing } = useReorder(
    packs,
    (pack) => String(pack.id),
    (next) => reorderPacks(next.map((pack) => pack.id)),
  );

  if (isLoading) {
    return null;
  }

  const newPack = () => router.push("/(pages)/(packs)/new-pack");

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () =>
            editing ? (
              <HeaderButton label="Done" bold onPress={stopEditing} />
            ) : (
            <>
              <HeaderButton
                icon={Bell}
                accessibilityLabel="Reminders"
                onPress={() => router.push("/(pages)/(packs)/reminders")}
              />
              <HeaderButton
                icon={Sparkles}
                accessibilityLabel="Sticker ideas from your trips"
                onPress={() => router.push("/(pages)/(packs)/suggestions")}
              />
            </>
          ),
        }}
      />
      {packs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Packs"
          description="Create your first sticker pack."
          action={{ label: "New Pack", onPress: newPack }}
        />
      ) : (
        <Grid
          data={order}
          keyExtractor={(pack) => String(pack.id)}
          scrollEnabled={!dragging}
          renderItem={(pack) => (
            <ReorderCell
              controller={controller}
              id={String(pack.id)}
              active={activeKey === String(pack.id)}
              editing={editing}
              onEnterEditing={startEditing}
            >
              {(handlers) => <PackCard pack={pack} {...handlers} />}
            </ReorderCell>
          )}
          // Leaves room so the floating tab bar never covers the last row.
          bottomInset={tabInset}
          topInset="sm"
          headerInset={headerInset}
          header={<NearbyStrip stickers={nearby} />}
        />
      )}
    </Screen>
  );
}
