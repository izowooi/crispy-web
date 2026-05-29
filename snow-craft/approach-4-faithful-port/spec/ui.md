# Snowcraft — UI / HUD / Menus Spec (Faithful Port)

This spec is derived strictly from the decompiled SWF under
`approach-4-faithful-port/decompiled/`. All file references are relative to
`approach-4-faithful-port/decompiled/scripts/scripts/` unless otherwise noted.
Citations use the form `<file>:<line>`.

## Source map (UI-relevant)

| Logical role             | SWF object        | Decompiled path                                                              |
|--------------------------|-------------------|------------------------------------------------------------------------------|
| Main timeline frame 1    | _root frame 1     | `frame_1/DoAction.as`                                                        |
| Main timeline frame 2    | _root frame 2 (domain check) | `frame_2/DoAction.as`                                              |
| Main timeline frame 5    | _root frame 5 (game bootstrap) | `frame_5/DoAction.as`                                            |
| Game controller class    | `Snowcraft1Rewrite` | `__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as`              |
| Base game (frameloop)    | `AGame`           | `__Packages/com/iconnicholson/onehammer/AGame.as`                            |
| Player character class   | `RedSnowDudie`    | `__Packages/com/iconnicholson/onehammer/RedSnowDudie.as`                     |
| Enemy character class    | `GreenSnowDudie`  | `__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as`                   |
| Snowball                 | `SnowBall`        | `__Packages/com/iconnicholson/onehammer/SnowBall.as`                         |
| **`titles` HUD sprite**  | `DefineSprite_110` | `DefineSprite_110/frame_*/DoAction.as`                                      |
| Sounds sprite (audio cues) | `DefineSprite_85` | `DefineSprite_85/frame_*/DoAction.as`                                      |
| Red dudie movieclip      | `DefineSprite_32_reddudie` | `DefineSprite_32_reddudie/frame_*/DoAction.as`                      |
| Green dudie movieclip    | `DefineSprite_69_greendudie` | `DefineSprite_69_greendudie/frame_*/DoAction.as`                  |
| Power meter movieclip    | `DefineSprite_19` | (only `frame_15/DoAction.as: stop()`)                                       |

---

## 1. Stage / lifecycle EXACT constants

Cited from `Snowcraft1Rewrite.as` and frame scripts:

| Constant                 | Value      | Source                                                  |
|--------------------------|------------|---------------------------------------------------------|
| `_root.comiter` (init)   | `19200`    | `frame_1/DoAction.as:5`                                 |
| `_root.grounditer` (init)| `1200`     | `frame_1/DoAction.as:6`                                 |
| Score init               | `0`        | `Snowcraft1Rewrite.as:20` (`var score = 0;`) and `:449` (`reset`) |
| `gameover` init          | `false`    | `Snowcraft1Rewrite.as:12,448`                           |
| Reddudie 1 start         | `(450,200)` walk-end; spawn at `(650,300)` | `Snowcraft1Rewrite.as:13–14, 245–247` |
| Reddudie 2 start         | `(420,260)` walk-end; spawn at `(620,360)` | `Snowcraft1Rewrite.as:15–16, 251–253` |
| Reddudie 3 start         | `(310,250)` walk-end; spawn at `(510,350)` | `Snowcraft1Rewrite.as:17–18, 257–259` |
| Time-bonus threshold     | `1800000` ms (30 min)| `Snowcraft1Rewrite.as:416`                    |
| Time-bonus formula       | `score += round((1800000 - elapsedMs)/1000)` (only if win and `<1800000`) | `Snowcraft1Rewrite.as:418` |
| Per-kill score           | `+10` (only red→green hits) | `Snowcraft1Rewrite.as:369`              |
| Total levels             | `greendudiestartingpoints.length` (= **9**: indices 0..8 populated) | `Snowcraft1Rewrite.as:41–210, 309` |
| Bonus-round level number | `9`         | `DefineSprite_110/frame_74/DoAction.as:3`              |
| Walk speed (default)     | `5`        | `ASnowDudie.as:11`                                      |
| Walk speed (lev 5 / >6)  | `10`       | `Snowcraft1Rewrite.as:273–276`                          |
| Walk speed (lev 6)       | `15`       | `Snowcraft1Rewrite.as:277–280`                          |
| Red HP (player)          | `2`        | `RedSnowDudie.as:13` (`hitpoints = 2`)                  |
| Red dazed frames         | `40`       | `RedSnowDudie.as:74` (`this.dazed = 40`)                |
| Green HP                 | `3`        | `GreenSnowDudie.as:15`                                  |
| Frame rate (FPS)         | **Not present in any decompiled .as** — see *Unknown* §10 |

