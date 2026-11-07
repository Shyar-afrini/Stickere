# UI approach

One look, two platforms. Every control, dialog and surface follows Apple's iOS design and is drawn by the
app's own components in `src/components/ui`, so the app never feels like two different products.

## Same on both platforms (drawn by the app)
- Colours, type, spacing, radii: `src/constants/theme.ts`. Motion: `src/constants/motion.ts`.
- Toggle, Slider, Spinner, Button, Chip, text fields, list rows.
- Alerts and action sheets: `DialogHost` (frosted cards), opened with `showAlert` / `showActionSheet`.
- Floating surfaces: `Blur` (frosted on iOS; the same colour, radius and hairline on Android).
- Press feedback: dim / scale on both, no Android ripple.

## Native APIs, each platform's own
- Haptics (`src/lib/haptics.ts`): iOS impact/selection generators, Android haptic constants.
- Navigation: Expo Router native stack, native sheet frame (`formSheet`), Android back handling.
- System pickers and sheets that can't be restyled: photo picker, share sheet, permission prompts.
- Biometrics, notifications, location, geofencing, media library: each platform's own service.

## Rules
- Never ship a platform's stock widget as it comes; wrap it so it matches the iOS style.
- A `.android.tsx` / `.ios.tsx` split is for platform behaviour or an unavoidable rendering gap
  (e.g. `blur.android.tsx`), never for a different look.
- The Android blur is a solid iOS-material colour: the system blur isn't available there.
