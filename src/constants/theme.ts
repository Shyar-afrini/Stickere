/**
 * iOS system colors (Human Interface Guidelines), light and dark variants.
 * Names follow the UIColor semantic colors so they map 1:1 to the platform.
 */

import "@/global.css";

export const Colors = {
  light: {
    label: "#000000",
    secondaryLabel: "rgba(60, 60, 67, 0.6)",
    tertiaryLabel: "rgba(60, 60, 67, 0.3)",
    quaternaryLabel: "rgba(60, 60, 67, 0.18)",
    systemGray: "#8E8E93",
    systemGray2: "#AEAEB2",
    systemGray3: "#C7C7CC",
    systemGray4: "#D1D1D6",
    systemGray5: "#E5E5EA",
    systemGray6: "#F2F2F7",
    separator: "rgba(60, 60, 67, 0.29)",
    opaqueSeparator: "#C6C6C8",
    systemBackground: "#FFFFFF",
    secondarySystemBackground: "#F2F2F7",
    tertiarySystemBackground: "#FFFFFF",
    systemGroupedBackground: "#F2F2F7",
    secondarySystemGroupedBackground: "#FFFFFF",
    tertiarySystemGroupedBackground: "#F2F2F7",
    systemFill: "rgba(120, 120, 128, 0.2)",
    secondarySystemFill: "rgba(120, 120, 128, 0.16)",
    tertiarySystemFill: "rgba(118, 118, 128, 0.12)",
    quaternarySystemFill: "rgba(116, 116, 128, 0.08)",
    // iOS system colors.
    systemBlue: "#007AFF",
    systemGreen: "#34C759",
    systemRed: "#FF3B30",
    systemOrange: "#FF9500",
    systemYellow: "#FFCC00",
    systemMint: "#00C7BE",
    systemTeal: "#30B0C7",
    systemCyan: "#32ADE6",
    systemIndigo: "#5856D6",
    systemPurple: "#AF52DE",
    systemPink: "#FF2D55",
    systemBrown: "#A2845E",
    onTint: "#FFFFFF",
  },
  dark: {
    label: "#FFFFFF",
    secondaryLabel: "rgba(235, 235, 245, 0.6)",
    tertiaryLabel: "rgba(235, 235, 245, 0.3)",
    quaternaryLabel: "rgba(235, 235, 245, 0.16)",
    systemGray: "#8E8E93",
    systemGray2: "#636366",
    systemGray3: "#48484A",
    systemGray4: "#3A3A3C",
    systemGray5: "#2C2C2E",
    systemGray6: "#1C1C1E",
    separator: "rgba(84, 84, 88, 0.6)",
    opaqueSeparator: "#38383A",
    systemBackground: "#000000",
    secondarySystemBackground: "#1C1C1E",
    tertiarySystemBackground: "#2C2C2E",
    systemGroupedBackground: "#000000",
    secondarySystemGroupedBackground: "#1C1C1E",
    tertiarySystemGroupedBackground: "#2C2C2E",
    systemFill: "rgba(120, 120, 128, 0.36)",
    secondarySystemFill: "rgba(120, 120, 128, 0.32)",
    tertiarySystemFill: "rgba(118, 118, 128, 0.24)",
    quaternarySystemFill: "rgba(116, 116, 128, 0.18)",
    systemBlue: "#0A84FF",
    systemGreen: "#30D158",
    systemRed: "#FF453A",
    systemOrange: "#FF9F0A",
    systemYellow: "#FFD60A",
    systemMint: "#63E6E2",
    systemTeal: "#40C8E0",
    systemCyan: "#64D2FF",
    systemIndigo: "#5E5CE6",
    systemPurple: "#BF5AF2",
    systemPink: "#FF375F",
    systemBrown: "#AC8E68",
    onTint: "#FFFFFF",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
    fontWeight: "400",
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
    fontWeight: "400",
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.35,
    fontWeight: "400",
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
    fontWeight: "400",
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
    fontWeight: "600",
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
    fontWeight: "400",
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
    fontWeight: "400",
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
    fontWeight: "400",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    fontWeight: "400",
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: "400",
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.07,
    fontWeight: "400",
  },
} as const;

export type TextVariant = keyof typeof Typography;

/** The only elevations used in the app: soft, low-contrast iOS shadows. */
export const Shadows = {
  floating: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  popover: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
} as const;

/** Minimum touch target recommended by the HIG. */
export const MinTapSize = 44;