NOTE: There is no explicit `setInterval` or `Stage.frameRate` write in any
decompiled action. The simulation runs on `MovieClip.onEnterFrame`
(`AGame.as:7` `floop.onEnterFrame = this.floopenterframe;`), which is driven
by the SWF header FrameRate. The header value isn't present in `dump.txt`
(it begins after the header), so the assumed FPS is documented as **unknown**.

---

## 2. UI screen flow and frame labels

The full UI lives inside one MovieClip, **`titles`** = `DefineSprite_110`,
placed on `_root` at depth 9: `dump.txt:1828`.

`DefineSprite_110` framelabels (cited from `dump.txt`):

| Label              | Frame # | dump.txt line  |
|--------------------|---------|----------------|
| (frame 1 – hidden idle) | 1   | `DefineSprite_110/frame_1/DoAction.as:1-2` (`stop(); this._visible = false;`) |
| `seasonsgreetings` | 5       | `dump.txt:1072`                                  |
| `levelx`           | 149     | `dump.txt:1216`                                  |
| `gameoverlose`     | 297     | `dump.txt:1364`                                  |
| `gameoverwin`      | 516     | `dump.txt:1583`                                  |
| `credits`          | 706     | `dump.txt:1773`                                  |
| `error`            | 756     | `dump.txt:1823`                                  |

Stop frames inside `titles` (where the playhead halts after each animation):

- frame 73 — `gotoAndStop(1);` (after `seasonsgreetings` plays out) — `DefineSprite_110/frame_73/DoAction.as`
- frame 165 — `gotoAndStop(1);` (after `levelx`) — `DefineSprite_110/frame_165/DoAction.as`
- frame 270 — `stop();` (idle on `gameoverlose` final pose) — `DefineSprite_110/frame_270/DoAction.as`
- frame 375 — `stop();` (idle on `gameoverwin` final pose) — `DefineSprite_110/frame_375/DoAction.as`
- frame 420 — `stop();` (after `credits`) — `DefineSprite_110/frame_420/DoAction.as`
- frame 422 — `stop();` (after `error`, with `trace("wtffff")`) — `DefineSprite_110/frame_422/DoAction.as`

Frames 2, 166, 271 are simply `this._visible = true; play();` — used as
trampolines when the controller calls `gotoAndPlay()` while the clip is
hidden. (`DefineSprite_110/frame_2/DoAction.as`, `frame_166/DoAction.as`,
`frame_271/DoAction.as`.)

### State diagram (port target)

```
    ┌───────────────────┐  Snowcraft1Rewrite ctor → reset()
    │ titles invisible  │  this.titles._visible = false
    │ frame 1 (stop)    │  (Snowcraft1Rewrite.as:447)
    └────────┬──────────┘
             │ dolevel(1)            (Snowcraft1Rewrite.as:232–234)
             ▼
       seasonsgreetings   ── plays frames 5..72 then frame 73 → goto 1 (stop)
             │
             │ dolevel(N>1)          (Snowcraft1Rewrite.as:236–240)
             ▼
       levelx (sets text "Level N" or "Bonus Round" on frame 74)
             │
             │ all greens dead & lev<9 → dolevel(lev+1)  (Snowcraft1Rewrite.as:307–315)
             │ all greens dead & lev==9 → ongameover(true)
             │ all reds dead          → ongameover()
             ▼
       gameoverwin (frame 516..) — stops at 375
       gameoverlose (frame 297..) — stops at 270
             │
             │ user clicks playagain → me._visible = false; _root.gotoAndPlay(1)
             │ user clicks creditsblock → titles.gotoAndPlay("credits")
             │ user clicks visit → getURL("http://www.iconnicholson.com","_blank")
             ▼
        credits  (frame 706..) — stops at 420
        error    (frame 756..) — stops at 422 (entered only by domain check, frame_2)
```

### Dispatcher: `Snowcraft1Rewrite.dolevel(level)`

```actionscript
// Snowcraft1Rewrite.as:228–283
function dolevel(level)
{
   this.clearbetweenlevels();
   this.lev = level;
   if(level == 1)
   {
      this.titles.gotoAndPlay("seasonsgreetings");
   }
   else
   {
      this.titles.lev = level;
      this.titles.gotoAndPlay("levelx");
   }
   ...
}
```

### Level intro text — `levelx` (frame 74)

```actionscript
// DefineSprite_110/frame_74/DoAction.as
this._visible = true;
if(this.lev == 9)
{
   this.levelx.text = "Bonus Round";
}
else
{
   this.levelfade.levelx.text = "Level " + this.lev;
}
_root.sounds.gotoAndPlay("goodbadugly");
play();
```

