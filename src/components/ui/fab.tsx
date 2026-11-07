import { Plus, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  ReduceMotion,
} from "react-native-reanimated";

import { Duration, ListStagger } from "@/constants/motion";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";

import { Blur } from "./blur";
import { Icon } from "./icon";
import { Pressable } from "./pressable";
import { Text } from "./text";

export type FabAction = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
};

/**
 * Floating "+" button. With one action it runs it directly; with several it
 * opens a stack of labelled actions above a dimmed backdrop.
 */
export function Fab({ actions }: { actions: FabAction[] }) {
  const theme = useTheme();
  const tabInset = useTabBarInset();
  const [open, setOpen] = useState(false);

  const single = actions.length === 1;

  return (
    <>
      {open && (
        <Animated.View
          entering={FadeIn.duration(Duration.standard).reduceMotion(
            ReduceMotion.System,
          )}
          exiting={FadeOut.duration(Duration.fast).reduceMotion(
            ReduceMotion.System,
          )}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0, 0, 0, 0.3)" },
          ]}
        >
          <Pressable
            feedback="none"
            accessibilityLabel="Close menu"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
        </Animated.View>
      )}

      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 20,
          bottom: tabInset + 16,
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        {open &&
          actions.map((action, index) => (
            <Animated.View
              key={action.label}
              entering={FadeInDown.duration(Duration.standard)
                .delay(index * ListStagger)
                .reduceMotion(ReduceMotion.System)}
              exiting={FadeOutDown.duration(Duration.fast).reduceMotion(
                ReduceMotion.System,
              )}
            >
              <Blur style={{ borderRadius: 22 }}>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    action.onPress();
                  }}
                  accessibilityRole="button"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <Icon icon={action.icon} size={18} color="systemBlue" />
                  <Text>{action.label}</Text>
                </Pressable>
              </Blur>
            </Animated.View>
          ))}

        <Pressable
          feedback="scale"
          accessibilityRole="button"
          accessibilityLabel={single ? actions[0].label : "Create"}
          onPress={() => (single ? actions[0].onPress() : setOpen(!open))}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.systemBlue,
          }}
        >
          <Animated.View
            style={{
              transitionProperty: "transform",
              transitionDuration: 200,
              transform: [{ rotate: open ? "45deg" : "0deg" }],
            }}
          >
            <Icon icon={Plus} size={24} color="onTint" strokeWidth={2.5} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </>
  );
}
