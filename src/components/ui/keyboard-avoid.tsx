import { KeyboardAvoidingView, type KeyboardAvoidingViewProps } from "react-native";

/**
 * Lifts its content above the keyboard. Android draws edge to edge, so its window no longer resizes for
 * the keyboard and it needs the same padding as iOS.
 */
export function KeyboardAvoid({ style, ...props }: KeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[{ flex: 1 }, style]}
      {...props}
    />
  );
}
