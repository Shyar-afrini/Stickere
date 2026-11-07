import { Stack } from "expo-router";
import type { NativeStackNavigationOptions } from "expo-router";

import { SHEET_HEIGHT } from "@/constants/sheet";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";

// A bottom sheet on both platforms; Android draws it with its own sheet behaviour.
const SHEET: NativeStackNavigationOptions = {
  presentation: "formSheet",
  headerShown: false,
  // Pages only go back with the arrow, but a sheet closes the standard way: swipe it down (or Cancel,
  // or Android's back). Unsaved changes ask first (`useConfirmDiscard`).
  gestureEnabled: true,
  sheetAllowedDetents: [SHEET_HEIGHT],
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
};

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
      <Stack.Screen name="map" options={{ title: "" }} />
      <Stack.Screen name="sticker" options={{ title: "" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="pin" options={{ title: "" }} />
      <Stack.Screen
        name="new-pack"
        options={{ ...SHEET, title: "New Pack" }}
      />
      <Stack.Screen name="pack-page" options={{ title: "New Pack" }} />
      <Stack.Screen name="drafts" options={{ title: "Drafts" }} />
      <Stack.Screen name="edit-image" options={{ title: "" }} />
      <Stack.Screen name="new-sticker" options={{ ...SHEET, title: "New Sticker" }} />
    </Stack>
  );
}
