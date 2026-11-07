import { Animated, Easing } from "react-native";

type Rect = { x: number; y: number; width: number; height: number };
type Measurable = {
  measureInWindow(
    callback: (x: number, y: number, width: number, height: number) => void,
  ): void;
};
type Handlers = {
  /** The order changed while dragging. */
  onReorder: (keys: string[]) => void;
  /** A card was picked up (`key`) or dropped (`null`). */
  onActive: (key: string | null) => void;
  /** The finger lifted after the order changed. */
  onCommit: (keys: string[]) => void;
};

// How cards slide to their new slot while another one is dragged.
const SLIDE = { duration: 180, easing: Easing.out(Easing.cubic) } as const;

/**
 * Drag-to-reorder logic for a set of cards laid out in any flow (grid or
 * columns). Cards register their views. When a drag starts, every card's slot is
 * measured once. The dragged card follows the finger; when its center is over
 * another slot the cards slide (transform only, the React order is untouched) to
 * their new slots. The order is only applied when the finger lifts, so nothing
 * is re-laid-out or re-measured while dragging, which is what made cards jump.
 * Plain class so gestures can run without touching React refs.
 */
export class ReorderController {
  // Per-card offset from its layout slot: the finger for the dragged card, a slide for the others.
  private shifts = new Map<string, Animated.ValueXY>();
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
  // Order while dragging, and the order and slot rectangles the drag started from.
  private order: string[] = [];
  private base: string[] = [];
  private slots: Rect[] = [];
  private drop: { key: string; from: { x: number; y: number } } | null = null;
  private handlers: Handlers = {
    onReorder: () => {},
    onActive: () => {},
    onCommit: () => {},
  };

  private armed: string | null = null;
  private active: string | null = null;
  private origin: Rect | null = null;
  private finger = { dx: 0, dy: 0 };
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
          Animated.timing(this.swing, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(this.swing, {
            toValue: -1,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      );
      this.swingLoop.start();
      Animated.timing(this.amplitude, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(this.amplitude, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
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

  /** The animated offset of a card; the card's view applies it as a transform. */
  shift(key: string) {
    let value = this.shifts.get(key);
    if (!value) {
      value = new Animated.ValueXY();
      this.shifts.set(key, value);
    }
    return value;
  }

  /** Long press on a card: remember where every slot is, then start following the finger. */
  arm(key: string) {
    this.armed = key;
    this.order = [...this.keys];
    this.base = [...this.keys];
    this.changed = false;
    this.drop = null;
    this.finger = { dx: 0, dy: 0 };
    this.measureAll(() => {
      if (this.armed !== key) return;
      this.slots = this.base.map((k) => this.rects.get(k)!);
      this.origin = this.rects.get(key) ?? null;
      this.active = key;
      this.handlers.onActive(key);
    });
  }

  move(dx: number, dy: number) {
    if (!this.active || !this.origin) return;
    this.finger = { dx, dy };
    this.shift(this.active).setValue({ x: dx, y: dy });

    const center = {
      x: this.origin.x + dx + this.origin.width / 2,
      y: this.origin.y + dy + this.origin.height / 2,
    };
    const slot = this.slots.findIndex(
      (rect) =>
        rect &&
        center.x >= rect.x &&
        center.x <= rect.x + rect.width &&
        center.y >= rect.y &&
        center.y <= rect.y + rect.height,
    );
    const current = this.order.indexOf(this.active);
    if (slot < 0 || slot === current) return;

    const next = [...this.order];
    next.splice(current, 1);
    next.splice(slot, 0, this.active);
    this.order = next;
    this.changed = true;
    this.slideOthers();
  }

  /** Finger lifted (or the touch was cancelled). Safe to call more than once. */
  end() {
    if (this.armed === null) return;
    const active = this.active;
    this.armed = null;
    this.active = null;
    const origin = this.origin;
    this.origin = null;
    this.handlers.onActive(null);

    if (active && origin && this.changed) {
      // Apply the order, then `finishDrop` (run once React has laid the cards out in it) clears every
      // offset and lets the dropped card settle from where the finger left it.
      this.drop = {
        key: active,
        from: { x: origin.x + this.finger.dx, y: origin.y + this.finger.dy },
      };
      this.handlers.onReorder(this.order);
      this.handlers.onCommit(this.order);
      return;
    }
    this.settle(active);
  }

  /** Called after a render that applied the dropped order. */
  finishDrop() {
    const drop = this.drop;
    if (!drop) return;
    this.drop = null;
    const slot = this.slots[this.order.indexOf(drop.key)];
    for (const [key, value] of this.shifts) {
      if (key === drop.key) continue;
      value.setValue({ x: 0, y: 0 });
    }
    // The dropped card is now laid out in its new slot; start from where the finger left it.
    this.shift(drop.key).setValue({
      x: drop.from.x - slot.x,
      y: drop.from.y - slot.y,
    });
    this.settle(drop.key);
  }

  private settle(key: string | null) {
    if (!key) return;
    Animated.spring(this.shift(key), {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }

  // Slides every card except the dragged one to the slot it now has in `order`.
  private slideOthers() {
    for (const key of this.base) {
      if (key === this.active) continue;
      const from = this.slots[this.base.indexOf(key)];
      const to = this.slots[this.order.indexOf(key)];
      if (!from || !to) continue;
      Animated.timing(this.shift(key), {
        toValue: { x: to.x - from.x, y: to.y - from.y },
        useNativeDriver: true,
        ...SLIDE,
      }).start();
    }
  }

  private measureAll(done: () => void) {
    const entries = [...this.views];
    let pending = entries.length;
    if (pending === 0) return done();

    for (const [key, view] of entries) {
      view.measureInWindow((x, y, width, height) => {
        this.rects.set(key, { x, y, width, height });
        pending -= 1;
        if (pending === 0) done();
      });
    }
  }
}
