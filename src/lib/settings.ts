import Storage from "expo-sqlite/kv-store";

// Small key-value settings, kept in the same SQLite storage as the rest of the app.
const ARRIVAL_REMINDERS = "arrivalReminders";

const APP_LOCK = "appLock";
const FACE_ID = "faceId";

export const getAppLock = () => Storage.getItemSync(APP_LOCK) === "on";
export const setAppLock = (enabled: boolean) =>
  Storage.setItemSync(APP_LOCK, enabled ? "on" : "off");

/** Whether biometrics may be used to unlock, besides the PIN. */
export const getFaceId = () => Storage.getItemSync(FACE_ID) === "on";
export const setFaceId = (enabled: boolean) =>
  Storage.setItemSync(FACE_ID, enabled ? "on" : "off");

export const getArrivalReminders = () => Storage.getItemSync(ARRIVAL_REMINDERS) === "on";

export const setArrivalReminders = (enabled: boolean) =>
  Storage.setItemSync(ARRIVAL_REMINDERS, enabled ? "on" : "off");
