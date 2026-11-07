import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Animated, PanResponder, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Haptic } from "@/lib/haptics";
import type { ReorderController } from "@/lib/reorder-controller";

type Handlers = { onLongPress: () => void; onPressOut: () => void };

const JIGGLE_DEGREES = 1.4;

/**
 * Wraps a card so it can be reordered. A long press on the card's own `Pressable`
 * (spread the handlers this passes) enters edit mode: every card jiggles like
 * iOS home screen icons, and any card can then be dragged straight away.
 */
export function ReorderCell({
  controller,
  id,
  active,
  onEnterEditing,
  children,
}: {
  controller: ReorderController;
  id: string;
  active: boolean;
  onEnterEditing: () => void;
  children: (handlers: Handlers) => ReactNode;
}) {
  const viewRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    controller.register(id, viewRef.current);
    return () => controller.register(id, null);
  }, [controller, id]);

  // In edit mode a touch on any card starts a drag at once. Before that, the
  // card's own press handler owns the touch until its long press fires, and this
  // takes over the same touch for the drag.
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => controller.isEditing(),
      onMoveShouldSetPanResponderCapture: () => controller.isArmed(id),
      onPanResponderGrant: () => {
        if (!controller.isArmed(id)) controller.arm(id);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) =>
        controller.move(gesture.dx, gesture.dy),
      onPanResponderRelease: () => controller.end(),
      onPanResponderTerminate: () => controller.end(),
    }),
  );

  // With Reduce Motion on, cards in edit mode stay still instead of jiggling.
  const reduceMotion = useReducedMotion();
  const jiggle = reduceMotion ? 0 : JIGGLE_DEGREES;
  const rotate = controller.tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: [`${-jiggle}deg`, `${jiggle}deg`],
  });

  return (
    <Animated.View
      ref={viewRef}
      collapsable={false}
      {...responder.panHandlers}
      style={{
        zIndex: active ? 10 : 0,
        transform: [
          ...controller.shift(id).getTranslateTransform(),
          active ? { scale: 1.05 } : { rotate },
        ],
      }}
    >
      {children({
        onLongPress: () => {
          Haptic.dragStart();
          onEnterEditing();
          controller.arm(id);
        },
        onPressOut: () => controller.end(),
      })}
    </Animated.View>
  );
}
