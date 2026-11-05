import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { Linking } from "react-native";
import { useState } from "react";

import {
  ListRow,
  ListSection,
  Screen,
  ScrollView,
  Toggle,
  showAlert,
} from "@/components/ui";
import {
  disableArrivalReminders,
  enableArrivalReminders,
} from "@/lib/geofence";
import { getArrivalReminders } from "@/lib/settings";

export default function Reminders() {
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const [enabled, setEnabled] = useState(getArrivalReminders);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (!next) {
        await disableArrivalReminders();
        setEnabled(false);
        return;
      }

      const result = await enableArrivalReminders();
      setEnabled(result === "enabled");
      if (result !== "enabled") {
        showAlert(
          result === "location-denied"
            ? "Location Access Needed"
            : "Notifications Are Off",
          result === "location-denied"
            ? "Reminders work in the background, so Stickerê needs location access set to “Always”."
            : "Allow notifications in Settings to get reminders.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView gap="xl" py="lg" contentContainerStyle={{ paddingTop: headerInset + 16, paddingBottom: tabInset }}>
        <ListSection footer="Get a notification when you arrive at a place where you saved stickers. Up to 20 places are watched at a time, nearest first. On Android, reminders can pause if the system closes the app.">
          <ListRow
            label="Remind Me at Saved Places"
            trailing={
              <Toggle value={enabled} onValueChange={toggle} disabled={busy} />
            }
          />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}
