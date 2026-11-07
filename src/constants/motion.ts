import { Easing, ReduceMotion } from "react-native-reanimated";

/**
 * Every animation timing in the app. Each preset follows the system "Reduce Motion" setting
 * (`ReduceMotion.System`): with it on, the animation jumps straight to its end.
 */
export const Duration = {
  /** Content leaving, so the container can move right after. */
  fast: 120,
  /** Small state changes: toggles, fades. */
  standard: 200,
  /** Content arriving after its container. */
  slow: 260,
} as const;

/** Gap between a container moving and its content following. */
export const Stagger = 120;

export const Springs = {
  /** Selection bubbles and panels: quick with a light bounce. */
  snappy: {
    damping: 16,
    stiffness: 180,
    mass: 0.8,
    reduceMotion: ReduceMotion.System,
  },
  /** Opening a panel: soft, almost no bounce, so it reads as one motion. */
  gentle: {
    damping: 24,
    stiffness: 170,
    mass: 1,
    reduceMotion: ReduceMotion.System,
  },
  /** Cards that follow a drag and settle (the stamp flip). */
  settle: {
    damping: 16,
    stiffness: 140,
    mass: 0.9,
    reduceMotion: ReduceMotion.System,
  },
} as const;

export const Timings = {
  fadeOut: { duration: Duration.fast, reduceMotion: ReduceMotion.System },
  fadeIn: {
    duration: Duration.slow,
    easing: Easing.out(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  },
  standard: { duration: Duration.standard, reduceMotion: ReduceMotion.System },
  /** The tab bar's pill turning into a sheet's Close/Save button and back. */
  bar: {
    duration: 220,
    easing: Easing.out(Easing.quad),
    reduceMotion: ReduceMotion.System,
  },
  /** A floating card sinking away after a tap outside it. */
  dismiss: {
    duration: 220,
    easing: Easing.out(Easing.quad),
    reduceMotion: ReduceMotion.System,
  },
} as const;

/** Slow ambient colour drift (e.g. the Rewind banner). One loop, eased both ways. */
export const Drift = {
  duration: 9000,
  easing: Easing.inOut(Easing.sin),
  reduceMotion: ReduceMotion.System,
} as const;
