/**
 * iOS system colors (Human Interface Guidelines), light and dark variants.
 * Names follow the UIColor semantic colors so they map 1:1 to the platform.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    separator: 'rgba(60, 60, 67, 0.29)',
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    systemFill: 'rgba(120, 120, 128, 0.2)',
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemRed: '#FF3B30',
    onTint: '#FFFFFF',
  },
  dark: {
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    separator: 'rgba(84, 84, 88, 0.6)',
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    systemFill: 'rgba(120, 120, 128, 0.36)',
    systemBlue: '#0A84FF',
    systemGreen: '#30D158',
    systemRed: '#FF453A',
    onTint: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** iOS spacing on a 4pt grid. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type SpaceKey = keyof typeof Spacing;

/** Corner radii. Always paired with `borderCurve: 'continuous'` (iOS squircle). */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export type RadiusKey = keyof typeof Radius;

/**
 * iOS text styles (Dynamic Type "Large" sizes) with their standard tracking.
 * https://developer.apple.com/design/human-interface-guidelines/typography
 */
export const Typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: 0.37, fontWeight: '400' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: 0.36, fontWeight: '400' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: 0.35, fontWeight: '400' },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: 0.38, fontWeight: '400' },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.32, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, letterSpacing: 0, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, letterSpacing: 0.07, fontWeight: '400' },
} as const;

export type TextVariant = keyof typeof Typography;

/** The only elevations used in the app: soft, low-contrast iOS shadows. */
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  popover: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sticker: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
} as const;

export type ShadowKey = keyof typeof Shadows;

/** Minimum touch target recommended by the HIG. */
export const MinTapSize = 44;
