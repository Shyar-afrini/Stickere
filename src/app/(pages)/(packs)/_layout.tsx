import { Stack } from "expo-router";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";

export default function PacksLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        header: (props) => <AppHeader {...props} />,
        // Content runs underneath the bar; screens add `useHeaderInset()` of space at the top.
        headerTransparent: true,
        // Going back is only done with the header arrow, never by swiping.
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        headerShadowVisible: false,
        headerTintColor: theme.systemBlue,
        headerTitleStyle: { color: theme.label },
        headerStyle: { backgroundColor: "transparent" },
        contentStyle: { backgroundColor: theme.systemGroupedBackground },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          // No title at all: the grid starts right under the header buttons.
          title: "",
          headerLargeTitleEnabled: false,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen name="map" options={{ title: "Map" }} />
      <Stack.Screen name="sticker" options={{ title: "" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="pin" options={{ title: "PIN" }} />
      <Stack.Screen
        name="new-pack"
        options={{ presentation: "modal", title: "New Pack" }}
      />
      <Stack.Screen name="drafts" options={{ title: "Drafts" }} />
      <Stack.Screen name="edit-image" options={{ title: "Edit" }} />
      <Stack.Screen
        name="new-sticker"
        options={{ title: "New Sticker" }}
      />
    </Stack>
  );
}
