import { Lock, ScanFace } from "lucide-react-native";
import { useEffect, useState } from "react";

import { PinPad } from "@/components/pin-pad";
import { Box, Button, Icon, Modal, Pressable, Screen } from "@/components/ui";
import {
  authenticateWithBiometrics,
  biometricsAvailable,
  verifyPin,
} from "@/lib/security";
import { getFaceId } from "@/lib/settings";

type Props = {
  title: string;
  onUnlock: () => void;
  onCancel?: () => void;
};

/** Asks for the PIN, or Face ID when it is turned on. */
export function LockScreen({ title, onUnlock, onCancel }: Props) {
  const [error, setError] = useState<string>();
  const [biometrics, setBiometrics] = useState(false);

  const tryBiometrics = async () => {
    if (await authenticateWithBiometrics(title)) onUnlock();
  };

  useEffect(() => {
    if (!getFaceId()) return;
    let active = true;
    void biometricsAvailable().then((available) => {
      if (!active || !available) return;
      setBiometrics(true);
      void tryBiometrics();
    });
    return () => {
      active = false;
    };
    // Prompts once when the screen appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async (pin: string) => {
    const result = await verifyPin(pin);
    if (result === "ok") return onUnlock();
    setError(
      result === "locked"
        ? "Too many attempts. Try again in 30 seconds."
        : "Wrong PIN. Try again.",
    );
  };

  return (
    <Screen center bg="systemGroupedBackground" gap="xxl">
      <Icon icon={Lock} size={32} color="secondaryLabel" />
      <PinPad
        title={title}
        subtitle="Enter your PIN"
        error={error}
        onComplete={check}
        corner={
          biometrics ? (
            <Pressable
              accessibilityLabel="Unlock with Face ID"
              onPress={tryBiometrics}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon icon={ScanFace} size={30} color="systemBlue" />
            </Pressable>
          ) : null
        }
      />
      {onCancel && (
        <Box>
          <Button title="Cancel" variant="plain" onPress={onCancel} />
        </Box>
      )}
    </Screen>
  );
}

/** Lock screen presented over everything, including native modals. */
export function LockModal({ visible, ...props }: Props & { visible: boolean }) {
  return (
    <Modal visible={visible} onRequestClose={props.onCancel}>
      <LockScreen {...props} />
    </Modal>
  );
}
