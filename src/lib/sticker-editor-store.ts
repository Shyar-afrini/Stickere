export type Tool = "cutout" | "write" | "paint" | "sticker" | "eraser" | "frame";
export type Frame = "none" | "rounded" | "circle";

type Point = { x: number; y: number };

export type Layer = {
  kind: "layer";
  id: number;
  type: "text" | "emoji" | "image";
  /** The text, the emoji, or the image URI. */
  value: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Rough half-size at scale 1, for touch hit-testing. */
  radius: number;
  /** Text only. */
  bold: boolean;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
};

export type Stroke = {
  kind: "stroke";
  id: number;
  erase: boolean;
  color: string;
  width: number;
  points: Point[];
};

/** Everything drawn on top of the photo, in drawing order. */
export type Op = Layer | Stroke;

export type EditorState = {
  baseUri: string;
  baseWidth: number;
  baseHeight: number;
  ops: Op[];
  selectedId: number | null;
  tool: Tool | null;
  color: string;
  brush: number;
  frame: Frame;
  /** White border around whatever is left of the photo, redrawn live as parts are erased. */
  outline: boolean;
  /** Thickness of that outline, in canvas points. */
  outlineWidth: number;
};

type Listener = () => void;

/**
 * Editing state of the sticker canvas. It is a plain store (not React state) so
 * the touch handlers can read the latest values synchronously while dragging.
 */
export class StickerEditorStore {
  state: EditorState;
  private listeners = new Set<Listener>();
  private nextId = 1;
  private dragStart: Point | null = null;
  private resetPending = false;
  private strokeResetPending = false;
  /** The stroke under the finger. The canvas draws it live; it joins `ops` on release. */
  activeStroke: Stroke | null = null;

  constructor(
    base: { uri: string; width: number; height: number },
    saved?: Partial<EditorState>,
  ) {
    this.state = {
      baseUri: base.uri,
      baseWidth: base.width,
      baseHeight: base.height,
      ops: [],
      color: "#FFFFFF",
      brush: 18,
      frame: "none",
      outline: false,
      outlineWidth: 12,
      ...saved,
      // Whatever was selected or being used when a draft was saved starts fresh.
      selectedId: null,
      tool: null,
    };
    this.nextId = this.state.ops.reduce((highest, op) => Math.max(highest, op.id), 0) + 1;
  }

  /** The part of the state that makes up the picture, for saving a draft. */
  snapshot(): Partial<EditorState> {
    const { selectedId: _selected, tool: _tool, ...rest } = this.state;
    return rest;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  set(patch: Partial<EditorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  setBase(base: { uri: string; width: number; height: number }) {
    this.set({ baseUri: base.uri, baseWidth: base.width, baseHeight: base.height });
  }

  get dirty() {
    return this.state.ops.length > 0 || this.state.frame !== "none";
  }

  selected() {
    return this.state.ops.find(
      (op): op is Layer => op.kind === "layer" && op.id === this.state.selectedId,
    );
  }

  addLayer(layer: Omit<
      Layer,
      "kind" | "id" | "color" | "scale" | "rotation" | "bold" | "outline" | "outlineColor" | "outlineWidth"
    > & Partial<Layer>) {
    const id = this.nextId++;
    this.set({
      ops: [
        ...this.state.ops,
        {
          kind: "layer",
          id,
          color: this.state.color,
          scale: 1,
          rotation: 0,
          bold: true,
          outline: false,
          outlineColor: "#000000",
          outlineWidth: 3,
          ...layer,
        },
      ],
      selectedId: id,
    });
  }

  updateSelected(change: (layer: Layer) => Partial<Layer>) {
    const current = this.selected();
    if (!current) return;
    this.set({
      ops: this.state.ops.map((op) => (op === current ? { ...current, ...change(current) } : op)),
    });
  }

  removeSelected() {
    this.set({
      ops: this.state.ops.filter((op) => op.id !== this.state.selectedId),
      selectedId: null,
    });
  }

  undo() {
    const ops = this.state.ops.slice(0, -1);
    this.set({ ops, selectedId: ops.some((op) => op.id === this.state.selectedId) ? this.state.selectedId : null });
  }

  // Touch handling ---------------------------------------------------------

  touchStart(x: number, y: number) {
    const { tool } = this.state;
    if (tool === "paint" || tool === "eraser") {
      const stroke: Stroke = {
        kind: "stroke",
        id: this.nextId++,
        erase: tool === "eraser",
        color: this.state.color,
        width: this.state.brush,
        points: [{ x, y }],
      };
      this.activeStroke = stroke;
      this.set({ selectedId: null });
      return;
    }

    // Pick the top-most layer under the finger; keep dragging it from where it is.
    const hit = [...this.state.ops]
      .reverse()
      .find(
        (op): op is Layer =>
          op.kind === "layer" && Math.hypot(op.x - x, op.y - y) <= Math.max(op.radius * op.scale, 28),
      );
    this.dragStart = hit ? { x: hit.x, y: hit.y } : null;
    this.set({ selectedId: hit?.id ?? null });
  }

  touchMove(x: number, y: number, dx: number, dy: number) {
    const { tool } = this.state;
    if (tool === "paint" || tool === "eraser") {
      // Not a state change: the canvas reads the point and draws it straight away.
      this.activeStroke?.points.push({ x, y });
      return;
    }
    // Layer drags are not stored while moving: the canvas follows the finger on its own
    // and commits the final position with `commitDrag`.
  }

  /** True while a touch that started on a layer is moving it. */
  get draggingLayer() {
    return this.dragStart !== null;
  }

  /** Moves the finished stroke into `ops`. */
  commitStroke() {
    const stroke = this.activeStroke;
    this.activeStroke = null;
    if (!stroke) return;
    this.strokeResetPending = true;
    this.set({ ops: [...this.state.ops, stroke] });
  }

  /** True once after a stroke was committed; the canvas then clears its live path. */
  consumeStrokeReset() {
    const pending = this.strokeResetPending;
    this.strokeResetPending = false;
    return pending;
  }

  /** True once after a drag was committed; the canvas then drops its temporary offset. */
  consumeDragReset() {
    const pending = this.resetPending;
    this.resetPending = false;
    return pending;
  }

  commitDrag(dx: number, dy: number) {
    const start = this.dragStart;
    this.dragStart = null;
    this.resetPending = true;
    if (start && (dx !== 0 || dy !== 0)) {
      this.updateSelected(() => ({ x: start.x + dx, y: start.y + dy }));
    }
  }
}
