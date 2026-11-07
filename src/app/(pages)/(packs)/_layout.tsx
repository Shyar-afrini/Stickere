import { Stack, type StackNavigationOptions } from "expo-router/js-stack";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";

// This is a JS stack (not the native one) so that a sheet is drawn inside the tab layout, under the floating
// tab bar, which therefore stays visible and tappable. A bottom sheet: a transparent screen that draws the app's frosted `RouteSheet` on it. Closing is handled by
// the sheet itself (tap outside, drag the handle down), so the native gesture is off. Unsaved changes ask
// first (`useConfirmDiscard`).
const SHEET: StackNavigationOptions = {
  presentation: "transparentModal",
  animation: "none",
  headerShown: false,
  gestureEnabled: false,
  cardStyle: { backgroundColor: "transparent" },
  // The JS stack's own card shadow and dimming would paint over the page behind the sheet.
  cardShadowEnabled: false,
  cardOverlayEnabled: false,
};

export default function PacksLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        header: (props) => <AppHeader {...props} />,
        // Content runs underneath the bar; screens add `useHeaderInset()` of space at the top.
        headerTransparent: true,
        // Swipe in from the screen edge to go back. Screens driven by hand gestures turn it off below.
        gestureEnabled: true,
        headerShadowVisible: false,
        headerTintColor: theme.systemBlue,
        headerTitleStyle: { color: theme.label },
        headerStyle: { backgroundColor: "transparent" },
        cardStyle: { backgroundColor: theme.systemGroupedBackground },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          // No title at all: the grid starts right under the header buttons.
          title: "",
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
      <Stack.Screen name="map" options={{ title: "", gestureEnabled: false }} />
      <Stack.Screen
        name="sticker"
        options={{ title: "", gestureEnabled: false }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="pin" options={{ title: "" }} />
      <Stack.Screen name="new-pack" options={{ ...SHEET, title: "New Pack" }} />
      <Stack.Screen name="pack-page" options={{ title: "New Pack" }} />
      <Stack.Screen name="drafts" options={{ title: "Drafts" }} />
      <Stack.Screen
        name="edit-image"
        options={{ title: "", gestureEnabled: false }}
      />
      <Stack.Screen
        name="share-sticker"
        options={{ ...SHEET, title: "Share" }}
      />
      <Stack.Screen
        name="new-sticker"
        options={{ ...SHEET, title: "New Sticker" }}
      />
    </Stack>
  );
}
