import { BlurView } from "expo-blur";
import { useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui";
import { Bell, ChevronsUpDown, FileClock, House, Layers, Lightbulb, MapPin, Plus, Settings, Sparkles, Sticker, Trophy, type LucideIcon } from "lucide-react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type ViewProps } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Pressable, Text } from "@/components/ui";
import { Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TAB_BAR_GAP, TAB_BAR_HEIGHT, TAB_BAR_MARGIN, TAB_BAR_SIDE_MARGIN } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { startNewSticker } from "@/lib/add-sticker";

const BAR_PADDING = 5;
const BUBBLE_HEIGHT = 58;

/** Lets the focused tab move the sliding bubble, which lives in the bar, and tells it how wide a tab is. */
const TabBarContext = createContext<{ select: (index: number) => void; buttonWidth: number }>({
  select: () => {},
  buttonWidth: 92,
});

function TabButton({
  icon,
  label,
  index,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: LucideIcon; label: string; index: number }) {
  const { select, buttonWidth } = useContext(TabBarContext);

  useEffect(() => {
    if (isFocused) {
      select(index);
    }
  }, [isFocused, index, select]);

  return (
    <Pressable {...props} style={[styles.button, { width: buttonWidth }]} accessibilityLabel={label}>
      <Icon
        icon={icon}
        size={24}
        color={isFocused ? "systemBlue" : "systemGray"}
        strokeWidth={isFocused ? 2.5 : 2}
      />
      {/* Only the active tab names itself; one line that shrinks to fit its slot. */}
      {isFocused && (
        <Text variant="caption2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color="systemBlue">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type AddAction = { label: string; icon: LucideIcon; onPress: () => void };

const SPRING = { damping: 16, stiffness: 180, mass: 0.8 };
/** Height of the expanded panel the pill morphs into. */
const MENU_HEIGHT = 272;

/**
 * Detached pill floating over the content, next to a round add button. The
 * glass is a backdrop blur of whatever scrolls underneath. Tapping the button
 * springs the pill open into a panel of actions; the tab triggers stay mounted
 * and only fade out, so routing keeps working.
 */
function TabBar({ children, style, ...props }: ViewProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  // The bar spans the screen minus its side margins: round button on the right, tabs filling the pill.
  const pillWidth = windowWidth - TAB_BAR_SIDE_MARGIN * 2 - TAB_BAR_GAP - TAB_BAR_HEIGHT;
  // Four slots: the three tabs, then the menu button, which is not a tab.
  const buttonWidth = (pillWidth - BAR_PADDING * 2) / 4;
  const active = useSharedValue(0);
  const progress = useSharedValue(0);

  const [open, setOpen] = useState(false);

  // A sticker added from inside a pack goes into that pack.
  const inPack = segments[segments.length - 1] === "[id]";
  // The sticker editor is a full page with its own controls at the bottom.
  const hidden = ["new-sticker", "edit-image", "sticker"].includes(segments[segments.length - 1]);
  const actions: AddAction[] = [
    {
      label: "Sticker",
      icon: Sticker,
      onPress: () => startNewSticker(router, inPack && id ? Number(id) : undefined),
    },
    {
      label: "Pack",
      icon: Layers,
      onPress: () => router.push("/(pages)/(packs)/new-pack"),
    },
    {
      label: "Drafts",
      icon: FileClock,
      onPress: () => router.push("/(pages)/(packs)/drafts"),
    },
    {
      label: "Ideas",
      icon: Lightbulb,
      onPress: () => router.push("/(pages)/(packs)/suggestions"),
    },
    {
      label: "Reminders",
      icon: Bell,
      onPress: () => router.push("/(pages)/(packs)/reminders"),
    },
    {
      label: "Map",
      icon: MapPin,
      onPress: () => router.push("/(pages)/(packs)/map"),
    },
    {
      label: "Settings",
      icon: Settings,
      onPress: () => router.push("/(pages)/(packs)/settings"),
    },
  ];

  // The round button creates whatever belongs to the page: a pack on the home page, a sticker inside a pack,
  // and a sticker anywhere else.
  const onPacksPage = segments[segments.length - 1] === "(packs)";
  const create = onPacksPage
    ? { label: "New Pack", run: () => router.push("/(pages)/(packs)/new-pack") }
    : {
        label: "New Sticker",
        run: () => startNewSticker(router, inPack && id ? Number(id) : undefined),
      };

  const select = (index: number) => {
    active.value = withSpring(index, SPRING);
  };

  const toggle = (next: boolean) => {
    setOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING);
  };

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: active.value * buttonWidth }],
  }));

  // Unclamped on purpose: the overshoot of the spring is the bounce.
  const panelStyle = useAnimatedStyle(() => ({
    height: TAB_BAR_HEIGHT + progress.value * MENU_HEIGHT,
    borderRadius: interpolate(progress.value, [0, 1], [34, 28], Extrapolation.CLAMP),
  }));

  const tabsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.1, 0.6], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [40, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.7, 1]) },
    ],
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 0.8], [0, 1], Extrapolation.CLAMP),
  }));

  // Turns upside down while the menu is open.
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const tint = scheme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight";

  return (
    <TabBarContext.Provider value={{ select, buttonWidth }}>
      {open && (
        <Pressable
          feedback="none"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
          onPress={() => toggle(false)}
        />
      )}
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_MARGIN }, hidden && { display: "none" }]}
      >
        <Animated.View style={[styles.pill, styles.shadow, Shadows.floating, { width: pillWidth }, panelStyle]}>
          <BlurView
            intensity={60}
            tint={tint}
            style={[styles.bar, { borderColor: theme.separator }]}
          >
            <Animated.View
              pointerEvents={open ? "none" : "auto"}
              style={[styles.tabs, tabsStyle]}
            >
              {/* Frosted bubble that slides to the selected tab. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  { width: buttonWidth },
                  { backgroundColor: theme.systemFill, borderColor: theme.separator },
                  bubbleStyle,
                ]}
              />
              {/* expo-router's tab list spreads its items with `space-between`; the tabs must pack to the left, in the
                  first three slots, leaving the fourth to the menu button. */}
              <View
                {...props}
                style={[style, styles.list, { width: buttonWidth * 3 + BAR_PADDING, justifyContent: "flex-start" }]}
              >
                {children}
              </View>
            </Animated.View>
            <Animated.View
              pointerEvents={open ? "auto" : "none"}
              style={[styles.menu, menuStyle]}
            >
              {actions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityLabel={`New ${action.label}`}
                  style={styles.tile}
                  onPress={() => {
                    toggle(false);
                    action.onPress();
                  }}
                >
                  <View style={[styles.tileIcon, { backgroundColor: theme.systemFill }]}>
                    <Icon icon={action.icon} size={24} />
                  </View>
                  <Text variant="caption2" color="secondaryLabel">
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
            {/* Hairline between the open menu's items and the bar holding the menu button. */}
            <Animated.View
              pointerEvents="none"
              style={[styles.menuDivider, { backgroundColor: theme.separator }, dividerStyle]}
            />
            {/* Shown in the bar's bottom row while the menu is open, where the tabs have faded out. */}
            <Animated.View pointerEvents="none" style={[styles.appName, dividerStyle]}>
              <Text variant="title3" style={{ fontFamily: "Calvino", fontWeight: "normal" }}>
                Stickerê
              </Text>
            </Animated.View>
            {/* Hairline between the tabs and the menu button. */}
            <View
              pointerEvents="none"
              style={[styles.divider, { right: BAR_PADDING + buttonWidth, backgroundColor: theme.separator }]}
            />
            {/* Fourth slot of the bar. It is not a tab: it opens and closes the menu, and stays put while
                the tabs fade out. */}
            <Pressable
              accessibilityLabel={open ? "Close menu" : "Open menu"}
              style={[styles.menuButton, { width: buttonWidth }]}
              onPress={() => toggle(!open)}
            >
              <Animated.View style={chevronStyle}>
                <Icon icon={ChevronsUpDown} size={24} color={open ? "systemBlue" : "systemGray"} />
              </Animated.View>
            </Pressable>
          </BlurView>
        </Animated.View>
        {/* Separate action button, detached from the pill. */}
        <View style={[styles.shadow, styles.addShadow, Shadows.floating]}>
          <BlurView
            intensity={60}
            tint={tint}
            style={[styles.add, { borderColor: theme.separator }]}
          >
            <Pressable
              accessibilityLabel={create.label}
              style={styles.addPress}
              onPress={() => {
                if (open) toggle(false);
                create.run();
              }}
            >
              <Icon icon={Plus} size={28} strokeWidth={2.5} />
            </Pressable>
          </BlurView>
        </View>
      </View>
    </TabBarContext.Provider>
  );
}

