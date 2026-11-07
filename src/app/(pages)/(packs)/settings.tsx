import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { LockModal } from "@/components/lock-screen";
import { BIOMETRIC_LABEL } from "@/lib/platform";
import { ListRow, ListSection, Screen, ScrollView, Toggle } from "@/components/ui";
import { setPackLocked } from "@/db/mutations";
import { usePacks } from "@/hooks/use-packs";
import { Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { relockPack, unlockPack, useLockState } from "@/lib/lock-state";
import { authenticateWithBiometrics, biometricsAvailable, hasPin } from "@/lib/security";
import { getAppLock, getFaceId, setAppLock, setFaceId } from "@/lib/settings";


export default function Settings() {
  const router = useRouter();
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const { packs } = usePacks();
  const { unlockedPacks } = useLockState();

  const [pinSet, setPinSet] = useState(hasPin);
  const [appLock, setAppLockState] = useState(getAppLock);
  const [faceId, setFaceIdState] = useState(getFaceId);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  // Pack waiting for its PIN / Face ID before the lock can be removed.
  const [unlocking, setUnlocking] = useState<{ id: number; name: string } | null>(null);

  // Coming back from the PIN screen may have saved a PIN and switched a lock on.
  useFocusEffect(
    useCallback(() => {
      setPinSet(hasPin());
      setAppLockState(getAppLock());
      void biometricsAvailable().then(setCanUseBiometrics);
    }, []),
  );

  const askForPin = (params: { enable?: "app" | "pack"; packId?: number } = {}) =>
    router.push({ pathname: "/(pages)/(packs)/pin", params });

  const toggleAppLock = (enabled: boolean) => {
    if (enabled && !pinSet) return askForPin({ enable: "app" });
    setAppLock(enabled);
    setAppLockState(enabled);
  };

  const toggleFaceId = async (enabled: boolean) => {
    if (enabled && !(await authenticateWithBiometrics(`Turn on ${BIOMETRIC_LABEL}`))) return;
    setFaceId(enabled);
    setFaceIdState(enabled);
  };

  const togglePack = (pack: { id: number; name: string; isLocked: boolean }, enabled: boolean) => {
    if (enabled) {
      if (!pinSet) return askForPin({ enable: "pack", packId: pack.id });
      relockPack(pack.id);
      return setPackLocked(pack.id, true);
    }
    // Removing a lock needs the PIN or Face ID, unless the pack is already open.
    if (unlockedPacks.has(pack.id)) return setPackLocked(pack.id, false);
    setUnlocking(pack);
  };

  return (
    <Screen>
      <ScrollView gap="xl" py="lg" contentContainerStyle={{ paddingTop: headerInset + Spacing.sm, paddingBottom: tabInset }}>
        <ListSection
          title="App Lock"
          footer="Locks Stickerê each time you open it or come back to it."
        >
          <ListRow
            label="Lock App"
            trailing={<Toggle value={appLock} onValueChange={toggleAppLock} />}
          />
          <ListRow
            label={`Unlock with ${BIOMETRIC_LABEL}`}
            trailing={
              <Toggle
                value={faceId && canUseBiometrics}
                onValueChange={toggleFaceId}
                disabled={!canUseBiometrics}
              />
            }
          />
          <ListRow
            label={pinSet ? "Change PIN" : "Set PIN"}
            tinted
            onPress={() => askForPin()}
          />
        </ListSection>

        <ListSection
          title="Locked Packs"
          footer={
            canUseBiometrics
              ? "A locked pack stays hidden until you unlock it with your PIN or Face ID."
              : "A locked pack stays hidden until you unlock it with your PIN."
          }
        >
          {packs.length === 0 ? (
            <ListRow label="No packs yet" />
          ) : (
            packs.map((pack) => (
              <ListRow
                key={pack.id}
                label={pack.name}
                trailing={
                  <Toggle
                    value={pack.isLocked}
                    onValueChange={(enabled) => togglePack(pack, enabled)}
                  />
                }
              />
            ))
          )}
        </ListSection>
      </ScrollView>

      <LockModal
        visible={unlocking !== null}
        title={unlocking?.name ?? ""}
        onCancel={() => setUnlocking(null)}
        onUnlock={() => {
          if (unlocking) {
            unlockPack(unlocking.id);
            setPackLocked(unlocking.id, false);
          }
          setUnlocking(null);
        }}
      />
    </Screen>
  );
}
