import { Animated } from "react-native";

type Rect = { x: number; y: number; width: number; height: number };
type Measurable = {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
};
type Handlers = {
  /** The order changed while dragging. */
  onReorder: (keys: string[]) => void;
  /** A card was picked up (`key`) or dropped (`null`). */
  onActive: (key: string | null) => void;
  /** The finger lifted after the order changed. */
  onCommit: (keys: string[]) => void;
};

// After a swap the cards animate into place; measuring again waits for that.
const SETTLE_MS = 220;

/**
 * Drag-to-reorder logic for a set of cards laid out in any flow (grid or
 * columns). Cards register their views; the card being dragged follows the
 * finger and, when its center is over another card, takes that card's place.
 * Plain class so gestures can run without touching React refs.
 */
export class ReorderController {
  readonly translate = new Animated.ValueXY();
  // One shared swing for every card so they jiggle in unison: -1..1, scaled by
  // `amplitude`, which fades in with edit mode and back to 0 (straight) when it ends.
  readonly swing = new Animated.Value(-1);
  readonly amplitude = new Animated.Value(0);
  readonly tilt = Animated.multiply(this.swing, this.amplitude);
  private swingLoop: Animated.CompositeAnimation | null = null;

  private views = new Map<string, Measurable>();
  // Window rects of every card at its layout position, without the drag offset.
  private rects = new Map<string, Rect>();
  private keys: string[] = [];
  private order: string[] = [];
  private handlers: Handlers = { onReorder: () => {}, onActive: () => {}, onCommit: () => {} };

  private armed: string | null = null;
  private active: string | null = null;
  private origin: Rect | null = null;
  private offset = { x: 0, y: 0 };
  private finger = { dx: 0, dy: 0 };
  private settling = false;
  private changed = false;

  private editing = false;

  configure(keys: string[], handlers: Handlers, editing: boolean) {
    this.keys = keys;
    this.handlers = handlers;
    this.editing = editing;
  }

  /** Starts or stops the shared jiggle. Stopping settles every card back to straight. */
  setJiggling(on: boolean) {
    this.swingLoop?.stop();
    this.swingLoop = null;

    if (on) {
      this.swing.setValue(-1);
      this.swingLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(this.swing, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(this.swing, { toValue: -1, duration: 260, useNativeDriver: true }),
        ]),
      );
      this.swingLoop.start();
      Animated.timing(this.amplitude, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    } else {
      Animated.timing(this.amplitude, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }
  }

  isEditing() {
    return this.editing;
  }

  register(key: string, view: Measurable | null) {
    if (view) this.views.set(key, view);
    else this.views.delete(key);
  }

  isArmed(key: string) {
    return this.armed === key;
  }

  /** Long press on a card: remember where every card is, then start following the finger. */
  arm(key: string) {
    this.armed = key;
    this.order = [...this.keys];
    this.changed = false;
    this.finger = { dx: 0, dy: 0 };
    this.measureAll(() => {
      if (this.armed !== key) return;
      this.origin = this.rects.get(key) ?? null;
      this.active = key;
      this.setOffset(0, 0);
      this.handlers.onActive(key);
    });
  }

  move(dx: number, dy: number) {
    if (!this.active || !this.origin) return;
    this.finger = { dx, dy };
    this.follow();

    if (this.settling) return;
    const center = {
      x: this.origin.x + dx + this.origin.width / 2,
      y: this.origin.y + dy + this.origin.height / 2,
    };
    const target = [...this.rects].find(
      ([key, rect]) =>
        key !== this.active &&
        center.x >= rect.x &&
        center.x <= rect.x + rect.width &&
        center.y >= rect.y &&
        center.y <= rect.y + rect.height,
    )?.[0];
    if (!target) return;

    const next = [...this.order];
    next.splice(next.indexOf(this.active), 1);
    next.splice(this.order.indexOf(target), 0, this.active);
    this.order = next;
    this.changed = true;
    this.handlers.onReorder(next);

    this.settling = true;
    setTimeout(() => {
      this.measureAll(() => {
        this.settling = false;
        this.follow();
      });
    }, SETTLE_MS);
  }

  /** Finger lifted (or the touch was cancelled). Safe to call more than once. */
  end() {
    if (this.armed === null) return;
    const wasActive = this.active !== null;
    this.armed = null;
    this.active = null;
    this.origin = null;
    this.settling = false;

    Animated.spring(this.translate, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      bounciness: 6,
    }).start();
    this.offset = { x: 0, y: 0 };
    this.handlers.onActive(null);
    if (wasActive && this.changed) this.handlers.onCommit(this.order);
  }

  // Keeps the dragged card under the finger even though its layout slot moved.
  private follow() {
    if (!this.active || !this.origin) return;
    const layout = this.rects.get(this.active);
    if (!layout) return;
    this.setOffset(
      this.origin.x + this.finger.dx - layout.x,
      this.origin.y + this.finger.dy - layout.y,
    );
  }

  private setOffset(x: number, y: number) {
    this.offset = { x, y };
    this.translate.setValue({ x, y });
  }

  private measureAll(done: () => void) {
    const entries = [...this.views];
    let pending = entries.length;
    if (pending === 0) return done();

    for (const [key, view] of entries) {
      view.measureInWindow((x, y, width, height) => {
        // Window measurements include the drag transform; layout positions don't.
        const dragged = key === this.active;
        this.rects.set(key, {
          x: x - (dragged ? this.offset.x : 0),
          y: y - (dragged ? this.offset.y : 0),
          width,
          height,
        });
        pending -= 1;
        if (pending === 0) done();
      });
    }
  }
}
