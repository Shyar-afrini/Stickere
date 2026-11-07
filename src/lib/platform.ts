import { Linking, Platform } from "react-native";

export const isIOS = Platform.OS === "ios";

/** What the OS calls its biometric unlock. */
export const BIOMETRIC_LABEL = isIOS ? "Face ID" : "Biometric Unlock";

/** Opens this app's page in the system Settings. */
export const openAppSettings = () => Linking.openSettings();
