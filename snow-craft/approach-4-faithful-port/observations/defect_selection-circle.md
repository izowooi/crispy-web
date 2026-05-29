# Defect: selection-circle

## Factual truth (one sentence)

`selectioncircle._visible` is set to `false` at construction and on every `mouserollout` / `yougothit` (hit) event, and is **only** set to `true` in `mouseover()` when the dudie is not dazed, dead, or walking — i.e. it is hidden by default and shown only while the cursor is over a healthy red dudie.

## Authoritative AS source

The selection circle is the symbol exported as `"selectioncircle"`, which is **chid 8** (a `DefineSprite`) wrapping the bitmap **chid 6** (`DefineBitsLossless2`). It is `PlaceObject2`'d at depth 5 inside the red-dudie sprite (chid 32). The question's "chid 6" refers to the inner bitmap; the toggled MovieClip is the named child `selectioncircle` (chid 8).

`decompiled/dump.txt`:
```
15:00000b11:    8. DefineBitsLossless2 (chid: 6) ...
17:00000c96:   10. DefineSprite (chid: 8)
21:00000cb2:   11. ExportAssets (chid: 8, exp: "selectioncircle")
140:00002c1d:    5. PlaceObject2 (chid: 8, dpt: 5, nm: "selectioncircle")
```

### `RedSnowDudie.as` (the only place `selectioncircle._visible` is touched)

`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as`

Constructor — hidden by default at attach time:
```as
22:      this.dudiemc = stage.attachMovie("reddudie","reddudie" + _root.comiter,_root.comiter);
23:      this.dudiemc.selectioncircle._visible = false;
```

`yougothit()` — hide on getting hit (regardless of which hp branch):
```as
66:   function yougothit()
67:   {
68:      this.dragdudie = false;
69:      this.dudiemc.selectioncircle._visible = false;
70:      this.adobesucksmouseisdownflag = false;
```

`mouseover()` — show only if not dazed/dead/walking:
```as
91:   function mouseover()
92:   {
93:      if(this.dudiemc.dazed || this.dead || this.walking)
94:      {
95:         return undefined;
96:      }
97:      this.dudiemc.selectioncircle._visible = true;
98:   }
```

`mouserollout()` — always hide on roll-out (even when dazed/dead/walking, because the `_visible = false` runs before the early-return):
```as
99:    function mouserollout()
100:   {
101:      this.dudiemc.selectioncircle._visible = false;
102:      if(this.dudiemc.dazed || this.dead || this.walking)
103:      {
104:         return undefined;
105:      }
106:      this.dudiemc.gotoAndStop("ready");
107:   }
```

These four lines (23, 69, 97, 101) are the **only** writes to `selectioncircle._visible` in the entire decompiled source — confirmed by `grep -rn -i "selectioncircle"` over `decompiled/`. No `frame_*/DoAction.as` (under either `decompiled/scripts/scripts/...` or `decompiled/sprites/...`) contains the string.

### `ASnowDudie.as`

`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as` does not reference `selectioncircle` at all (the field lives only on the red dudie clip). The base class only manages `dead`, `walking`, `walkspeed`, position helpers, and `destroy()`.

### `mouserelease` does NOT touch `selectioncircle`

For completeness — the question lists `mouserelease` as a candidate hider, but it is not. `redrelease` calls `mouserelease()` (line 47), and `mouserelease()` (lines 119–129) only mutates `adobesucksmouseisdownflag`, `dragdudie`, and the dudie's animation state. It does not touch `selectioncircle._visible`.

### Truth table

| Trigger | `selectioncircle._visible` after |
|---|---|
| Construction (red attached) | `false` (line 23) |
| `mouseover` while alive & not dazed & not walking | `true` (line 97) |
| `mouseover` while dazed / dead / walking | unchanged (early return at 93–96) |
| `mouserollout` (any state) | `false` (line 101, runs before any guard) |
| `yougothit` (hp 2 → 1, or 1 → 0) | `false` (line 69) |
| `mouserelease` | unchanged — never written |
| `onchosen` / drag start | unchanged — never written |
| `dead == true` | not directly toggled; `yougothit` already hid it on the killing hit |
| `walking == true` | not directly toggled; the next `mouseover` while walking will leave it as-is, and any `mouserollout` will hide it |

