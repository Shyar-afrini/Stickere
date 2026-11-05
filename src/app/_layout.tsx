import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { LockModal } from "@/components/lock-screen";
import { Screen, Text } from "@/components/ui";
import { unlockApp, useLockState } from "@/lib/lock-state";
import "@/lib/geofence";
import { db } from "@/db";
import migrations from "../../drizzle/migrations";

const MIN_LOADING_MS = 5000;

/** Covers the whole app, native modals included, until the PIN or Face ID is given. */
function AppLockGate() {
  const { appLocked } = useLockState();
  return <LockModal visible={appLocked} title="Stickerê Locked" onUnlock={unlockApp} />;
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  // Keep the animation up long enough to play through once, even when the database is quick.
  const [shownLongEnough, setShownLongEnough] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShownLongEnough(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <Screen center bg="systemGroupedBackground">
        <Text color="systemRed">Migration error: {error.message}</Text>
      </Screen>
    );
  }

  if (!success || !shownLongEnough) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <AppLockGate />
    </>
  );
}
