import { useRouter } from "expo-router";

import { PackCard } from "@/components/pack-card";
import { EmptyState, Fab, Grid, Screen } from "@/components/ui";
import { usePacks } from "@/hooks/use-packs";

export default function Packs() {
  const router = useRouter();
  const { packs, isLoading } = usePacks();

  if (isLoading) {
    return null;
  }

  const newPack = () => router.push("/(pages)/(packs)/new-pack");

  return (
    <Screen>
      {packs.length === 0 ? (
        <EmptyState
          symbol="square.stack"
          title="No Packs"
          description="Create your first sticker pack."
          action={{ label: "New Pack", onPress: newPack }}
        />
      ) : (
        <Grid
          data={packs}
          keyExtractor={(pack) => String(pack.id)}
          renderItem={(pack) => <PackCard pack={pack} />}
          // Leaves room so the floating button never covers the last row.
          bottomInset={96}
        />
      )}

      <Fab actions={[{ label: "New Pack", symbol: "square.stack", onPress: newPack }]} />
    </Screen>
  );
}
