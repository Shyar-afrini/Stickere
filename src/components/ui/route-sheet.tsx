import { useRouter } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useWindowDimensions } from "react-native";

import { SHEET_HEIGHT } from "@/constants/sheet";
import { useSheetBottom } from "@/hooks/use-tab-bar-inset";

import { DrawerSheet } from "./drawer-sheet";

/** The handle row at the top of every sheet (no title): padding, grabber, padding. */
const HANDLE_HEIGHT = 23;

/** The longest a sheet waits for its content to be measured before opening anyway. */
const MEASURE_TIMEOUT_MS = 400;

const SheetContext = createContext<{ close: () => void }>({ close: () => {} });

/** Closes the surrounding `RouteSheet` the smooth way: it sinks, then the screen goes back. */
export const useSheetClose = () => useContext(SheetContext).close;

/**
 * The body of a screen that is shown as a sheet: a transparent screen with the app's frosted `DrawerSheet`
 * on it. Tapping outside or dragging the handle down closes it. With unsaved changes (`dirty`) it goes
 * back through the screen's discard check instead, which asks first.
 */
export function RouteSheet({
  dirty = false,
  maxHeight,
  fitHeight,
  measuring = false,
  children,
}: {
  dirty?: boolean;
  /** Height in points for a sheet whose content is short, so it doesn't leave empty space. */
  maxHeight?: number;
  /**
   * Height of everything under the handle, once measured: the sheet is then exactly as tall as its content
   * (up to the usual limit), and follows it as it changes.
   */
  fitHeight?: number;
  /** The content is still being measured: the sheet waits (briefly) to open at its final height. */
  measuring?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const [closing, setClosing] = useState(false);

  const close = () => (dirty ? router.back() : setClosing(true));
  const bottom = useSheetBottom();
  // Never wait for long: a sheet whose content can't be measured opens at its full height instead.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), MEASURE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SheetContext.Provider value={{ close }}>
      <DrawerSheet
        visible={!closing}
        onDismiss={close}
        onClosed={() => router.back()}
        waiting={measuring && !gaveUp}
        height={Math.min(
          windowHeight * SHEET_HEIGHT - bottom,
          maxHeight ?? Infinity,
          fitHeight === undefined ? Infinity : fitHeight + HANDLE_HEIGHT,
        )}
      >
        {children}
      </DrawerSheet>
    </SheetContext.Provider>
  );
}
