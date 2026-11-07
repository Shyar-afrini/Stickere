import { Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useState } from "react";

import {
  ListRow,
  ListSection,
  Screen,
  ScrollView,
  Toggle,
  showToast,
} from "@/components/ui";
import {
  disableArrivalReminders,
  enableArrivalReminders,
} from "@/lib/geofence";
import { getArrivalReminders } from "@/lib/settings";
import { openAppSettings } from "@/lib/platform";

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
        showToast(
          result === "location-denied"
            ? "Location Access Needed"
            : "Notifications Are Off",
          result === "location-denied"
            ? "Reminders work in the background, so Stickerê needs location access set to “Always”."
            : "Allow notifications in Settings to get reminders.",
          { label: "Settings", onPress: () => openAppSettings() },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        gap="xl"
        py="lg"
        contentContainerStyle={{
          paddingTop: headerInset + Spacing.sm,
          paddingBottom: tabInset,
        }}
      >
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