export default function PagesLayout() {
  const theme = useTheme();

  return (
    <Tabs>
      <View style={{ flex: 1, backgroundColor: theme.systemGroupedBackground }}>
        <TabSlot />
      </View>
      {/* TabList must stay a direct child of Tabs, so the pill is rendered through asChild. */}
      <TabList asChild>
        <TabBar>
          <TabTrigger name="packs" href="/(pages)/(packs)" asChild>
            <TabButton icon={House} label="Home" index={0} />
          </TabTrigger>
          <TabTrigger name="leaderboard" href="/(pages)/(leaderboard)" asChild>
            <TabButton icon={Trophy} label="Ranks" index={1} />
          </TabTrigger>
          <TabTrigger name="inspiration" href="/(pages)/(inspiration)" asChild>
            <TabButton icon={Sparkles} label="Inspiration" index={2} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: TAB_BAR_GAP,
  },
  shadow: { borderRadius: 34 },
  pill: {},
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 2.5, marginTop: 6 },
  tabs: { position: "absolute", left: 0, right: 0, bottom: 0, height: TAB_BAR_HEIGHT },
  menu: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: MENU_HEIGHT,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 18,
    rowGap: 14,
  },
  // One tile per tab column, so the grid lines up with the tabs below.
  tile: { width: "33%", alignItems: "center", gap: 4 },
  tileIcon: {
    width: 64,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addShadow: { width: TAB_BAR_HEIGHT, height: TAB_BAR_HEIGHT },
  add: {
    width: TAB_BAR_HEIGHT,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  appName: {
    position: "absolute",
    left: 20,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
  },
  menuDivider: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: TAB_BAR_HEIGHT,
    height: StyleSheet.hairlineWidth,
  },
  divider: {
    position: "absolute",
    bottom: (TAB_BAR_HEIGHT - 28) / 2,
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  menuButton: {
    position: "absolute",
    right: BAR_PADDING,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addPress: { flex: 1, alignItems: "center", justifyContent: "center" },
  bar: {
    flex: 1,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 34,
  },
  bubble: {
    position: "absolute",
    top: 5,
    left: BAR_PADDING,
    height: BUBBLE_HEIGHT,
    borderRadius: BUBBLE_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: { height: TAB_BAR_HEIGHT, flexDirection: "row", alignItems: "center", paddingLeft: BAR_PADDING },
  button: {
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
