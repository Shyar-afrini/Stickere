import type { NativeStackHeaderProps } from "expo-router";
import { BlurView } from "expo-blur";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderButton, Text } from "@/components/ui";
import { Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HEADER_BAR } from "@/hooks/use-header-inset";
import { useTheme } from "@/hooks/use-theme";

/**
 * Navigation bar shared by every stack screen. The native header would wrap
 * its buttons in a system pill, so the bar is drawn here: frosted buttons like
 * the floating tab bar, an optional centered title, and no background of its own: it is always transparent.
 */
export function AppHeader({ options, back, navigation }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = useColorScheme();
  const title = typeof options.title === "string" ? options.title : "";
  const props = { canGoBack: back !== undefined };

  const left =
    options.headerLeft?.(props) ??
    (back ? (
      <HeaderButton icon={ChevronLeft} accessibilityLabel="Back" onPress={navigation.goBack} />
    ) : null);
  const right = options.headerRight?.(props);

  return (
    <View
      // Only the buttons take touches; the content underneath stays scrollable.
      pointerEvents="box-none"
      style={[
        styles.bar,
        { paddingTop: insets.top + 4, height: insets.top + HEADER_BAR },
      ]}
    >
      <View style={styles.side}>{left}</View>
      <View style={styles.title} pointerEvents="none">
        {title ? (
          // Frosted like the buttons, so the title reads on any background.
          <View style={[styles.titleShadow, Shadows.floating]}>
            <BlurView
              intensity={60}
              tint={scheme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight"}
              style={[styles.titleGlass, { borderColor: theme.separator }]}
            >
              <Text variant="headline" numberOfLines={1}>
                {title}
              </Text>
            </BlurView>
          </View>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  side: { flexDirection: "row", alignItems: "center", minWidth: 56 },
  right: { justifyContent: "flex-end" },
  titleShadow: { borderRadius: 20, maxWidth: "100%" },
  titleGlass: {
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    position: "absolute",
    left: 72,
    right: 72,
    bottom: 4,
    alignItems: "center",
  },
});
