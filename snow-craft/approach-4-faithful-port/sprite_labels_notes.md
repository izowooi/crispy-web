# Sprite Frame Label Mapping Notes

## Source of truth

All ranges below are derived **exactly** from the SWF binary by reading
`decompiled/dump.txt` and tracing PlaceObject2 / ShowFrame / FrameLabel /
RemoveObject2 tags inside each DefineSprite. Frame numbers are 1-based to
match Flash convention (the first ShowFrame in a sprite is "frame 1").

A FrameLabel tag in SWF applies to the **next** frame produced by the
following ShowFrame. The `last` of each label is `(first of next label) - 1`,
or the sprite's last frame for the final label.

The SWF being analyzed:
`/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle/snowcraft.swf`

---

## DefineSprite_32 ("reddudie") - 36 frames total

Header byte count: `24 00` = 36 frames. Confirmed by counting 36 ShowFrames
in the trace.

| Label    | first | last | Notes                                                                 |
|----------|-------|------|-----------------------------------------------------------------------|
| rest     | 1     | 1    | Idle pose. Hides "meter" via DoAction.                                |
| ready    | 2     | 2    | Aim/charge pose. Shows charge meter (chid 20 placed).                 |
| cock     | 3     | 3    | Wind-up pose (chid 21).                                               |
| toss     | 4     | 4    | Throw release (chid 22). AS spawns the snowball after this.           |
| hitdazed | 5     | 6    | Two frames of being struck (chid 23). Loops into `dazed`.             |
| dazed    | 7     | 15   | Stunned animation (chids 24, 25, 26). DoAction at f15 jumps to dazed. |
| dead     | 16    | 23   | Death animation (chids 23, 27, 28, 29). 8 frames.                     |
| walk     | 24    | 36   | Walk cycle (chids 30, 31). DoAction at f26 calls gotoAndPlay(walk).   |

Tag-by-tag derivation (key tags):

```
Tag  2: FrameLabel "rest"     -> next ShowFrame is frame 1
Tag  8: ShowFrame  -> frame 1  (rest)
Tag 11: FrameLabel "ready"
Tag 13: ShowFrame  -> frame 2  (ready)
Tag 16: FrameLabel "cock"
Tag 18: ShowFrame  -> frame 3  (cock)
Tag 21: FrameLabel "toss"
Tag 23: ShowFrame  -> frame 4  (toss)
Tag 26: FrameLabel "hitdazed"
Tag 28: ShowFrame  -> frame 5  (hitdazed)
Tag 29: ShowFrame  -> frame 6  (still hitdazed)
Tag 32: FrameLabel "dazed"
Tag 34: ShowFrame  -> frame 7  (dazed)
... 8 ShowFrames through tag 47 -> frame 15 (last dazed frame, jumps back)
Tag 50: FrameLabel "dead"
Tag 52: ShowFrame  -> frame 16 (dead)
... 7 more ShowFrames through tag 68 -> frame 23 (last dead frame)
Tag 71: FrameLabel "walk"
Tag 73: ShowFrame  -> frame 24 (walk)
... 12 more ShowFrames through tag 90 -> frame 36 (last walk frame)
```

---

## DefineSprite_69 ("greendudie") - 98 frames total

Header byte count: `62 00` = 98 frames. Confirmed by counting 98 ShowFrames.

| Label      | first | last | Notes                                                                     |
|------------|-------|------|---------------------------------------------------------------------------|
| walk       | 1     | 6    | Walk cycle entry (chids 51, 52). DoAction at f6 calls gotoAndPlay(walk).  |
| ready      | 7     | 7    | Targeting/aim pose (chid 53).                                             |
| balling    | 8     | 8    | Forming snowball (chid 54). AS-only state, distinct from cock.            |
| cock       | 9     | 9    | Wind-up (chid 55).                                                        |
| toss       | 10    | 10   | Throw release (chid 56). DoAction sets justhit=true.                      |
| hit        | 11    | 16   | Got hit (chids 57, 58). 6 frames.                                         |
| midrecover | 17    | 32   | Recovery from being hit (chid 59). 16 frames; falls into `down` if KO'd.  |
| down       | 33    | 57   | Knocked down on the ground (chids 60, 61). 25 frames; long lying-down.    |
| dead       | 58    | 64   | Death cinematic (chids 60, 62, 63, 64, 65). 7 frames.                     |
| yea        | 65    | 73   | Victory cheer build-up (chid 66). 9 frames.                               |
| yealoop    | 74    | 98   | Looped victory dance (chids 67, 68). DoAction at f98 calls gotoAndPlay.   |

The labels listed in `spec/ai.md` ("balling, cock, toss, down, dead, walk,
hit") are all present. We additionally found `ready`, `midrecover`, `yea`,
and `yealoop` in the timeline; these are referenced internally by the green
sprite's own AS via `gotoAndPlay("midrecover")` and `gotoAndPlay("yealoop")`.

Tag-by-tag derivation (key tags):

```
Tag   1: FrameLabel "walk"      -> frame 1
Tag   4: ShowFrame   -> frame 1
Tag   6: ShowFrame   -> frame 3
Tag  12: ShowFrame   -> frame 6
Tag  15: FrameLabel "ready"
Tag  17: ShowFrame   -> frame 7  (ready)
Tag  20: FrameLabel "balling"
Tag  22: ShowFrame   -> frame 8  (balling)
Tag  25: FrameLabel "cock"
Tag  27: ShowFrame   -> frame 9  (cock)
Tag  30: FrameLabel "toss"
Tag  32: ShowFrame   -> frame 10 (toss)
Tag  35: FrameLabel "hit"
Tag  37: ShowFrame   -> frame 11 (hit)
... through tag 44 ShowFrame -> frame 16
Tag  46: FrameLabel "midrecover"
Tag  47: ShowFrame   -> frame 17 (midrecover)
... through tag 65 ShowFrame -> frame 32
Tag  68: FrameLabel "down"
Tag  70: ShowFrame   -> frame 33 (down)
... through tag 99 ShowFrame -> frame 57
Tag 102: FrameLabel "dead"
Tag 105: ShowFrame   -> frame 58 (dead)
... through tag 121 ShowFrame -> frame 64
Tag 123: FrameLabel "yea"
Tag 126: ShowFrame   -> frame 65 (yea)
... through tag 136 ShowFrame -> frame 73
Tag 138: FrameLabel "yealoop"
Tag 140: ShowFrame   -> frame 74 (yealoop)
... through tag 171 ShowFrame -> frame 98
```

---

## Mapping cross-check vs gameplay states

`spec/player.md` and `spec/ai.md` reference these `gotoAndPlay(label)`
targets. All are present:

Red dudie expected: `ready, cock, toss, hitdazed, dead, walk` -> all found.
                    Bonus: `rest` (initial idle) and `dazed` (loop after hit).

Green dudie expected: `balling, cock, toss, down, dead, walk, hit` -> all found.
                      Bonus: `ready, midrecover, yea, yealoop` (internal flow).

No fallback / visual-inspection inference was needed; every label has an
exact byte-level FrameLabel tag in the SWF.
