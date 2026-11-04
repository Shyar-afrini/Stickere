import { Alert } from "react-native";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

/** Native iOS alert. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  Alert.alert(title, message, buttons);
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
  showAlert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