Two distinct text sub-clips are used:

- `levelx` direct child = TextField (chid `92`, EditText labelled `"Level 2"`
  in default text — `dump.txt:993`). Used for the **"Bonus Round"** state
  on level 9.
- `levelfade.levelx` — a wrapped text inside `levelfade` (chid `93`, placed
  on `levelx` frame; `dump.txt:1217`). Used for **"Level N"** on every
  non-bonus level.

Asset chain: chid `90` is the `seasonsgreetings` graphic placed on
seasonsgreetings frame: `dump.txt:1074`.

### Game-over screens (lose AND win frames have IDENTICAL handler code)

`DefineSprite_110/frame_253/DoAction.as` (`gameoverlose` handler — runs slightly
before label 297, but fromyour is placed at frame 478 = `dump.txt:1545`; the
DoAction at frame 253/358 is the wiring code that the timeline executes when
the click handlers must be active):

```actionscript
// DefineSprite_110/frame_253/DoAction.as  (and frame_358/DoAction.as is identical)
var me = this;
this.fromyour.scorebox.text = "SCORE: " + this.score;
this.fromyour.playagain.onRelease = function()
{
   me._visible = false;
   _root.gotoAndPlay(1);
};
this.fromyour.visit.onRelease = function()
{
   getURL("http://www.iconnicholson.com", "_blank");
};
this.fromyour.creditsblock.onRelease = function()
{
   _root.titles._visible = true;
   _root.titles.gotoAndPlay("credits");
};
```

Notes (NO guesses — facts only):

- `me._visible = false` HIDES the titles MC, then the **root** timeline
  is restarted via `_root.gotoAndPlay(1)`. The whole game restart goes
  through `frame_5/DoAction.as` again (lines 7–17).
- `frame 290` of `titles` triggers `_root.sounds.gotoAndPlay("halaluja");`
  (the "win" hallelujah cue) — `DefineSprite_110/frame_290/DoAction.as`.
  This frame plays during the gameoverwin animation (290 ∈ [253..516)).

### Game-over wiring — controller side

```actionscript
// Snowcraft1Rewrite.as:410–432
function ongameover(win)
{
   var _loc3_ = new Date();
   var _loc2_ = _loc3_.getTime() - this.starttime.getTime();
   if(win)
   {
      if(_loc2_ < 1800000)
      {
         this.score += Math.round((1800000 - _loc2_) / 1000);
      }
   }
   this.gameover = true;
   this.titles.score = this.score;          // populates the field shown by frame_253/358 logic
   if(win)  this.titles.gotoAndPlay("gameoverwin");
   else     this.titles.gotoAndPlay("gameoverlose");
   var _loc4_ = {target:this,type:"gameover"};
   this.dispatchEvent(_loc4_);
}
```

The score field used by the buttons code is **`this.fromyour.scorebox`** — but
the controller writes `this.titles.score = this.score`. The handler then
does `this.fromyour.scorebox.text = "SCORE: " + this.score;` where `this`
inside that DoAction is the `titles` clip (frame action), so it reads
`titles.score` and writes `titles.fromyour.scorebox.text`.

### Win-condition / lose-condition logic — controller frameloop

```actionscript
// Snowcraft1Rewrite.as:289–353
function frameloop()
{
   // — All green dead? → next level OR overall win
   var _loc9_ = true;
   for each green dudie {
      if(!green.dead) { _loc9_ = false; break; }
   }
   if(_loc9_ && !this.gameover)
   {
      if(this.lev == this.greendudiestartingpoints.length) // == 9
         this.ongameover(true);
      else
         this.dolevel(this.lev + 1);
   }

   // — All red dead? → make remaining greens cheer + ongameover()
   var _loc10_ = true;
   for each red dudie { if(!red.dead) { _loc10_ = false; break; } }
   if(_loc10_ && !this.gameover)
   {
      for each green dudie that is alive: green.gameover();   // → frame "yea"
      this.ongameover();           // no arg ⇒ 'win' is undefined ⇒ lose path
   }
   ...
}
```

`green.gameover()` plays the green-cheers anim:

```actionscript
// GreenSnowDudie.as:68–72
function gameover() {
   this.dead = true;
   this.dudiemc.gotoAndPlay("yea");
}
```

---

## 3. Score / HP HUD display

There is **no in-game score readout** and **no HP bar** in the decompiled
sources. The score is only displayed at game-over, inside the
`titles.fromyour.scorebox` edit-text field
(`DefineSprite_110/frame_253/DoAction.as:2`,
`DefineSprite_110/frame_358/DoAction.as:2`).

