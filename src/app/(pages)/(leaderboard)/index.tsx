import { Trophy } from "lucide-react-native";
import { EmptyState, Screen } from "@/components/ui";

export default function LeaderboardScreen() {
  return (
    <Screen bg="systemGroupedBackground">
      <EmptyState
        icon={Trophy}
        title="Leaderboard"
        description="See who's collecting and creating the most stickers. Coming soon."
      />
    </Screen>
  );
}
