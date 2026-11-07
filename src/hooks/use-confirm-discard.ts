import { usePreventRemove } from "expo-router";

import { showActionSheet } from "@/components/ui";

/**
 * The iOS rule for sheets and forms: leaving with unsaved changes (Cancel, back, or swiping the sheet
 * down) first asks to discard them. Returns `allowLeave`, to call right before navigating away after a
 * save, so saving never asks.
 */
export function useConfirmDiscard(dirty: boolean) {
  return usePreventRemove(dirty, ({ repeat }) => {
    showActionSheet("Discard your changes?", [
      { label: "Discard Changes", destructive: true, onPress: repeat },
    ]);
  });
}
