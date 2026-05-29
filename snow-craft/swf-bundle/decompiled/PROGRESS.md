# SWF Decompilation Progress

## Source
- SWF: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle/snowcraft.swf` (441,752 bytes)
- Tool: ffdec (JPEXS Free Flash Decompiler) v.26.2.1
- ffdec-cli wrapper: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec-cli`
- Date: 2026-05-29

## Output Directory
`/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/decompiled/`

## Counts per Kind

| Kind    | Count | Path                                                                                          |
|---------|-------|-----------------------------------------------------------------------------------------------|
| scripts | 68    | `decompiled/scripts/` (all `.as` files - real ActionScript, no `.pcode` retry needed)         |
| images  | 10    | `decompiled/images/`                                                                          |
| sounds  | 14    | `decompiled/sounds/`                                                                          |
| shapes  | 17    | `decompiled/shapes/`                                                                          |
| sprites | 1021  | `decompiled/sprites/`                                                                         |
| frames  | 5     | `decompiled/frames/`                                                                          |
| dump    | 1868 lines | `decompiled/dump.txt` (full SWF tag dump)                                                |

## Commands Run (all succeeded on first attempt)

All exports succeeded with default flags. The `-format script:as` retry was NOT
needed because the default export already produced `.as` files (68 of 68).

```
ffdec-cli -export script  decompiled/scripts  snowcraft.swf  -> 68 .as files
ffdec-cli -export image   decompiled/images   snowcraft.swf  -> 10 image files
ffdec-cli -export sound   decompiled/sounds   snowcraft.swf  -> 14 sound files
ffdec-cli -export shape   decompiled/shapes   snowcraft.swf  -> 17 shape files
ffdec-cli -export sprite  decompiled/sprites  snowcraft.swf  -> 1021 sprite files
ffdec-cli -export frame   decompiled/frames   snowcraft.swf  -> 5 frame files
ffdec-cli -dumpSWF        snowcraft.swf > decompiled/dump.txt
```

No failures encountered.

## ActionScript Class Structure (Key Finding)

Decompilation produced fully readable AS2 source. Classes located under
`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/`:

- `AGame.as`            - base game class
- `ASnowDudie.as`       - base snow-character class
- `GreenSnowDudie.as`   - green (enemy) character
- `RedSnowDudie.as`     - red (player) character
- `SnowBall.as`         - snowball projectile
- `Snowcraft1Rewrite.as` - main game controller (extends `AGame`)

Plus per-frame `DoAction.as` scripts under `frame_1/`, `frame_2/`, `frame_5/`,
and per-sprite frame scripts under `DefineSprite_19`, `DefineSprite_32_reddudie`,
`DefineSprite_48_snowballshadow`, `DefineSprite_69_greendudie`,
`DefineSprite_85`, `DefineSprite_110`.

## Sample .as File (readable, real ActionScript)

`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as` (lines 1-40):

```actionscript
class com.iconnicholson.onehammer.Snowcraft1Rewrite extends com.iconnicholson.onehammer.AGame
{
   var adudies;
   var greendudiestartingpoints;
   var lev;
   var shiftdown;
   var snowballs;
   var sounds;
   var stage;
   var starttime;
   var titles;
   var gameover = false;
   var reddudie1startx = 450;
   var reddudie1starty = 200;
   var reddudie2startx = 420;
   var reddudie2starty = 260;
   var reddudie3startx = 310;
   var reddudie3starty = 250;
   var slomo = 0;
   var score = 0;
   function Snowcraft1Rewrite(floop, stage, titles, sounds)
   {
      super(floop);
      this.sounds = sounds;
      this.stage = stage;
      this.titles = titles;
      _root.comiter = _root.comiter + 1;
      this.snowballs = new Array();
      this.adudies = new Array();
      var _loc5_ = new Object();
      var me = this;
      _loc5_.onKeyDown = function()
      {
         me.keydown(Key.getCode());
      };
      _loc5_.onKeyUp = function()
      {
         me.keyup(Key.getCode());
      };
      Key.addListener(_loc5_);
      ...
   }
}
```

Verified: this is real high-level ActionScript (AS2) source, not bytecode/p-code.

## Status
OK - decompilation complete. At least one `.as` file with readable AS code
is present (68 in total, including all 6 OOP classes under `__Packages/`).
