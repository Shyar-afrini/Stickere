import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { LockModal } from "@/components/lock-screen";
import { ToastHost, Screen, Text } from "@/components/ui";
import { unlockApp, useLockState } from "@/lib/lock-state";
import "@/lib/geofence";
import { db } from "@/db";
import migrations from "../../drizzle/migrations";

const MIN_LOADING_MS = 4000;
// Set once the animation has played in this process, so the app being rebuilt (coming back from another app)
// never shows it again.
let startedOnce = false;

/** Covers the whole app, native modals included, until the PIN or Face ID is given. */
function AppLockGate() {
  const { appLocked } = useLockState();
  return (
    <LockModal
      visible={appLocked}
      title="Stickerê Locked"
      onUnlock={unlockApp}
    />
  );
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  // The app name is set in Calvino. A failed load falls back to the system font.
  const [fontsLoaded, fontError] = useFonts({
    Calvino: require("../../assets/fonts/Calvino-Bold-trial.ttf"),
    // The handwritten captions on the back of a stamp.
    Caveat: Caveat_600SemiBold,
  });
  // Keep the animation up long enough to play through once, even when the database is quick.
  const [shownLongEnough, setShownLongEnough] = useState(startedOnce);

  useEffect(() => {
    if (startedOnce) return;
    const timer = setTimeout(() => {
      startedOnce = true;
      setShownLongEnough(true);
    }, MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <Screen center bg="systemGroupedBackground">
        <Text color="systemRed">Migration error: {error.message}</Text>
      </Screen>
    );
  }

  if (!success || !shownLongEnough || !(fontsLoaded || fontError)) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Dark icons on light screens and light icons on dark ones, on both platforms. */}
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* The Rewind story covers everything, tab bar included. */}
        <Stack.Screen
          name="rewind"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            gestureEnabled: false,
          }}
        />
      </Stack>
      <AppLockGate />
      <ToastHost />
    </>
  );
}
