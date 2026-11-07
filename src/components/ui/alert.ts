import { Haptic } from "@/lib/haptics";

import { dialogStore } from "./dialog-store";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

/** An alert in the app's own frosted style (`DialogHost`), the same on both platforms. */
export function showAlert(
  title: string,
  message?: string,
  buttons: AlertButton[] = [{ text: "OK", style: "cancel" }],
) {
  dialogStore.open({ kind: "alert", title, message, buttons });
}

/** Destructive confirmation: Cancel / Delete. */
export function confirmDelete({
  title,
  message,
  onConfirm,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  Haptic.warning();
  showAlert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/** A menu of actions in the app's own frosted style (`DialogHost`): a card of rows and a Cancel card. */
export function showActionSheet(title: string, actions: SheetAction[]) {
  dialogStore.open({ kind: "sheet", title, actions });
}
