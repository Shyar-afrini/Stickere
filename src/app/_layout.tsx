import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";

import { Screen, Text } from "@/components/ui";
import { db } from "@/db";
import migrations from "../../drizzle/migrations";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <Screen center bg="systemGroupedBackground">
        <Text color="systemRed">Migration error: {error.message}</Text>
      </Screen>
    );
  }

  if (!success) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