### Per-character HP (internal state, not rendered as a bar)

| Character | HP | Reaction code | Source |
|-----------|----|---------------|--------|
| Red (player) | 2 | hp==1 → dazed=40, anim "hitdazed", play "hit1" + "birds"; hp==0 → dead, anim "dead", play random "kids1/2/3" | `RedSnowDudie.as:71-89` |
| Green (enemy) | 3 | hp==2 → "hit" + sound "hit1"; hp==1 → "down" + sound "hit1"; hp==0 → "dead" + random "kids1/2/3" | `GreenSnowDudie.as:43-66` |

Visible feedback is purely via dudie animation states (`hit`, `dazed`,
`down`, `dead`) — see `DefineSprite_32_reddudie/frame_*/DoAction.as` and
`DefineSprite_69_greendudie/frame_*/DoAction.as`.

### Score updates during play

```actionscript
// Snowcraft1Rewrite.as:366-371 (collision handler inside frameloop)
if(_loc2_.team == "red"
   && Math.abs(_loc2_.ballmc._x - _loc4_.dudiemc._x) < 30
   && Math.abs(_loc2_.ballmc._y - (_loc4_.dudiemc._y - 20)) < 30
   && !_loc4_.dead && !_loc4_.down && !_loc2_.dead && !_loc2_.ineffective)
{
   _loc2_.dead = true;
   this.score += 10;
   _loc4_.yougothit();
}
```

Hit-box: AABB ±30 px in x, ±30 px in y (centred on green's
`(dudiemc._x, dudiemc._y - 20)`).
Score increment: **+10 per red-on-green hit only** (no points for
green-on-red — `Snowcraft1Rewrite.as:373-381`).

---

## 4. Power meter (player only)

Per-red-dudie meter shown only while the player has selected that dudie.

```actionscript
// DefineSprite_32_reddudie/frame_3/DoAction.as
meter.gotoAndPlay(1);
meter._visible = true;
stop();
```

Frame 3 corresponds to label `"cock"` (= start of throw windup). Meter
becomes invisible again on every other state script (`frame_1`, `frame_2`,
`frame_4`, `frame_7`, `frame_15`, `frame_16`):

```
meter._visible = false;
```

The meter clip is `DefineSprite_19`, placed in `reddudie` at depth 13 with
nm `"meter"` (`dump.txt:142`).

### Throw force formula (read from the meter playhead at release)

```actionscript
// RedSnowDudie.as:108-118
function throwball()
{
   var _loc2_ = 0.001;
   trace(this.dudiemc.meter._currentframe);
   if(this.dudiemc.meter._currentframe > 4)
   {
      _loc2_ = this.dudiemc.meter._currentframe / 15;
   }
   var _loc3_ = {target:this, type:"throwball",
                 force:_loc2_, team:this.team,
                 x:this.dudiemc._x, y:this.dudiemc._y - 35,
                 ineffective:_loc2_ < 0.1};
   this.dispatchEvent(_loc3_);
}
```

Constants:

| Constant                    | Value | Source                       |
|-----------------------------|-------|------------------------------|
| Force when meter ≤ 4        | `0.001` | `RedSnowDudie.as:110`     |
| Force divisor (else)        | `frame / 15` | `RedSnowDudie.as:114`|
| `ineffective` threshold     | `force < 0.1` | `RedSnowDudie.as:116`|
| Throw spawn offset          | `y - 35` | `RedSnowDudie.as:116`     |
| `longthrow` sound threshold | `force >= 1` | `SnowBall.as:53–60`   |

---

## 5. Mouse / button click handlers — exhaustive list

### 5.1 In-game character selection (mouse-down on a red dudie)

```actionscript
// RedSnowDudie.as:26-30 (constructor wiring)
this.dudiemc.onPress    = this.redpress;     // → onchosen()
this.dudiemc.onRelease  = this.redrelease;   // → mouserelease() = throw
this.dudiemc.onRollOver = this.redrollover;  // → mouseover()
this.dudiemc.onRollOut  = this.redrollout;   // → mouserollout()
```

```actionscript
// RedSnowDudie.as:49-65
function onchosen()
{
   if(this.dudiemc.dazed || this.dead || this.walking) return undefined;
   this.adobesucksmouseisdownflag = true;
   if(this.dudiemc.getDepth() < highestreddudie.getDepth())
       this.dudiemc.swapDepths(highestreddudie);
   highestreddudie = this.dudiemc;
   var _loc2_ = {target:this,type:"chosen"};
   this.dispatchEvent(_loc2_);
   this.dragdudie = true;
   this.dudiemc.gotoAndPlay("cock");        // starts windup → meter visible
}
```

