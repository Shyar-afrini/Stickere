import { Haptic } from "@/lib/haptics";

export type ToastAction = { label: string; onPress: () => void };

export type ToastMessage = {
  id: number;
  title: string;
  message?: string;
  action?: ToastAction;
};

type Listener = () => void;

let current: ToastMessage | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

const set = (next: ToastMessage | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

/**
 * The one message on screen, drawn by `ToastHost`: a frosted banner at the top that fades on its own. It
 * replaces dialogs: it never blocks the screen or asks anything, so there is nothing to dismiss first.
 */
export const toastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => current,
  clear: () => set(null),
};

/** Tells the user something (an error, a denied permission) without a dialog. An action adds a button, e.g. "Open Settings". */
export function showToast(
  title: string,
  message?: string,
  action?: ToastAction,
) {
  Haptic.warning();
  set({ id: nextId++, title, message, action });
}
