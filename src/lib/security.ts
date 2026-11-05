import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// The PIN is never stored itself: only a salted SHA-256 hash, in the keychain.
const PIN_KEY = "stickere.pin";
export const PIN_LENGTH = 4;

const MAX_FAILURES = 5;
const LOCKOUT_MS = 30_000;
let failures = 0;
let lockedUntil = 0;

export const hasPin = () => SecureStore.getItem(PIN_KEY) !== null;

const hash = (salt: string, pin: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);

export async function setPin(pin: string) {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_KEY, `${salt}:${await hash(salt, pin)}`);
}

export type PinResult = "ok" | "wrong" | "locked";

/** Checks a PIN; after repeated mistakes it refuses attempts for a short while. */
export async function verifyPin(pin: string): Promise<PinResult> {
  if (Date.now() < lockedUntil) return "locked";

  const stored = SecureStore.getItem(PIN_KEY);
  if (!stored) return "wrong";
  const [salt, expected] = stored.split(":");

  if ((await hash(salt, pin)) === expected) {
    failures = 0;
    return "ok";
  }

  failures += 1;
  if (failures >= MAX_FAILURES) {
    failures = 0;
    lockedUntil = Date.now() + LOCKOUT_MS;
    return "locked";
  }
  return "wrong";
}

export async function biometricsAvailable() {
  return (
    (await LocalAuthentication.hasHardwareAsync()) &&
    (await LocalAuthentication.isEnrolledAsync())
  );
}

/** Face ID / fingerprint prompt only: the PIN is the fallback, not the device passcode. */
export async function authenticateWithBiometrics(reason: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: "Use PIN",
    disableDeviceFallback: true,
  });
  return result.success;
}