```actionscript
// RedSnowDudie.as:91-107
function mouseover()  { ... selectioncircle._visible = true; }
function mouserollout() { ... selectioncircle._visible = false;
                          this.dudiemc.gotoAndStop("ready"); }

// RedSnowDudie.as:119-129
function mouserelease()
{
   this.adobesucksmouseisdownflag = false;
   this.dragdudie = false;
   if(this.dudiemc.dazed || this.dead || this.walking) return undefined;
   this.throwball();
   this.dudiemc.gotoAndStop("toss");
}
```

While `dragdudie && adobesucksmouseisdownflag` the red dudie is
dragged with the cursor, **clamped** to the line `(592,0)–(0,320)`:

```actionscript
// RedSnowDudie.as:175-182
if(this.adobesucksmouseisdownflag && this.dragdudie)
{
   this.dudiemc._x = this.stage._xmouse;
   this.dudiemc._y = this.stage._ymouse;
   _loc2_ = this.checkline(592,0, 0,320, this.dudiemc._x, this.dudiemc._y, 1);
   this.dudiemc._x = _loc2_[0];
   this.dudiemc._y = _loc2_[1];
}
```

(Greens have boundary line `(610,0)–(0,340)` — `GreenSnowDudie.as:32`.)

### 5.2 Game-over screen buttons

Inside `titles.fromyour` (a child clip = chid `107` placed at depth `158`,
named `"fromyour"` — `dump.txt:1545`). The buttons are direct children of
`fromyour`:

| Button          | Type / chid           | onRelease behaviour                                                       | Source |
|-----------------|-----------------------|---------------------------------------------------------------------------|--------|
| `playagain`     | `DefineButton2` chid `106` | `me._visible = false; _root.gotoAndPlay(1);`                          | `frame_253/DoAction.as:5-9`, `frame_358/DoAction.as:5-9` |
| `visit`         | (button — see §10)    | `getURL("http://www.iconnicholson.com", "_blank");`                       | `frame_253/DoAction.as:10-13`, `frame_358/DoAction.as:10-13` |
| `creditsblock`  | `DefineButton2` chid `102` | `_root.titles._visible = true; _root.titles.gotoAndPlay("credits");`  | `frame_253/DoAction.as:14-18`, `frame_358/DoAction.as:14-18` |

`fromyour` sub-clip (`chid 107`) places exactly these as named children on
its single frame:

```
PlaceObject2 (chid: 97,  dpt: 1, nm: "scorebox")     -- dump.txt:1028
PlaceObject2 (chid: 102, dpt: 2, nm: "creditsblock") -- dump.txt:1029
PlaceObject2 (chid: 106, dpt: 5, nm: "playagain")    -- dump.txt:1030
```

There is no `visit` placed under `fromyour` in `dump.txt`. It is referenced
only in code (`frame_253` / `frame_358`). See *Unknown* §10.

### 5.3 Hidden / cheat / dev keyboard shortcuts (root level)

Defined on `_root` once in `frame_5/DoAction.as`:

```actionscript
// frame_5/DoAction.as:18-36
var lastkey = "";
var secondfromlastkey = "";
var keyListener = new Object();
keyListener.onKeyDown = function()
{
   if(lastkey == "v" && secondfromlastkey == "l")        // type "l", "v", <digit>
   {
      _root.game.dolevel(Number(chr(Key.getAscii())));
   }
   if(lastkey == "r" && secondfromlastkey == "c")        // type "c", "r", <any>
   {
      _root.titles._visible = true;
      _root.titles.gotoAndPlay("credits");
      _root.titles._visible = true;
   }
   secondfromlastkey = lastkey;
   lastkey = chr(Key.getAscii());
};
Key.addListener(keyListener);
```

Effect: typing **`l v <N>`** jumps to level N (1..9). Typing **`c r ?`**
forces the credits screen open.

### 5.4 In-game key listener (controller class)

Only Shift is read:

```actionscript
// Snowcraft1Rewrite.as:32-40, 214-227
function keydown(k) { if(k == 16) this.shiftdown = true;  }
function keyup(k)   { if(k == 16) this.shiftdown = false; }
```

`this.shiftdown` is set, but is never **read** in any decompiled source —
likely a stub for a slow-mo / future feature. (`var slomo = 0;` is also
declared at `Snowcraft1Rewrite.as:19` and never written/read anywhere
else.) See *Unknown* §10.

---

## 6. Title screen / first run

