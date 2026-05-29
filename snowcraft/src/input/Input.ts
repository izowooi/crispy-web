// Input — mouse + keyboard wiring for the Snowcraft port.
//
// Faithful to:
//   * spec/player.md §5.1 ("Mouse handlers on the Red Dudie clip"):
//       onPress  → onchosen   (RedSnowDudie.as:26)
//       onRelease→ mouserelease (:27)
//       onRollOver / onRollOut handlers (lines 91-107)
//     plus the "while dragging, teleport to (stage._xmouse, stage._ymouse)
//     then clip via checkline(592,0,0,320, x,y, less=1)" rule (:175-182).
//   * spec/player.md §5.2 ("Key codes"): only key 16 (Shift) is wired into
//     gameplay (Snowcraft1Rewrite.as:214-227). The two debug cheat sequences
//     ("levN" / "credits") read `Key.getAscii()` (frame_5/DoAction.as:18-36).
//   * spec/ui.md §1: mouse events fire on the canvas (the SWF stage
//     equivalent), keyboard events fire on the document.
//
// The Input module owns NO gameplay state — it only translates DOM events
// into structured callbacks (`onPress(x,y)`, `onMove(x,y)`, `onRelease(x,y)`,
// `onKeyDown(code,key)`, `onKeyUp(code,key)`). Hit-testing the red dudies
// against the cursor is the consumer's responsibility (e.g. `main.ts`).

export interface InputCallbacks {
  /** Mouse pressed on the stage. (x,y) is in canvas/stage pixels. */
  onPress?(x: number, y: number): void;
  /** Mouse moved (always reported, regardless of button state). */
  onMove?(x: number, y: number): void;
  /** Mouse released (or `mouseleave` while pressed). */
  onRelease?(x: number, y: number): void;
  /** Key down — `code` is `KeyboardEvent.keyCode` for AS-parity (Shift=16),
   *  `key` is `KeyboardEvent.key` for the cheat-sequence path. */
  onKeyDown?(code: number, key: string): void;
  /** Key up — same shape. */
  onKeyUp?(code: number, key: string): void;
}

export interface InputState {
  /** Latest mouse position in stage coordinates (top-left origin, +Y down). */
  mouseX: number;
  mouseY: number;
  /** True between `mousedown` and `mouseup` / `mouseleave`. */
  pressed: boolean;
  /** True while Shift is held — mirrors `Snowcraft1Rewrite.shiftdown`. */
  shiftDown: boolean;
}

/**
 * Input — binds mouse events to a `<canvas>` and keyboard events to the
 * `document`. Constructor returns a configured instance; call `dispose()` to
 * unbind (e.g. on hot-reload or a test teardown).
 */
export class Input {
  readonly canvas: HTMLCanvasElement;
  private callbacks: InputCallbacks;
  private _state: InputState = {
    mouseX: 0,
    mouseY: 0,
    pressed: false,
    shiftDown: false,
  };

  /** Pointer id currently captured for an active press, or null. */
  private activePointerId: number | null = null;

  // Bound handler references so we can `removeEventListener` on dispose.
  // Pointer Events (not mouse events) are used so trackpad/touch drags fire a
  // reliable release: with mouse events, a macOS trackpad drag (esp. with
  // three-finger-drag / Drag Lock) can swallow the `mouseup` on finger-lift, so
  // the throw only fired on the NEXT tap's mouseup — the reported bug. With
  // `setPointerCapture` + a `pointercancel` fallback, lifting always delivers a
  // `pointerup`/`pointercancel` to us. (A true OS-level Drag Lock can still
  // hold the button down — that part is an accessibility setting, not code.)
  private onPointerDown = (e: PointerEvent) => this.handleDown(e);
  private onPointerMove = (e: PointerEvent) => this.handleMove(e);
  private onPointerUp = (e: PointerEvent) => this.handleUp(e);
  private onPointerCancel = (e: PointerEvent) => this.handleUp(e);
  private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    // Stop the browser from claiming the drag as a scroll/zoom gesture (which
    // would emit `pointercancel` instead of `pointerup` on touch/trackpad).
    canvas.style.touchAction = "none";

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    // pointerup/cancel on the canvas: setPointerCapture routes them here even
    // when the pointer leaves the canvas, so a release anywhere still throws.
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("contextmenu", this.onContextMenu);

    // Keyboard listens on document — matches Flash's global Key.addListener
    // (Snowcraft1Rewrite.as:32-40).
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  /** Snapshot of the current input state. */
  get state(): Readonly<InputState> {
    return this._state;
  }

  /** Tear down all listeners. */
  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }

  /** Update the callback bank in-place (so `main.ts` can rebind after load). */
  setCallbacks(cb: InputCallbacks): void {
    this.callbacks = cb;
  }

  // -------------------------------------------------------------------------
  // Internal handlers
  // -------------------------------------------------------------------------

  private toStageCoords(e: { clientX: number; clientY: number }): {
    x: number;
    y: number;
  } {
    const rect = this.canvas.getBoundingClientRect();
    // Translate viewport coords → stage coords. Account for any CSS scale.
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }

  private handleDown(e: PointerEvent): void {
    if (e.button !== 0) return; // Only the primary button matches AS.
    const { x, y } = this.toStageCoords(e);
    this._state.mouseX = x;
    this._state.mouseY = y;
    this._state.pressed = true;
    this.activePointerId = e.pointerId;
    // Capture so move/up/cancel keep coming to the canvas even if the pointer
    // leaves it during the drag (and so finger-lift always reaches us).
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer is no longer active
      // (e.g. synthetic events in tests) — safe to ignore.
    }
    this.callbacks.onPress?.(x, y);
  }

  private handleMove(e: PointerEvent): void {
    const { x, y } = this.toStageCoords(e);
    this._state.mouseX = x;
    this._state.mouseY = y;
    this.callbacks.onMove?.(x, y);
  }

  private handleUp(e: PointerEvent): void {
    if (!this._state.pressed) return;
    // Ignore an up/cancel from a different pointer than the one that pressed.
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) {
      return;
    }
    const { x, y } = this.toStageCoords(e);
    this._state.mouseX = x;
    this._state.mouseY = y;
    this._state.pressed = false;
    if (this.activePointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId);
      } catch {
        // Already released / never captured — ignore.
      }
      this.activePointerId = null;
    }
    this.callbacks.onRelease?.(x, y);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // keyCode is deprecated but still populated by all browsers and matches
    // the AS `Key.getCode()` value (Shift=16 — Snowcraft1Rewrite.as:217).
    if (e.key === "Shift") this._state.shiftDown = true;
    this.callbacks.onKeyDown?.(e.keyCode, e.key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === "Shift") this._state.shiftDown = false;
    this.callbacks.onKeyUp?.(e.keyCode, e.key);
  }
}
