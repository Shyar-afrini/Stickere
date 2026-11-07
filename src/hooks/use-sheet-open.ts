import { useEffect, useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

const change = (by: number) => {
  count += by;
  listeners.forEach((listener) => listener());
};

let closeSheet: (() => void) | undefined;

/**
 * Called by every drawer sheet while it is on screen, so the tab bar can step aside. `close` is what the
 * bar's Close button runs for a sheet that has no main button of its own.
 */
export function useRegisterSheet(visible: boolean, close?: () => void) {
  useEffect(() => {
    closeSheet = close;
  });
  // Counted only while it is shown, so the bar starts turning back as soon as the sheet starts to close.
  useEffect(() => {
    if (!visible) return;
    change(1);
    return () => {
      closeSheet = undefined;
      change(-1);
    };
  }, [visible]);
}

/** Closes the open sheet. */
export const runSheetClose = () => closeSheet?.();

/** True while any drawer sheet is open: the tab bar drops its under-shade. */
export function useSheetOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count > 0,
  );
}

/** The one button a sheet hands to the tab bar, which turns into it while the sheet is open. */
export type SheetAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

let action: SheetAction | null = null;
const actionListeners = new Set<() => void>();

const setAction = (next: SheetAction | null) => {
  const same =
    action !== null &&
    next !== null &&
    action.label === next.label &&
    action.disabled === next.disabled &&
    action.loading === next.loading;
  if (same) {
    // Only the handler changed: keep the latest one without re-rendering the bar.
    action = next;
    return;
  }
  action = next;
  actionListeners.forEach((listener) => listener());
};

/** A sheet's primary button (Save, Add, Create) lives in the tab bar while the sheet is open. */
export function useSheetAction(next: SheetAction | null) {
  useEffect(() => {
    setAction(next);
  });
  useEffect(() => () => setAction(null), []);
}

/** The open sheet's primary button, or null when the tab bar should look as usual. */
export function useCurrentSheetAction() {
  return useSyncExternalStore(
    (listener) => {
      actionListeners.add(listener);
      return () => actionListeners.delete(listener);
    },
    () => action,
  );
}

/** Runs the latest handler (it may have changed since the bar last rendered). */
export const runSheetAction = () => action?.onPress();

/** How long the bar's button squeezes before the next sheet opens. */
export const HANDOFF_MS = 140;

const handoffListeners = new Set<() => void>();

/**
 * A sheet's menu calls this when an option is tapped, then waits `HANDOFF_MS` before opening the next sheet,
 * so the bar's button has shrunk by the time the new sheet (and the button's new text and colour) arrives.
 */
export const beginSheetHandoff = () =>
  handoffListeners.forEach((listener) => listener());

/** The tab bar listens for the start of a handoff. */
export function useSheetHandoff(onBegin: () => void) {
  useEffect(() => {
    handoffListeners.add(onBegin);
    return () => {
      handoffListeners.delete(onBegin);
    };
  }, [onBegin]);
}
