import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticsModule = typeof Haptics;

// Builds made before expo-haptics was added have no native module: the call rejects and the
// feedback is skipped.
const run = (feedback: (module: HapticsModule) => Promise<void>) => {
  feedback(Haptics).catch(() => {});
};

const android = Platform.OS === "android";

/**
 * The app's tactile feedback, by meaning. iOS uses its impact, selection and notification
 * generators; Android its own system haptic constants.
 */
export const Haptic = {
  /** Moving between options: tabs, segments, picker values. */
  selection: () =>
    run((h) =>
      android ? h.performAndroidHapticsAsync(h.AndroidHaptics.Segment_Tick) : h.selectionAsync(),
    ),
  /** A press that opens or starts something: the Add button, the menu. */
  tap: () =>
    run((h) =>
      android
        ? h.performAndroidHapticsAsync(h.AndroidHaptics.Context_Click)
        : h.impactAsync(h.ImpactFeedbackStyle.Light),
    ),
  /** Picking something up to drag it. */
  dragStart: () =>
    run((h) =>
      android
        ? h.performAndroidHapticsAsync(h.AndroidHaptics.Drag_Start)
        : h.impactAsync(h.ImpactFeedbackStyle.Medium),
    ),
  success: () =>
    run((h) =>
      android
        ? h.performAndroidHapticsAsync(h.AndroidHaptics.Confirm)
        : h.notificationAsync(h.NotificationFeedbackType.Success),
    ),
  error: () =>
    run((h) =>
      android
        ? h.performAndroidHapticsAsync(h.AndroidHaptics.Reject)
        : h.notificationAsync(h.NotificationFeedbackType.Error),
    ),
  /** Before something destructive is confirmed. */
  warning: () =>
    run((h) =>
      android
        ? h.performAndroidHapticsAsync(h.AndroidHaptics.Long_Press)
        : h.notificationAsync(h.NotificationFeedbackType.Warning),
    ),
};
