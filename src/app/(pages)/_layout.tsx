import {
  useGlobalSearchParams,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from "expo-router/ui";
import {
  Bell,
  ChevronsUpDown,
  FileClock,
  House,
  Layers,
  Lightbulb,
  MapPin,
  Plus,
  Settings,
  Sparkles,
  Sticker,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, type ViewProps } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Blur, Box, Icon, Pressable, Spinner, Text } from "@/components/ui";
import { Duration, Springs, Stagger, Timings } from "@/constants/motion";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  TAB_BAR_GAP,
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  TAB_BAR_SIDE_MARGIN,
} from "@/hooks/use-tab-bar-inset";
import {
  runSheetAction,
  HANDOFF_MS,
  runSheetClose,
  useSheetHandoff,
  useCurrentSheetAction,
  useSheetOpen,
} from "@/hooks/use-sheet-open";
import { useTheme } from "@/hooks/use-theme";
import { startNewSticker } from "@/lib/add-sticker";
import { Haptic } from "@/lib/haptics";
import { BlurView } from "expo-blur";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const BAR_PADDING = 5;
const BUBBLE_HEIGHT = 58;

/** Lets the focused tab move the sliding bubble, which lives in the bar, and tells it how wide a tab is. */
const TabBarContext = createContext<{
  select: (index: number) => void;
  buttonWidth: number;
}>({
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
    <Pressable
      {...props}
      onPress={(event) => {
        if (!isFocused) Haptic.selection();
        props.onPress?.(event);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={[styles.button, { width: buttonWidth }]}
      accessibilityLabel={label}
    >
      <Icon
        icon={icon}
        size={24}
        color={isFocused ? "systemBlue" : "systemGray"}
        strokeWidth={isFocused ? 2.5 : 2}
      />
      {/* Only the active tab names itself; one line that shrinks to fit its slot. */}
      {isFocused && (
        <Text
          variant="caption2"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          color="systemBlue"
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type AddAction = { label: string; icon: LucideIcon; onPress: () => void };

/** Height of the expanded panel the pill morphs into. */
const MENU_HEIGHT = 272;
/** Space above the open card, so the spring's overshoot isn't clipped. */
const OVERSHOOT_ROOM = 16;
/** The panel's full size: the bar, the open menu, and room for the overshoot. */
const PANEL_HEIGHT = TAB_BAR_HEIGHT + MENU_HEIGHT + OVERSHOOT_ROOM;

/** How long a label takes to leave: each letter lifts away, last to first. */
const exitLength = (text: string) =>
  (Array.from(text).length - 1) * LETTER_EXIT_STAGGER + LETTER_EXIT_MS;

/**
 * Keeps the label's wrapper alive, unchanged, while its letters lift away (their own exit animations only run
 * while the wrapper is still there).
 */
const holdWhileLeaving = (ms: number) => () => {
  "worklet";
  return {
    initialValues: { opacity: 1 },
    animations: { opacity: withTiming(0.99, { duration: ms }) },
  };
};

/** The button's label: letters rise in one at a time, and lift away last to first. */
function PillLabel({
  text,
  primary = false,
}: {
  text: string;
  primary?: boolean;
}) {
  return (
    <Box row>
      {Array.from(text).map((char, index, chars) => (
        <Animated.View
          key={index}
          exiting={FadeOutUp.delay(
            (chars.length - 1 - index) * LETTER_EXIT_STAGGER,
          ).duration(LETTER_EXIT_MS)}
          entering={FadeInDown.delay(HANDOFF_MS + index * LETTER_STAGGER)
            .duration(primary ? SUBMIT_LETTER_MS : CLOSE_LETTER_MS)
            .easing(Easing.out(Easing.cubic))}
        >
          <Text
            variant="headline"
            weight="semibold"
            color={primary ? "onTint" : "label"}
          >
            {char === " " ? "\u00A0" : char}
          </Text>
        </Animated.View>
      ))}
    </Box>
  );
}

/** How much narrower the button gets mid-change, and how long the width takes to narrow and to grow back. */
/** How long the menu takes to sink away after one of its items was chosen. */
/** After a page was opened from the bar's menus, how long further taps are ignored. */
const OPEN_LOCK_MS = 800;
let lastOpened = 0;
/** The pages the bar's menus open, as full pages (not sheets). */
const MENU_PAGES = ["drafts", "suggestions", "reminders", "map", "settings"];
const PICK_CLOSE_MS = 310;
const SQUEEZE = 0.1;
const SQUEEZE_IN_MS = 120;
const SQUEEZE_OUT_MS = 204;
/** A long, even ease in and out, so the squeeze starts and ends without a visible edge. */
const SQUEEZE_EASING = Easing.bezier(0.45, 0, 0.15, 1);

/** How long the bar waits after a sheet closes before it turns back, in case another sheet opens. */
const SHEET_HANDOFF = 220;

/** Delay between letters, and how long each takes to settle (Save/Add, and Close). */
const LETTER_STAGGER = 40;
const SUBMIT_LETTER_MS = 160;
const CLOSE_LETTER_MS = 310;
/** Leaving is quicker: each letter lifts away this long, starting from the last letter. */
const LETTER_EXIT_STAGGER = 20;
const LETTER_EXIT_MS = 140;

/**
 * Detached pill floating over the content, next to a round add button. The
 * glass is a backdrop blur of whatever scrolls underneath. Tapping the button
 * springs the pill open into a panel of actions; the tab triggers stay mounted
 * and only fade out, so routing keeps working.
 */
function TabBar({ children, style, ...props }: ViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The theme's own page tone: near-white in light mode, near-black in dark mode, so the content fades into it.
  const shade = theme.systemGray6;
  const dark = useColorScheme() === "dark";
  const router = useRouter();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  // The bar spans the screen minus its side margins: round button on the right, tabs filling the pill.
  const pillWidth =
    windowWidth - TAB_BAR_SIDE_MARGIN * 2 - TAB_BAR_GAP - TAB_BAR_HEIGHT;
  // Four slots: the three tabs, then the menu button, which is not a tab.
  const buttonWidth = (pillWidth - BAR_PADDING * 2) / 4;
  const active = useSharedValue(0);
  const progress = useSharedValue(0);
  // The menu's items, faded on their own so they are gone before the panel starts to close.
  const content = useSharedValue(0);

  const [open, setOpen] = useState(false);
  const sheetOpen = useSheetOpen();
  // An open sheet takes over the bar: a sheet with a main action (Save, Add) gets Cancel and a blue Save; any
  // other sheet gets a single Close.
  const sheetAction = useCurrentSheetAction();
  const takeover = useSharedValue(0);
  // 1 when the open sheet has a main action (Save/Add), so the bar splits into Cancel and Save; 0 for Close.
  const primary = useSharedValue(0);
  const squeeze = useSharedValue(0);
  // Tapping Save closes the bar's button the way Close does when a sheet closes: the letters leave and, after the
  // same short wait, the pill turns back. (If the save fails and the sheet stays, it comes back out.)
  const isSaving = !!sheetAction?.loading;
  // Whether there is a main action at all. The action object is a new one whenever its label, loading or
  // disabled state changes, so the squeeze below depends on this, not on the object (or tapping Save, which
  // only flips `loading`, would squeeze the button).
  const hasAction = !!sheetAction;
  useEffect(() => {
    // Going from one sheet to the next (the menu's Edit Pack) closes one just before the other opens. The bar
    // waits a moment before turning back, so it carries on from where it was instead of flashing to the tabs.
    takeover.set(
      sheetOpen && !isSaving
        ? withTiming(1, Timings.bar)
        : withDelay(SHEET_HANDOFF, withTiming(0, Timings.bar)),
    );
  }, [sheetOpen, isSaving, takeover]);
  const squeezeOut = {
    duration: SQUEEZE_OUT_MS,
    easing: SQUEEZE_EASING,
  };
  // A tapped menu option squeezes the button right away and holds it there (letting go after a while if no
  // sheet follows), while the menu waits for the squeeze before opening the next sheet.
  useSheetHandoff(() => {
    squeeze.set(
      withSequence(
        withTiming(1, {
          duration: SQUEEZE_IN_MS,
          easing: SQUEEZE_EASING,
        }),
        withDelay(HANDOFF_MS * 4, withTiming(0, squeezeOut)),
      ),
    );
  });
  useEffect(() => {
    // Only Close turning into Save/Add squeezes. Closing a sheet (the button going back to nothing), or a
    // sheet opening from the plain tab bar, just changes the colour.
    if (!hasAction || takeover.get() <= 0.5) {
      primary.set(withTiming(hasAction ? 1 : 0, Timings.bar));
      return;
    }
    // The button is already narrow (a handoff) or about to be: the colour and text change at the narrowest
    // point, then it grows back out.
    const squeezed = squeeze.get() > 0.5;
    primary.set(
      withDelay(
        squeezed ? 0 : HANDOFF_MS,
        withTiming(hasAction ? 1 : 0, Timings.bar),
      ),
    );
    squeeze.set(
      squeezed
        ? withTiming(0, squeezeOut)
        : withSequence(
            withTiming(1, {
              duration: SQUEEZE_IN_MS,
              easing: SQUEEZE_EASING,
            }),
            withTiming(0, squeezeOut),
          ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAction]);
  // The real pill turns into the sheet's one button (Close, or Save/Add in blue). The round button shrinks
  // away to make room. When the button changes from one to the other (menu, then Edit Pack) it squeezes
  // narrower while its text and colour change, then grows back out.
  const total = pillWidth + TAB_BAR_HEIGHT + TAB_BAR_GAP;
  const pillSize = useAnimatedStyle(() => ({
    width:
      (pillWidth + (total - pillWidth) * takeover.get()) *
      (1 - SQUEEZE * squeeze.get()),
  }));
  const addSize = useAnimatedStyle(() => ({
    width: TAB_BAR_HEIGHT * (1 - takeover.get()),
    marginLeft: -TAB_BAR_GAP * takeover.get(),
    // Clips the button as it narrows (left alone at rest, so its shadow isn't cut off).
    overflow: takeover.get() > 0 ? "hidden" : "visible",
  }));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(takeover.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      takeover.get(),
      [0, 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));
  // The blue brightens when the sheet becomes ready to save.
  const ready = useSharedValue(0);
  useEffect(() => {
    ready.set(
      withTiming(
        sheetAction && !sheetAction.disabled ? 1 : 0,
        Timings.standard,
      ),
    );
  }, [sheetAction, ready]);
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      takeover.get(),
      [0.35, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const tintStyle = useAnimatedStyle(() => ({
    opacity: primary.get() * (0.7 + 0.25 * ready.get()),
  }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: primary.get() }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: sheetAction ? 0.7 + 0.3 * ready.get() : 1,
  }));

  // The label stays as it is while saving; only the button's width shows that it is working.
  const labelText = sheetAction ? sheetAction.label : "Close";

  // A sticker added from inside a pack goes into that pack.
  const inPack = segments[segments.length - 1] === "[id]";
  // The sticker editor is a full page with its own controls at the bottom.
  const hidden = ["edit-image", "sticker", "pack-page"].includes(
    segments[segments.length - 1],
  );
  // The picker and the photo's details take a moment: the plus button shows a spinner until they are done.
  const [adding, setAdding] = useState(false);
  const runAdd = async (run: () => unknown) => {
    if (adding) return;
    setAdding(true);
    try {
      await run();
    } finally {
      setAdding(false);
    }
  };
  // Opens a page from the bar's menus, unless it is already the page on top or one was opened a moment ago
  // (a double tap, or a second tap before the first page has appeared), so screens never stack up.
  const openPage = (href: string) => {
    const now = Date.now();
    if (now - lastOpened < OPEN_LOCK_MS) return;
    const target = href.split("/").pop() ?? "";
    if (segments[segments.length - 1] === target) return;
    lastOpened = now;
    // From one of these pages to another, the new page takes the old one's place in the stack instead of
    // piling on top of it. (A sheet is left out: it needs the page it floats over.)
    const here = segments[segments.length - 1];
    if (MENU_PAGES.includes(here) && MENU_PAGES.includes(target))
      router.replace(href as Href);
    else router.push(href as Href);
  };
  const actions: AddAction[] = [
    {
      label: "Sticker",
      icon: Sticker,
      onPress: () =>
        runAdd(() =>
          startNewSticker(router, inPack && id ? Number(id) : undefined),
        ),
    },
    {
      label: "Pack",
      icon: Layers,
      onPress: () => openPage("/(pages)/(packs)/new-pack"),
    },
    {
      label: "Drafts",
      icon: FileClock,
      onPress: () => openPage("/(pages)/(packs)/drafts"),
    },
    {
      label: "Ideas",
      icon: Lightbulb,
      onPress: () => openPage("/(pages)/(packs)/suggestions"),
    },
    {
      label: "Reminders",
      icon: Bell,
      onPress: () => openPage("/(pages)/(packs)/reminders"),
    },
    {
      label: "Map",
      icon: MapPin,
      onPress: () => openPage("/(pages)/(packs)/map"),
    },
    {
      label: "Settings",
      icon: Settings,
      onPress: () => openPage("/(pages)/(packs)/settings"),
    },
  ];

  // The round button creates whatever belongs to the page: a pack on the home page, a sticker inside a pack,
  // and a sticker anywhere else.
  const onPacksPage = segments[segments.length - 1] === "(packs)";
  const create = onPacksPage
    ? { label: "New Pack", run: () => openPage("/(pages)/(packs)/new-pack") }
    : {
        label: "New Sticker",
        run: () =>
          startNewSticker(router, inPack && id ? Number(id) : undefined),
      };

  const addPressed = () => {
    if (adding) return;
    Haptic.tap();
    if (open) toggle(false, false);
    return runAdd(create.run);
  };

  const select = (index: number) => {
    active.value = withSpring(index, Springs.snappy);
  };

  // `bounce: false` closes the menu with a plain ease instead of its spring: for when an item was chosen and a
  // sheet takes over the bar, so the panel doesn't wobble under the sheet's button. Closing the menu itself (its
  // button, or a tap outside) keeps the springy animation.
  const toggle = (next: boolean, bounce = true) => {
    setOpen(next);
    if (next) {
      // Soft spring for the panel; the items ease in while it is still settling.
      progress.value = withSpring(1, Springs.gentle);
      content.value = withDelay(Stagger, withTiming(1, Timings.fadeIn));
    } else if (bounce) {
      // The items fade out first, so they are gone before the panel closes.
      content.value = withTiming(0, Timings.fadeOut);
      progress.value = withDelay(Duration.fast, withSpring(0, Springs.snappy));
    } else {
      content.value = withTiming(0, Timings.fadeOut);
      progress.value = withTiming(0, {
        duration: PICK_CLOSE_MS,
        easing: Easing.inOut(Easing.cubic),
      });
    }
  };

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: active.value * buttonWidth }],
  }));

  // The frosted card is always full height and slides up from behind the bar's bottom edge, so opening
  // moves a layer (a transform) instead of re-laying out the panel every frame. Unclamped on purpose:
  // the overshoot of the spring is the bounce.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * MENU_HEIGHT }],
  }));

  // One opacity for both reasons (the menu opening, a sheet taking over): two animated styles on the same view
  // would overwrite each other's opacity, and the tabs would stay showing under the sheet's button.
  const tabsStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.value, [0, 0.25], [1, 0], Extrapolation.CLAMP) *
      interpolate(takeover.get(), [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity:
      content.value *
      (1 - interpolate(takeover.get(), [0, 0.45], [0, 1], Extrapolation.CLAMP)),
    transform: [
      { translateY: interpolate(content.value, [0, 1], [12, 0]) },
      { scale: interpolate(content.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    opacity:
      content.value *
      (1 - interpolate(takeover.get(), [0, 0.45], [0, 1], Extrapolation.CLAMP)),
  }));

  // Turns upside down while the menu is open.
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

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
      {/* The strip of screen under the bar (never behind it) fades to a soft shade: blackish in light mode,
          whitish in dark mode. */}
      <Box
        pointerEvents="none"
        style={[
          styles.underBar,
          { height: insets.bottom + TAB_BAR_MARGIN + UNDER_BAR_EXTRA },
          hidden && { display: "none" },
        ]}
      >
        {/* Progressive blur: layers of different heights stack up, so the blur deepens toward the screen edge. */}
        {UNDER_BAR_BLUR.map((fraction) => (
          <BlurView
            key={fraction}
            intensity={UNDER_BAR_BLUR_INTENSITY}
            tint={dark ? "dark" : "light"}
            blurMethod="dimezisBlurView"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${fraction * 100}%`,
            }}
          />
        ))}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="under-bar" x1="0" y1="0" x2="0" y2="1">
              {UNDER_BAR_STOPS.map(([offset, opacity]) => (
                <Stop
                  key={offset}
                  offset={offset}
                  stopColor={shade}
                  stopOpacity={opacity}
                />
              ))}
            </LinearGradient>
            <RadialGradient
              id="under-bar-glow"
              cx="50%"
              cy="100%"
              rx="50%"
              ry="100%"
            >
              <Stop offset="0" stopColor={shade} stopOpacity={1} />
              <Stop offset="1" stopColor={shade} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#under-bar)" />
          {/* Soft pools of shade of different widths, so the edge is mottled rather than one even band. */}
          {UNDER_BAR_POOLS.map(([x, width, opacity]) => (
            <Rect
              key={x}
              x={`${x - width / 2}%`}
              width={`${width}%`}
              height="100%"
              fill="url(#under-bar-glow)"
              opacity={opacity}
            />
          ))}
        </Svg>
      </Box>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          { bottom: insets.bottom - 12 + TAB_BAR_MARGIN },
          hidden && { display: "none" },
        ]}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[styles.shadow, { height: PANEL_HEIGHT }, pillSize]}
        >
          {/* Clips the card at the bar's bottom edge; only what has slid up above it shows. */}
          <Box pointerEvents="box-none" style={styles.clip}>
            <Animated.View
              pointerEvents="none"
              style={[styles.card, cardStyle]}
            >
              <Blur style={styles.bar} />
            </Animated.View>
            {/* The card's own bottom edge is clipped away, so the bar's rounded bottom border is drawn here. */}
            <Box
              pointerEvents="none"
              style={[styles.bottomEdge, { borderColor: theme.separator }]}
            />
            <Animated.View
              pointerEvents={open || sheetOpen ? "none" : "auto"}
              style={[styles.tabs, tabsStyle]}
            >
              {/* Frosted bubble that slides to the selected tab. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  { width: buttonWidth },
                  {
                    backgroundColor: theme.systemFill,
                    borderColor: theme.separator,
                  },
                  bubbleStyle,
                ]}
              />
              {/* expo-router's tab list spreads its items with `space-between`; the tabs must pack to the left, in the
                  first three slots, leaving the fourth to the menu button. */}
              <Box
                {...props}
                style={[
                  style,
                  styles.list,
                  {
                    width: buttonWidth * 3 + BAR_PADDING,
                    justifyContent: "flex-start",
                  },
                ]}
              >
                {children}
              </Box>
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
                    toggle(false, false);
                    action.onPress();
                  }}
                >
                  <Box
                    style={[
                      styles.tileIcon,
                      { backgroundColor: theme.systemFill },
                    ]}
                  >
                    <Icon icon={action.icon} size={24} />
                  </Box>
                  <Text variant="caption2" color="secondaryLabel">
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
            {/* Hairline between the open menu's items and the bar holding the menu button. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.menuDivider,
                { backgroundColor: theme.separator },
                dividerStyle,
              ]}
            />
            {/* Shown in the bar's bottom row while the menu is open, where the tabs have faded out. */}
            <Animated.View
              pointerEvents="none"
              style={[styles.appName, dividerStyle]}
            >
              <Text
                variant="title3"
                style={{ fontFamily: "Calvino", fontWeight: "normal" }}
              >
                Stickerê
              </Text>
            </Animated.View>
            {/* Hairline between the tabs and the menu button. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.divider,
                {
                  right: BAR_PADDING + buttonWidth,
                  backgroundColor: theme.separator,
                },
                fadeStyle,
              ]}
            />
            {/* Fourth slot of the bar. It is not a tab: it opens and closes the menu, and stays put while
                the tabs fade out. */}
            <Pressable
              accessibilityLabel={open ? "Close menu" : "Open menu"}
              style={[styles.menuButton, { width: buttonWidth }]}
              onPress={() => {
                Haptic.tap();
                toggle(!open);
              }}
            >
              <Animated.View style={[chevronStyle, fadeStyle]}>
                <Icon
                  icon={ChevronsUpDown}
                  size={24}
                  color={open ? "systemBlue" : "systemGray"}
                />
              </Animated.View>
            </Pressable>
            {/* The open sheet's button, lying on the pill: it is the pill itself that widens and turns into it. */}
            <Animated.View
              pointerEvents={sheetOpen ? "auto" : "none"}
              style={[styles.buttonLayer, buttonStyle]}
            >
              {/* The blue: it comes up under the label as the button squeezes. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.systemBlue },
                  tintStyle,
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(0, 0, 0, 0.25)" },
                  shadeStyle,
                ]}
              />
              {/* The pill's own hairline edge, drawn over the colour so the button has the same outline. */}
              <Box
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.buttonEdge,
                  { borderColor: theme.separator },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sheetAction ? sheetAction.label : "Close"}
                accessibilityState={{
                  disabled: sheetAction?.disabled || sheetAction?.loading,
                  busy: sheetAction?.loading,
                }}
                disabled={sheetAction?.disabled || sheetAction?.loading}
                feedback="scale"
                style={styles.addPress}
                onPress={() => {
                  Haptic.tap();
                  if (sheetAction) runSheetAction();
                  else runSheetClose();
                }}
              >
                {/* Mounted only while a sheet is open (and not saving), so its letters rise in each time one opens and lift away, last to first, when it closes or Save is tapped, just as Close does. */}
                {sheetOpen && !isSaving && (
                  <Animated.View
                    key={labelText}
                    exiting={holdWhileLeaving(exitLength(labelText))}
                    style={[styles.labelSlot, labelStyle]}
                  >
                    <PillLabel text={labelText} primary={!!sheetAction} />
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          </Box>
        </Animated.View>
        {/* Separate action button, detached from the pill. */}
        <Animated.View style={[styles.shadow, styles.addShadow, addSize]}>
          <Blur style={[styles.add, { width: "100%" }]}>
            <Animated.View
              pointerEvents={sheetOpen ? "none" : "auto"}
              style={[StyleSheet.absoluteFill, plusStyle]}
            >
              <Pressable
                accessibilityLabel={create.label}
                style={styles.addPress}
                accessibilityState={{ busy: adding }}
                onPress={addPressed}
              >
                {adding ? (
                  <Spinner />
                ) : (
                  <Icon icon={Plus} size={28} strokeWidth={2.5} />
                )}
              </Pressable>
            </Animated.View>
          </Blur>
        </Animated.View>
      </Animated.View>
    </TabBarContext.Provider>
  );
}

export default function PagesLayout() {
  const theme = useTheme();

  return (
    <Tabs>
      <Box style={{ flex: 1, backgroundColor: theme.systemGroupedBackground }}>
        <TabSlot />
      </Box>
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

/** How far the shade rises above the safe area, so it is a soft haze rather than a thin strip. */
const UNDER_BAR_EXTRA = 56;
/** Heights (share of the shade) of the stacked blur layers, and the strength of each one. */
const UNDER_BAR_BLUR = [1, 0.78, 0.56, 0.36, 0.18] as const;
const UNDER_BAR_BLUR_INTENSITY = 4;
/** Eased fade (offset, opacity): clear at the top, gathering slowly toward the screen edge. */
const UNDER_BAR_STOPS = [
  [0, 0],
  [0.3, 0.05],
  [0.55, 0.2],
  [0.8, 0.5],
  [1, 0.8],
] as const;
/** Pools of shade along the edge: centre (%), width (%), opacity. */
const UNDER_BAR_POOLS = [
  [12, 46, 0.3],
  [38, 38, 0.2],
  [64, 52, 0.32],
  [90, 40, 0.24],
] as const;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: TAB_BAR_GAP,
  },
  shadow: { borderRadius: 34 },
  labelSlot: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonEdge: {
    borderRadius: 34,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    borderRadius: 34,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  underBar: { position: "absolute", left: 0, right: 0, bottom: 0 },
  underShadow: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: -26,
    height: 64,
  },
  clip: {
    flex: 1,
    overflow: "hidden",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  card: {
    position: "absolute",
    top: OVERSHOOT_ROOM,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT + MENU_HEIGHT,
  },
  bottomEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
  },
  menu: {
    position: "absolute",
    top: OVERSHOOT_ROOM,
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
  bar: { flex: 1, borderRadius: 34 },
  bubble: {
    position: "absolute",
    top: 5,
    left: BAR_PADDING,
    height: BUBBLE_HEIGHT,
    borderRadius: BUBBLE_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: BAR_PADDING,
  },
  // Each tab's touch area is its whole slot, the full height of the bar.
  button: {
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
