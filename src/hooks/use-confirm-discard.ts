import { usePreventRemove } from "expo-router";
import { useState } from "react";

/**
 * The iOS rule for sheets and forms: leaving with unsaved changes (back, or swiping the sheet down) first
 * asks to discard them. The question is drawn inside the screen (`<DiscardConfirm {...confirm} />`), inline
 * in the sheet it asks about. `allowLeave` is for right before navigating away after
 * a save, so saving never asks.
 */
export function useConfirmDiscard(dirty: boolean) {
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const allowLeave = usePreventRemove(dirty, ({ repeat }) =>
    setLeave(() => repeat),
  );

  return {
    allowLeave,
    confirm: {
      visible: leave !== null,
      onDiscard: () => leave?.(),
      onKeep: () => setLeave(null),
    },
  };
}
