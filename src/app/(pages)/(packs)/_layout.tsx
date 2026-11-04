import { Stack } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

export default function PacksLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme.systemBlue,
        headerTitleStyle: { color: theme.label },
        headerStyle: { backgroundColor: theme.systemGroupedBackground },
        contentStyle: { backgroundColor: theme.systemGroupedBackground },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Packs",
          headerLargeTitleEnabled: true,
          headerLargeStyle: { backgroundColor: theme.systemGroupedBackground },
          headerLargeTitleStyle: { color: theme.label },
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen
        name="new-pack"
        options={{ presentation: "modal", title: "New Pack" }}
      />
      <Stack.Screen
        name="new-sticker"
        options={{ presentation: "modal", title: "New Sticker" }}
      />
    </Stack>
  );
}
