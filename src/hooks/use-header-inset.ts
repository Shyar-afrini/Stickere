import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height of the navigation bar below the status bar. */
export const HEADER_BAR = 48;

/**
 * Space a screen must leave at the top. The header floats transparently over the content, so
 * scrolling content passes underneath it and starts this far down.
 */
export function useHeaderInset() {
  return useSafeAreaInsets().top;
}