The intuitive consequence: **once the cursor leaves a dudie, the ring is off**; **once a dudie is hit, the ring is off and stays off** until the user re-enters and the dudie is again healthy.

## What the port must do differently

Current behaviour in `web/src/`:

- `main.ts:385` decides ring visibility with `selected: !!d.selected || (d.team === "red" && isHover)`.
- `main.ts:218` sets `target.selected = true` on press, and `main.ts:240` clears it on release.
- `main.ts:188` recomputes `hovered = pickRedAt(x, y)` on every move; nothing else gates it.
- `Renderer.ts:299–309` draws the ring whenever `state.selected` is truthy.

This shows the ring on hover (matches AS) but it does **not** apply the AS guards. Concretely, in the port the ring will currently draw on a dazed, dead, or walking red dudie if the cursor is over it — the AS source never sets `_visible = true` in those states. It will also keep drawing across a hit if the cursor stays over the dudie (because `hovered` is recomputed every move and `selected` was never tied to hit events).

Changes required (all under `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/src/`):

1. `main.ts` (around lines 345–385, the `drawWorld` per-dudie loop): gate the hover term with the AS `mouseover()` guard. Change
   ```ts
   const isHover = hovered === d || dragging === d;
   ...
   selected: !!d.selected || (d.team === "red" && isHover),
   ```
   so that the `isHover` contribution is suppressed when `d.dead`, `d.walking`, or `(d.dazed ?? 0) > 0` — i.e. faithful to `RedSnowDudie.as:93–96`. The `dragging === d` branch already implies the dudie passed `onchosen`'s identical guard at construction time, so it can stay, but it should also drop to `false` once the dudie becomes dazed/dead mid-drag.

2. `main.ts` `pickRedAt` (lines 147–163): already filters `d.dead`. Add `d.walking` and `(d.dazed ?? 0) > 0` filters so that `hovered` itself is never set to a non-eligible dudie — this matches the spirit of `mouseover()` not flipping `_visible` on those states. (Either fix is sufficient; doing both keeps the renderer dumb.)

3. `main.ts` `onPress` (line 218): the `target.selected = true` line is fine as a port-level "drag is live" hint, but it must be cleared on hit. Add a hit-clear: when the dragged dudie's `dazed` becomes > 0 or `dead` becomes true (i.e. AS `yougothit` line 69), clear `dragging` and `dragging.selected` so the ring vanishes. Today this only happens on `onRelease`.

4. `main.ts` `onMove` (line 188): `hovered` is recomputed on `mousemove`, which gives correct hide-on-rollout behaviour as long as the cursor leaves the hit-box. No change required, but note that AS line 101 unconditionally hides on rollout — the current port already achieves this through `hovered = null` when `pickRedAt` returns null.

5. `core/Player.ts` (lines 175–191): `mouseover()` already encodes the guard correctly and `mouserollout()` is a no-op (selection circle is renderer concern). When `main.ts` is rewired to call `Player.mouseover()` rather than synthesising visibility from `hovered`/`selected`, the guards will be applied automatically. Wiring those calls into the input path is the cleanest fix.

6. `render/Renderer.ts` (lines 18, 299–309): no change to the draw call itself — it correctly draws iff `state.selected` is true. The line-18 comment refers to "chid 6" (the inner bitmap) which matches the manifest entry; the gate variable name remains `selected`. If desired, document that the gate must be the AS predicate `mouseover guard && cursor is over dudie && not yet hit since enter`.

### Out of scope / unknown

- Whether the `mouserollout` line-101 unconditional hide has any visible difference from a guard-then-hide ordering in the port: in practice, since the port re-derives visibility each frame from `hovered`, the ordering is irrelevant once hover-eligibility is gated.
- The exact `dragdudie` plumbing: AS keeps the ring on during a drag because the cursor remains over the dudie (so `mouseover` was the last write). The port's `dragging === d` branch is a faithful proxy, provided it is cleared on hit (item 3).
