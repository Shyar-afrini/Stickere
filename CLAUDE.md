# Cross-Platform UI/UX Design Standards

## Primary objective
Build a premium, polished mobile application with a consistent visual identity across iOS and Android.

## Design references
- iOS: Follow Apple's latest Human Interface Guidelines, including iOS 27.
- Android: Follow Google's latest Material Design 3 and Material 3 Expressive guidelines.
- Accessibility: Follow WCAG 2.2 AA where applicable.

## Shared design language
Maintain consistency across:
- Brand colors and semantic color tokens.
- Typography hierarchy.
- Spacing and layout.
- Corner radii.
- Iconography principles.
- Component dimensions where appropriate.
- Animation personality and interaction feedback.

## Platform-specific implementation
Never force identical UI implementations across platforms.

iOS:
- Prefer native SwiftUI components and behaviors.
- Respect Apple's navigation, sheets, gestures and haptics.
- Use appropriate Liquid Glass materials.
- Use native spring animations and SF Symbols effects.

Android:
- Prefer native Jetpack Compose components and behaviors.
- Follow Material 3 component conventions.
- Respect Android navigation, gestures and system insets.
- Use native Compose animation APIs and haptics.

## Micro-interactions
Every interactive component must have appropriate states:
- Default
- Pressed
- Focused
- Disabled
- Loading
- Success
- Error

Use purposeful animations for:
- Button presses.
- Navigation transitions.
- Sheet presentation and dismissal.
- Tab switching.
- List insertion and removal.
- Loading indicators.
- Pull-to-refresh.
- Toggle interactions.
- Expandable sections.
- Success and error feedback.

Animations must feel fluid, intentional and consistent. Respect reduced-motion accessibility settings.

## Development requirements
1. Inspect the existing project before making changes.
2. Maintain shared design tokens.
3. Use native platform components whenever appropriate.
4. Avoid unnecessary custom components when native equivalents exist.
5. Never introduce arbitrary colors, spacing or animation values.
6. Test light mode and dark mode.
7. Test different screen sizes.
8. Review both platforms after implementing shared features.

## Final quality assurance
Before marking any UI task complete:
- Compare iOS and Android screenshots.
- Check design consistency.
- Check native platform conventions.
- Verify animations and interaction states.
- Check accessibility.
- Identify visual inconsistencies and fix them.

The objective is one recognizable product with two properly native experiences.

# Mobile UI Engineering Rules

## Architecture
- Use Expo Router.
- Use TypeScript throughout.
- Maintain a centralized design system.
- Keep shared components platform-independent.
- Use .ios.tsx and .android.tsx for
  genuinely platform-specific implementations.

## Design
- Apple Human Interface Guidelines for iOS.
- Material Design 3 for Android.
- Maintain one consistent brand identity.
- Use semantic design tokens.
- Support light and dark themes.

## Animation
- Reanimated is the primary animation engine.
- Gesture Handler handles complex gestures.
- Expo Haptics provides tactile feedback.
- Skia is reserved for advanced graphics.
- Centralize animation timing and spring presets.
- Respect reduced-motion settings.

## Native UI
- Prefer Expo UI for suitable native controls.
- Prefer native navigation where appropriate.
- Respect platform-specific interaction conventions.
- Never force Liquid Glass onto Android.
- Never force Material components onto iOS.

## Quality assurance
- Test on real iOS and Android devices.
- Compare screenshots from both platforms.
- Verify light and dark mode.
- Check safe areas and system insets.
- Test all interactive states.
- Check animation smoothness.
- Verify accessibility and touch targets.

Never mark a screen complete without checking
both platform implementations.