There is **no separate "press any key to start" title screen** in the
decompiled sources. The flow that the porting team must reproduce is:

1. `_root` reaches frame 5 (last frame of preloader / boot sequence).
2. `frame_5/DoAction.as` immediately constructs a `Snowcraft1Rewrite` and
   calls `dolevel(1)` (`frame_5/DoAction.as:7-17`).
3. `dolevel(1)` plays the **`seasonsgreetings`** intro inside `titles`
   (`Snowcraft1Rewrite.as:232-235`). This serves as the de-facto title
   card.
4. After the seasonsgreetings frames play out, the timeline reaches
   frame 73 → `gotoAndStop(1)` → `_visible = false` (`DefineSprite_110/frame_1/DoAction.as`).

At frame 1 of `titles`, the placement immediately preceding the
`seasonsgreetings` label is the title art — `chid 90` placed at depth 3,
named `"seasonsgreetings"` (`dump.txt:1074`).

Domain check (frame 2 of `_root`) is the only thing that can prevent the
boot path; if the SWF is hosted somewhere outside the whitelist it
forces `titles → "error"` and `stop()` (`frame_2/DoAction.as`).

---

## 7. Asset id reference (UI events ↔ sound cues)

All sounds live in `DefineSprite_85` ("sounds"). UI events trigger them
via `_root.sounds.gotoAndPlay(<label>)`:

| UI / game event                              | Sound label invoked   | Source                                                            |
|---------------------------------------------|-----------------------|-------------------------------------------------------------------|
| Level intro (every level)                   | `goodbadugly`         | `DefineSprite_110/frame_74/DoAction.as:7`                         |
| Game-over WIN reaches frame 290             | `halaluja`            | `DefineSprite_110/frame_290/DoAction.as`                          |
| Red took 1st hit (dazed)                    | `hit1` then `birds`   | `RedSnowDudie.as:77-78`                                           |
| Red killed                                  | `kids1` / `kids2` / `kids3` (random `Math.ceil(rand*3)`) | `RedSnowDudie.as:88` |
| Green hit / down                            | `hit1`                | `GreenSnowDudie.as:49, 55`                                        |
| Green killed                                | `kids1` / `kids2` / `kids3`                              | `GreenSnowDudie.as:65` |
| Walking footstep (red & green)              | `step` (only when sounds idle on frame 1) | `RedSnowDudie.as:150`, `GreenSnowDudie.as:112` |
| Snowball spawn, force ≥ 1                   | `longthrow`           | `SnowBall.as:55`                                                  |
| Snowball spawn, force < 1                   | `throw`               | `SnowBall.as:59`                                                  |
| Snowball lands (red ball only)              | `splat`               | `SnowBall.as:84`                                                  |
| Green winning cheer (`gameover()`)          | `laugh` / `laugh2` (50/50, only if sounds idle and rand<0.5) | `DefineSprite_69_greendudie/frame_98/DoAction.as` |

Sound sprite labels (cited from `dump.txt:579..890`): `step` (3),
`goodbadugly` (14), `throw` (61), `longthrow` (70), `hit1` (95),
`kids1` (109), `kids2` (124), `kids3` (142), `laugh` (166), `splat` (224),
`birds` (235), `halaluja` (268), `laugh2` (314).

### UI element ↔ visual asset id

| UI element                | SWF id                              | Source            |
|---------------------------|-------------------------------------|-------------------|
| `titles` MC               | `DefineSprite (chid: 110)`          | `dump.txt:1066, 1828` |
| `titles → seasonsgreetings` art   | `DefineSprite (chid: 90)`   | `dump.txt:986, 1074` |
| `titles → levelfade` (Level N text wrapper) | `DefineSprite (chid: 93)` | `dump.txt:995, 1217` |
| `levelfade.levelx` editable text  | `DefineEditText (chid: 92)` | `dump.txt:993, 997` |
| `titles → fromyour` (gameover panel) | `DefineSprite (chid: 107)` | `dump.txt:1026, 1545` |
| `fromyour.scorebox` edit text     | `DefineEditText (chid: 97)` | `dump.txt:1028`   |
| `fromyour.creditsblock` button    | `DefineButton2 (chid: 102)` | `dump.txt:1018, 1029` |
| `fromyour.playagain` button       | `DefineButton2 (chid: 106)` | `dump.txt:1025, 1030` |
| Credits "CREDITS" edit text       | `DefineEditText (chid: 101)` | `dump.txt:1016` |
| Credits text glyphs (3 colour variants) | `DefineText (chid: 99/100)` (header) and `(chid: 103/104/105)` (body, colours `cccccc / ff0000 / 999999`) | `dump.txt:1012-1023` |
| Title-screen background placement (chid 89, depth 1) | static graphic | `dump.txt:988`    |
| `meter` (player power meter) inside reddudie | `DefineSprite (chid: 19)` | `dump.txt:142`   |
| `selectioncircle` inside reddudie | `DefineSprite (chid: 8)`    | `dump.txt:140`    |

