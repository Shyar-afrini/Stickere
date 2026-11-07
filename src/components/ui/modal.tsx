import { Modal as RNModal, type ModalProps } from "react-native";

/** Full-screen modal that fades in and draws under the status bar on every platform. */
export function Modal({ animationType = "fade", ...props }: ModalProps) {
  return (
    <RNModal animationType={animationType} statusBarTranslucent {...props} />
  );
}
