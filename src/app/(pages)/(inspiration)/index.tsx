import { Sparkles } from "lucide-react-native";
import { EmptyState, Screen } from "@/components/ui";

export default function InspirationScreen() {
  return (
    <Screen bg="systemGroupedBackground">
      <EmptyState
        icon={Sparkles}
        title="Inspiration"
        description="Fresh sticker ideas to spark your next pack. Coming soon."
      />
    </Screen>
  );
}
