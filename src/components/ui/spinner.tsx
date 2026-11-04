import { ActivityIndicator } from "react-native";

/** iOS-style activity indicator. */
export function Spinner({ size = "small" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} />;
}