---

## 8. Pseudocode summary of UI algorithms

### 8.1 Level dispatcher

```
function dolevel(level):
    clearbetweenlevels()                  # destroys all live dudies
    this.lev = level
    if level == 1:
        titles.gotoAndPlay("seasonsgreetings")
    else:
        titles.lev = level
        titles.gotoAndPlay("levelx")
    spawn 3 RedSnowDudies at fixed offsets (450,200), (420,260), (310,250)
       (initial positions are walk-end + (200, 100) — they walk into place)
    for each entry in greendudiestartingpoints[level-1]:
        spawn GreenSnowDudie at entry[0..1], walk-end entry[2..3]
        if level==5 or level>6: green.walkspeed = 10
        if level==6:           green.walkspeed = 15
```

### 8.2 Per-frame UI update (controller frameloop)

```
function frameloop():
    if all greens dead and not gameover:
        if lev == 9: ongameover(true)
        else:        dolevel(lev+1)
    if all reds dead and not gameover:
        for each alive green: green.gameover()    # plays "yea" cheer
        ongameover()                              # win=undefined → lose path
    for each snowball:
        for each dudie:
            if collision (AABB ±30, target offset y-20)
                kill snowball; if red→green: score+=10; target.yougothit()
        if ball off-stage (|x|>2999 or |y|>2999) or dead: enqueue removal
        else: ball.frameloop()
    for each dudie: dudie.frameloop()
    purge enqueued snowballs
```

### 8.3 Game-over UI hand-off

```
function ongameover(win):
    elapsedMs = now - starttime
    if win and elapsedMs < 1_800_000:
        score += round((1_800_000 - elapsedMs) / 1000)
    gameover = true
    titles.score = score
    titles.gotoAndPlay( win ? "gameoverwin" : "gameoverlose" )
    dispatchEvent(type="gameover")

# When the titles MC reaches its DoAction at frame 253 (lose) / 358 (win):
on titles frame 253 / 358:
    fromyour.scorebox.text = "SCORE: " + this.score
    fromyour.playagain.onRelease    = ()=>{ titles._visible=false; _root.gotoAndPlay(1) }
    fromyour.visit.onRelease        = ()=>{ getURL("http://www.iconnicholson.com","_blank") }
    fromyour.creditsblock.onRelease = ()=>{ _root.titles._visible=true; _root.titles.gotoAndPlay("credits") }
```

### 8.4 Reset

```
function reset():
    starttime = new Date()
    titles._visible = false
    gameover = false
    score = 0
```

(Re-entered every time `playagain` is clicked, via `_root.gotoAndPlay(1)`
→ frame 5 → `_root.game.reset(); _root.game.dolevel(1);`
— `frame_5/DoAction.as:13-16`.)

### 8.5 Cheats / debug keys

```
keylog of last two ASCII chars; on every keydown:
    if "lv" then dolevel( Number(chr(currentKey)) )
    if "cr" then titles.gotoAndPlay("credits")
shift (key 16) toggles shiftdown — currently unused.
```

---

## 9. Button-position pixel coordinates

Pixel positions for buttons must be read from `PlaceObject2` matrices in
`dump.txt`. The relevant matrix bytes are recorded but **must be decoded
from the SWF MATRIX format** (twips, 1/20 px). The dump tool does not
emit decoded translation values, so the porting team should either:

- Re-extract the matrices with a SWF-aware tool (ffdec GUI shows them in
  px), or
- Use the visual placement of `chid 107` (fromyour) at depth 158 via JPEXS
  and read out scorebox/creditsblock/playagain offsets from the SWF.

The raw matrix bytes (preserved verbatim from `dump.txt`):

```
fromyour      : 3e 9e 00 6b 00 19 51 1d da 69 00 40 10 00 00 fc 00  (dump.txt:1545)
scorebox      : 26 01 00 61 00 1a aa a6 d0 80                       (dump.txt:1028)
creditsblock  : 26 02 00 66 00 1b 71 26 bc 80                       (dump.txt:1029)
playagain     : 26 05 00 6a 00 1c f6 49 af 20                       (dump.txt:1030)
levelx (top)  : 26 01 00 5c 00 0e a1 40                              (dump.txt:997)
levelfade     : 3e 03 00 5d 00 16 a9 c0 c8 69 00 40 10 00 00 49 00  (dump.txt:1217)
seasonsgreetings : 3e 03 00 5a 00 00 69 00 40 10 00 00 01 00       (dump.txt:1074)
titles (root) : 26 09 00 6e 00 c8 fc 37 40 00 0d 77 f2 bb c0       (dump.txt:1828)
```

