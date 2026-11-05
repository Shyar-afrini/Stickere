import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, PanResponder, View } from "react-native";

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
  editing,
  onEnterEditing,
  children,
}: {
  controller: ReorderController;
  id: string;
  active: boolean;
  editing: boolean;
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
      onPanResponderMove: (_, gesture) => controller.move(gesture.dx, gesture.dy),
      onPanResponderRelease: () => controller.end(),
      onPanResponderTerminate: () => controller.end(),
    }),
  );

  const rotate = controller.tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: [`${-JIGGLE_DEGREES}deg`, `${JIGGLE_DEGREES}deg`],
  });

  return (
    <Animated.View
      ref={viewRef}
      collapsable={false}
      {...responder.panHandlers}
      style={
        active
          ? {
              zIndex: 10,
              transform: [...controller.translate.getTranslateTransform(), { scale: 1.05 }],
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }
          : { transform: [{ rotate }] }
      }
    >
      {children({
        onLongPress: () => {
          onEnterEditing();
          controller.arm(id);
        },
        onPressOut: () => controller.end(),
      })}
    </Animated.View>
  );
}
