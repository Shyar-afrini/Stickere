import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { PinPad } from "@/components/pin-pad";
import { Screen } from "@/components/ui";
import { setPackLocked } from "@/db/mutations";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { hasPin, setPin, verifyPin } from "@/lib/security";
import { setAppLock } from "@/lib/settings";

type Step = "current" | "new" | "confirm";

/**
 * Sets or changes the PIN. When opened to turn a lock on (`enable`), the lock
 * is switched on as soon as the PIN is saved.
 */
export default function PinSetup() {
  const router = useRouter();
  const headerInset = useHeaderInset();
  const { enable, packId } = useLocalSearchParams<{
    enable?: "app" | "pack";
    packId?: string;
  }>();
  const [changing] = useState(hasPin);
  const [step, setStep] = useState<Step>(changing ? "current" : "new");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string>();

  const onComplete = async (pin: string) => {
    setError(undefined);

    if (step === "current") {
      const result = await verifyPin(pin);
      if (result === "ok") setStep("new");
      else
        setError(
          result === "locked"
            ? "Too many attempts. Try again in 30 seconds."
            : "Wrong PIN. Try again.",
        );
    } else if (step === "new") {
      setFirst(pin);
      setStep("confirm");
    } else if (pin !== first) {
      setError("PINs don’t match. Start again.");
      setStep("new");
    } else {
      await setPin(pin);
      if (enable === "app") setAppLock(true);
      if (enable === "pack" && packId) setPackLocked(Number(packId), true);
      router.back();
    }
  };

  const titles: Record<Step, string> = {
    current: "Enter Current PIN",
    new: changing ? "Enter New PIN" : "Create a PIN",
    confirm: "Confirm PIN",
  };

  return (
    <Screen
      center
      bg="systemGroupedBackground"
      style={{ paddingTop: headerInset }}
    >
      {/* The PIN pad names the step itself, so the bar has no title. */}
      <Stack.Screen options={{ title: "" }} />
      <PinPad
        key={step}
        title={titles[step]}
        subtitle={step === "new" ? "Use 4 digits" : undefined}
        error={error}
        onComplete={onComplete}
      />
    </Screen>
  );
}