Numeric (twip-decoded) coordinates are not present in any decompiled
`.as` file and therefore are not asserted in this spec — see *Unknown*.

---

## 10. Unknown / ambiguous

The following items COULD NOT be determined from `decompiled/` alone:

1. **SWF FrameRate (FPS).** The SWF header is not in `dump.txt` (which
   starts at offset `0x15` after the header was already consumed by the
   dump tool). All time-based game logic
   (`adobefrozenframebugfix=50`, `dazed=40`, walk speeds, etc.) is in
   frame ticks — meaning the port *must* match whatever FPS the SWF
   declares. Re-run `ffdec -info snowcraft.swf` (or any `swfdump`) to
   read it.
2. **Pixel offsets for HUD buttons.** Matrix translations are in raw
   twip-encoded bytes only (see §9). Need ffdec GUI / SWF MATRIX decoder.
3. **`visit` button** in the gameover screen is referenced by code
   (`frame_253/DoAction.as:10`, `frame_358/DoAction.as:10`) but **NOT**
   placed inside `fromyour` (chid 107) per `dump.txt`. Possibilities:
   (a) it is added at runtime by code we haven't found, (b) it lives in
   another sprite layered over `fromyour` (no clear candidate visible
   in the dump), or (c) it's a leftover / dead handler. Visual
   inspection of the SWF in JPEXS will resolve this.
4. **`shiftdown` purpose.** `Snowcraft1Rewrite` tracks Shift but never
   reads it (`Snowcraft1Rewrite.as:218-226`). Likely a slow-mo toggle
   wired to `var slomo = 0;` (declared `:19`, never read). Skip in port
   unless verifying against a live build.
5. **`error`-screen text content.** Frame 756 of `titles` is reached only
   from `frame_2/DoAction.as` when the host domain is not whitelisted.
   The visible text is in shape/edit-text tags after that label, not in
   `.as`. Decode from JPEXS if needed.
6. **Credits screen text.** Same as above — text glyphs are at
   `chid 99/100/103/104/105` (`dump.txt:1012-1023`); decoded text is
   stored as glyph indices, not strings, and is not present in any
   `.as` file.
7. **`titles` frame 422 (`error`-block stop)** logs `"wtffff"`
   (`DefineSprite_110/frame_422/DoAction.as:1`). Pure dev artefact, but
   the `stop();` after it IS load-bearing for the error screen.
8. **Score field formatting.** Code writes literal string
   `"SCORE: " + this.score` (no zero-pad / locale) — confirmed
   `frame_253/DoAction.as:2` and `frame_358/DoAction.as:2`. Ports should
   replicate exactly.

---

## 11. Implementation checklist for the port

- [ ] One persistent `titles` UIView with the 6 named states:
      `seasonsgreetings`, `levelx`, `gameoverlose`, `gameoverwin`,
      `credits`, `error`. Each must support `gotoAndPlay(label)` and
      auto-stop at the correct frame (1 / 1 / 270 / 375 / 420 / 422).
- [ ] On `dolevel(1)` call, play `seasonsgreetings`; on every other
      level, play `levelx`, with text "Level N" (or "Bonus Round" if
      level == 9). Trigger sound `goodbadugly` when `levelx` opens.
- [ ] Game-over panel (`fromyour`) with three buttons:
      `playagain`, `visit`, `creditsblock`, plus a `scorebox` text
      field. Click handlers per §5.2.
- [ ] Score-only display at game-over (no in-game scoreboard, no HP
      bars; HP is internal, surfaced through dudie animations).
- [ ] Per-red-dudie power meter shown only while in "cock" state
      (`DefineSprite_32_reddudie` frame_3); hidden in every other
      reddudie state script.
- [ ] Mouse drag-and-throw on red dudies with the `(592,0)–(0,320)`
      boundary clamp (`RedSnowDudie.as:179`).
- [ ] Hidden cheat keys `l v <N>` (jump level) and `c r ?` (credits).
- [ ] `ongameover(true)` adds time bonus when elapsed < 30 min.
- [ ] Restart via `playagain` ⇒ root timeline `gotoAndPlay(1)` ⇒
      `_root.game.reset(); _root.game.dolevel(1);`.
