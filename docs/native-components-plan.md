# Native components plan

How Stickerê moves from hand-styled React Native views to native iOS and Android controls, one
component at a time, without rewriting screens. Everything here is checked against the Expo SDK 58
docs (`https://docs.expo.dev/versions/v58.0.0/sdk/ui.md`); re-read them before each step, because
Expo UI changes between SDKs.

## Rules that stay true throughout

`CLAUDE.md` is the source of truth. In short:

1. **Screens never import a native or RN primitive.** They use `@/components/ui` only. A control's
   platform version lives in `ui/<name>.ios.tsx` / `ui/<name>.android.tsx`, with the same props.
2. **One brand, two native experiences.** Shared: colors, type hierarchy, spacing, radii, Lucide
   icons, motion presets. iOS follows Apple's HIG (UIKit / SwiftUI controls, frosted blur); Android
   follows Material 3 (Jetpack Compose controls, tonal surfaces, ripple, Roboto). No glass on Android,
   no Material on iOS.
3. **Kept on purpose:** the custom tab bar and header, the frosted blur on iOS (not Liquid Glass),
   and Lucide icons on both platforms (not SF Symbols).
4. **Motion** comes only from `src/constants/motion.ts`, whose presets follow Reduce Motion.
   **Haptics** come only from `src/lib/haptics.ts`.

## What is native already

| Piece | iOS | Android |
| --- | --- | --- |
| Switch (`Toggle`) | UISwitch | Compose Material 3 `Switch` |
| Slider | SwiftUI `Slider` | Compose Material 3 `Slider` |
| Alerts | UIAlertController (`Alert`) | Material dialog (`Alert`) |
| Action sheets | `ActionSheetIOS` | Compose `ModalBottomSheet` (`DialogHost`) |
| Sheets | UIKit sheet (`formSheet`) | Material bottom sheet (`formSheet`) |
| Spinner | UIActivityIndicatorView | Material progress circle |
| Floating surfaces (`Blur`) | Frosted blur | Tonal surface |
| Pressed state | Dim / shrink | Ripple |
| Font | San Francisco | Roboto |
| Transitions, overscroll, back | System defaults | System defaults |
| Haptics | Impact / selection / notification | Android haptic constants |

## Component by component

Order is by how much the user notices the difference. Docs: the `@expo/ui` pages for
[SwiftUI](https://docs.expo.dev/versions/v58.0.0/sdk/ui/swift-ui.md) and
[Jetpack Compose](https://docs.expo.dev/versions/v58.0.0/sdk/ui/jetpack-compose.md); the
[Universal](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal.md) set where one component
covers both.

| Order | `ui` component | Today | Native replacement | Notes |
| --- | --- | --- | --- | --- |
| 1 | `Toggle` | RN `Switch` | Universal `Switch` (`@expo/ui`) | Smallest swap; proves `Host` setup and the build. |
| 2 | `Slider` | Own touch slider | Universal `Slider` | Used for outline width. Keep the min/max/step props. |
| 3 | `TabStrip` | Own pills | Universal `Picker` (segmented) | Used on the sticker details page. |
| 4 | `showActionSheet` | `ActionSheetIOS` or alert | SwiftUI menu on iOS, Compose menu on Android | Gives real anchored menus instead of a bottom sheet. |
| 5 | `Modal` (lock, new pack) | RN `Modal` | Universal `BottomSheet` for sheets that are not full screen | The PIN lock stays a full-screen modal. |
| 6 | `TextField` | RN `TextInput` | Universal `TextInput` | Check Arabic and emoji input and the keyboard-avoid behavior first. |
| 7 | `ListRow` / `ListSection` | Own rows | Universal `List` / `FieldGroup` | Only if drag-to-reorder and swipe actions are covered; otherwise keep ours. |
| 8 | `Button` | Own pressable | Universal `Button` | Last: our press feedback and disabled colors are already iOS-like. |

Dates: when a date or time is needed, use `@react-native-community/datetimepicker`
([docs](https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker.md)), wrapped in a `DateField` in
`ui`.

## Navigation chrome

These are not part of the first pass because the current look is deliberate (frosted pills, tab
pill with the menu button). Revisit only if a native version can match it:

- **Native tabs** ([docs](https://docs.expo.dev/router/advanced/native-tabs.md)) would give the real
  iOS tab bar and Liquid Glass, but cannot hold the custom Menu button or the open-menu panel.
  Decision needed before any work: keep the custom bar, or drop the panel and use native tabs.
- **Stack toolbar** ([docs](https://docs.expo.dev/router/advanced/stack-toolbar.md)) could replace
  `AppHeader`'s buttons with real navigation-bar buttons. Same decision: it changes the transparent
  frosted header look.
- **Liquid Glass** ([GlassEffect docs](https://docs.expo.dev/versions/latest/sdk/glass-effect.md)):
  `Blur` could use it on iOS 26 and fall back to blur below that. Cheap to try inside `Blur`.

## What stays custom on purpose

The sticker canvas (Skia), the stamp flip card, the PIN pad, the loading screen and the map marker
stamps. They are drawn, not standard controls, so there is no native equivalent.

## For each swap

1. Read the component's SwiftUI and Compose pages (or the Universal page) in the SDK 58 docs.
2. Install with `npx expo install @expo/ui` (once) and make a new development build, since Expo Go
   may not match.
3. Change only the matching `src/components/ui/*.tsx`; keep its props.
4. Check in light and dark, on iPhone and Android, with large text on.
5. Run `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.

## Open questions

- Keep the custom tab bar and header, or move to native tabs and the stack toolbar?
- Minimum OS versions: Liquid Glass needs iOS 26; the module podspec currently allows iOS 16.4.
- Which `@expo/ui` SwiftUI controls have a Compose or drawn equivalent that can match the iOS look?
  Where none can, the component stays drawn by us on Android (as `Toggle`, alerts and action sheets
  already are).

## Which changes need a new development build

A change needs a build when it adds or changes native code or native config (`app.json` plugins,
permissions, a podspec or Gradle file). Everything else is JavaScript and loads with a reload.

**Needs a build (native code or config):**

| Change | Why |
| --- | --- |
| `modules/sticker-kit` iOS: WebP stickers, animated WebP, `libwebp` and `libwebp/mux` pods | New native code and pods; the module has never been compiled |
| `modules/sticker-kit` Android: WhatsApp provider, WebP export | Never compiled |
| `expo-media-library` plugin (photo suggestions) | Native plugin and permissions |
| `expo-location` background mode, `expo-task-manager`, `expo-notifications` (arrival reminders) | Background modes and permissions |
| `expo-local-authentication` plugin (Face ID text) | iOS Info.plist entry |
| Android permissions and package id in `app.json` | Android manifest |
| Android Google Maps API key (not set yet) | Maps need it in the manifest |
| Splash color change | Native splash screen |
| Any step of the native components plan that uses `@expo/ui` | Native views |

**Does not need a build (reload is enough):** the editor (redo, outline color, live tools, drafts),
GIF stickers (saving and showing them), pack editing and the "…" menu, geofence cooldown logic,
the `Blur`, `Modal`, `KeyboardAvoid` components, iOS-style alerts, sheets and switch on Android,
Inter and Calvino fonts (loaded at startup by `expo-font`, which is already in the build), colors,
tab bar changes, loading screen.

If your installed build is older than the native entries above, build once with
`npx expo run:ios` / `npx expo run:android` or `eas build --profile development`.
