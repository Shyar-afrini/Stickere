import type { AlertButton, SheetAction } from "./alert";

export type DialogRequest =
  | { kind: "alert"; title: string; message?: string; buttons: AlertButton[] }
  | { kind: "sheet"; title: string; actions: SheetAction[] };

type State = { request: DialogRequest | null; closing: boolean };

type Listener = () => void;

let state: State = { request: null, closing: false };
let afterClose: (() => void) | undefined;
const listeners = new Set<Listener>();

const set = (next: State) => {
  state = next;
  listeners.forEach((listener) => listener());
};

/**
 * The alert or action sheet on screen. `DialogHost` draws it; `showAlert` and `showActionSheet`
 * fill it, so every dialog on both platforms is the app's own frosted card.
 */
export const dialogStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  open(request: DialogRequest) {
    afterClose = undefined;
    set({ request, closing: false });
  },
  /** Starts the exit animation; `after` runs once the dialog is gone (so it can navigate or open another). */
  dismiss(after?: () => void) {
    if (!state.request || state.closing) return;
    afterClose = after;
    set({ ...state, closing: true });
  },
  /** The exit animation finished. */
  finish() {
    const after = afterClose;
    afterClose = undefined;
    set({ request: null, closing: false });
    after?.();
  },
};
