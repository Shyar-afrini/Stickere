import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { getAppLock } from "@/lib/settings";
import { hasPin } from "@/lib/security";

type Snapshot = { appLocked: boolean; unlockedPacks: ReadonlySet<number> };

// Unlocked state lives only in memory: every cold start and every trip to the
// background locks the app and all packs again.
const appLockEnabled = () => getAppLock() && hasPin();

let snapshot: Snapshot = { appLocked: appLockEnabled(), unlockedPacks: new Set() };
const listeners = new Set<() => void>();

function update(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

AppState.addEventListener("change", (state) => {
  if (state === "background") {
    update({ appLocked: appLockEnabled(), unlockedPacks: new Set() });
  }
});

export const unlockApp = () => update({ ...snapshot, appLocked: false });

export const unlockPack = (id: number) =>
  update({ ...snapshot, unlockedPacks: new Set(snapshot.unlockedPacks).add(id) });

export function relockPack(id: number) {
  const next = new Set(snapshot.unlockedPacks);
  next.delete(id);
  update({ ...snapshot, unlockedPacks: next });
}

export const useLockState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
