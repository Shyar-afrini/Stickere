import { useEffect, useState } from "react";
import { LayoutAnimation } from "react-native";

import { ReorderController } from "@/lib/reorder-controller";

/**
 * Order of `items` that the user can change by dragging cards. `items` stays the
 * source of truth: the dragged order is shown only until `items` itself updates
 * (after `onCommit` saved it), so nothing is reordered unless the user does it.
 */
export function useReorder<T>(
  items: T[],
  keyOf: (item: T) => string,
  onCommit: (items: T[]) => void,
) {
  const [controller] = useState(() => new ReorderController());
  const [draft, setDraft] = useState<{ base: T[]; order: T[] } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Like the iOS home screen: a long press makes every card jiggle until "Done".
  const [editing, setEditing] = useState(false);
  const order = draft && draft.base === items ? draft.order : items;

  useEffect(() => {
    const byKey = new Map(order.map((item) => [keyOf(item), item]));
    const toItems = (keys: string[]) => keys.map((key) => byKey.get(key)!);

    controller.configure(order.map(keyOf), {
      onReorder: (keys) => {
        LayoutAnimation.configureNext(LayoutAnimation.create(160, "easeInEaseOut", "opacity"));
        setDraft({ base: items, order: toItems(keys) });
      },
      onActive: (key) => setActiveKey(key),
      onCommit: (keys) => onCommit(toItems(keys)),
    }, editing);
  });

  useEffect(() => {
    controller.setJiggling(editing);
  }, [controller, editing]);

  return {
    controller,
    order,
    activeKey,
    dragging: activeKey !== null,
    editing,
    startEditing: () => setEditing(true),
    stopEditing: () => setEditing(false),
  };
}
