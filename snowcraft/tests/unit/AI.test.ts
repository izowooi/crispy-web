// Vitest unit tests for the Green AI (CPU enemy).
// Faithful port of GreenSnowDudie.frameloop from
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as
// Spec: snow-craft/approach-4-faithful-port/spec/ai.md
//
// All tests cite source line numbers in inline comments as required by the
// faithful-port TDD workflow.

import { describe, it, expect, beforeEach } from "vitest";
import {
  createGreenAI,
  tickGreen,
  greenYouGotHit,
  greenStartWalk,
  randomDestinationWithinBoundaries,
  checkline,
  greenThrowForce,
  GREEN_THROW_OFFSET_Y,
  GREEN_BALL_VELOCITY,
  RED_BALL_VELOCITY,
  ARRIVAL_THRESHOLD,
  GREEN_HP,
  ADOBE_FROZEN_FRAME_BUGFIX_FRAMES,
  GREEN_DOWN_RECOVERY_FRAMES,
  TITLE_MARCH_WALKSPEED,
  DEFAULT_WALKSPEED,
  GREEN_BOUNDARY_LINE,
  type GreenAI,
  type TickContext,
} from "../../src/core/AI";

// ---------- helpers ----------

/** Sequenced random source for deterministic tests. */
function seqRandom(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) {
      throw new Error(`seqRandom exhausted at index ${i}`);
    }
    return values[i++];
  };
}

function ctx(over: Partial<TickContext> = {}): TickContext {
  return {
    titlesVisible: false,
    soundsCurrentFrame: 1,
    rand: seqRandom([]),
    onPose: () => {},
    onPlaySound: () => {},
    onThrow: () => {},
    ...over,
  };
}

// ---------- constants ----------

describe("AI constants", () => {
  it("green starts with 3 HP", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:15
    expect(GREEN_HP).toBe(3);
  });

  it("just-hit freeze is 50 frames (adobefrozenframebugfix)", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:47
    expect(ADOBE_FROZEN_FRAME_BUGFIX_FRAMES).toBe(50);
  });

  it("down recovery lasts through the down + midrecover sprite span", () => {
    // DefineSprite_69: down frames 33..57, then midrecover frames 17..31.
    expect(GREEN_DOWN_RECOVERY_FRAMES).toBe(40);
  });

  it("default walkspeed inherited from ASnowDudie is 5", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as:11
    expect(DEFAULT_WALKSPEED).toBe(5);
  });

  it("title-march walkspeed is 3", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:100
    expect(TITLE_MARCH_WALKSPEED).toBe(3);
  });

  it("arrival threshold is 10 px on each axis", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:95
    expect(ARRIVAL_THRESHOLD).toBe(10);
  });

  it("green throw origin Y offset is dudie._y - 15", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:163
    expect(GREEN_THROW_OFFSET_Y).toBe(-15);
  });

  it("green ball velocity is (+20, +10) px/frame", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:49-51
    expect(GREEN_BALL_VELOCITY).toEqual({ x: 20, y: 10 });
  });

  it("red ball velocity is (-20, -10) px/frame", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:45-46
    expect(RED_BALL_VELOCITY).toEqual({ x: -20, y: -10 });
  });

  it("green destination clip line is (610,0)->(0,340), keep right (less=0)", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:32
    expect(GREEN_BOUNDARY_LINE).toEqual({
      x1: 610,
      y1: 0,
      x2: 0,
      y2: 340,
      less: 0,
    });
  });
});

// ---------- initial state ----------

describe("createGreenAI initial state", () => {
  it("starts with hp=3, balling=0, cocking=0, walking=false, dead=false, down=false", () => {
    // from GreenSnowDudie.as:12-16 + ASnowDudie.as:9-11
    const ai = createGreenAI({ x: 100, y: 100 });
    expect(ai.hitpoints).toBe(3);
    expect(ai.balling).toBe(0);
    expect(ai.cocking).toBe(0);
    expect(ai.walking).toBe(false);
    expect(ai.dead).toBe(false);
    expect(ai.down).toBe(false);
    expect(ai.downRecoveryFrames).toBe(0);
    expect(ai.justhit).toBe(false);
    expect(ai.adobefrozenframebugfix).toBe(0);
    expect(ai.walkspeed).toBe(5);
    expect(ai.walkendx).toBe(0);
    expect(ai.walkendy).toBe(0);
  });
});

// ---------- decision cascade (A) Dead ----------

describe("frameloop branch (A) — dead", () => {
  it("returns immediately if dead is true; no state changes, no events", () => {
    // from GreenSnowDudie.as:75-78
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.dead = true;
    ai.balling = 7;
    ai.cocking = 4;
    let throws = 0;
    let poses = 0;
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0]),
        onThrow: () => throws++,
        onPose: () => poses++,
      }),
    );
    expect(ai.balling).toBe(7);
    expect(ai.cocking).toBe(4);
    expect(throws).toBe(0);
    expect(poses).toBe(0);
  });
});

// ---------- decision cascade (B) down ----------

describe("frameloop branch (B) — dudiemc.down", () => {
  it("returns immediately while down recovery is still playing", () => {
    // from GreenSnowDudie.as:79-83 + DefineSprite_69 down/midrecover actions.
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.down = true;
    ai.downRecoveryFrames = GREEN_DOWN_RECOVERY_FRAMES;
    ai.balling = 7;
    let throws = 0;
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0]),
        onThrow: () => throws++,
      }),
    );
    expect(ai.balling).toBe(7);
    expect(throws).toBe(0);
    expect(ai.down).toBe(true);
    expect(ai.downRecoveryFrames).toBe(GREEN_DOWN_RECOVERY_FRAMES - 1);
  });

  it("clears down after the recovery timeline completes", () => {
    // In AS, dudiemc.down owns the timeline gate; frame actions clear it after recovery.
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.down = true;
    ai.downRecoveryFrames = 1;

    tickGreen(ai, ctx({ rand: seqRandom([]) }));

    expect(ai.down).toBe(false);
    expect(ai.downRecoveryFrames).toBe(0);
  });
});

// ---------- decision cascade (C) just-hit ----------

describe("frameloop branch (C) — justhit recovery", () => {
  it("decrements adobefrozenframebugfix each tick and clears justhit when negative", () => {
    // from GreenSnowDudie.as:84-92
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.justhit = true;
    ai.adobefrozenframebugfix = 1;

    tickGreen(ai, ctx({ rand: seqRandom([0.0]) }));
    expect(ai.justhit).toBe(true);
    expect(ai.adobefrozenframebugfix).toBe(0);

    tickGreen(ai, ctx({ rand: seqRandom([0.0]) }));
    expect(ai.adobefrozenframebugfix).toBe(-1);
    expect(ai.justhit).toBe(false);
  });

  it("does not move or throw while justhit is true", () => {
    // from GreenSnowDudie.as:84-92
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.justhit = true;
    ai.adobefrozenframebugfix = 5;
    let throws = 0;

    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0]),
        onThrow: () => throws++,
      }),
    );
    expect(ai.x).toBe(100);
    expect(ai.y).toBe(100);
    expect(throws).toBe(0);
  });
});

// ---------- decision cascade (D) walking ----------

describe("frameloop branch (D) — walking", () => {
  it("moves by (walkxmov, walkymov) when not yet at destination", () => {
    // from GreenSnowDudie.as:93-115
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walking = true;
    ai.walkendx = 100;
    ai.walkendy = 0;
    ai.walkxmov = 5;
    ai.walkymov = 0;

    tickGreen(ai, ctx({ rand: seqRandom([]) }));
    expect(ai.x).toBe(5);
    expect(ai.y).toBe(0);
    expect(ai.walking).toBe(true);
  });

  it("on arrival (|dx|<10 && |dy|<10), stops walking and clears walkend (titles hidden)", () => {
    // from GreenSnowDudie.as:95-105
    const ai = createGreenAI({ x: 95, y: 95 });
    ai.walking = true;
    ai.walkendx = 100;
    ai.walkendy = 100;
    ai.walkxmov = 5;
    ai.walkymov = 5;

    let pose = "";
    tickGreen(
      ai,
      ctx({
        titlesVisible: false,
        rand: seqRandom([]),
        onPose: (p) => {
          pose = p;
        },
      }),
    );
    expect(ai.walking).toBe(false);
    expect(ai.walkendx).toBe(0);
    expect(ai.walkendy).toBe(0);
    expect(pose).toBe("balling");
  });

  it("on arrival while titles visible: sets walkspeed=3, keeps walking flag set", () => {
    // from GreenSnowDudie.as:97-102
    const ai = createGreenAI({ x: 95, y: 95 });
    ai.walking = true;
    ai.walkendx = 100;
    ai.walkendy = 100;
    ai.walkxmov = 5;
    ai.walkymov = 5;

    tickGreen(ai, ctx({ titlesVisible: true, rand: seqRandom([]) }));
    expect(ai.walkspeed).toBe(3);
    // walking flag is NOT cleared while titles visible (early return at line 101).
    expect(ai.walking).toBe(true);
    expect(ai.walkendx).toBe(100);
    expect(ai.walkendy).toBe(100);
  });

  it("plays 'step' sound when sounds idle (frame == 1)", () => {
    // from GreenSnowDudie.as:110-113
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walking = true;
    ai.walkendx = 100;
    ai.walkendy = 0;
    ai.walkxmov = 5;
    ai.walkymov = 0;

    let played = "";
    tickGreen(
      ai,
      ctx({
        soundsCurrentFrame: 1,
        rand: seqRandom([]),
        onPlaySound: (s) => {
          played = s;
        },
      }),
    );
    expect(played).toBe("step");
  });

  it("does NOT play 'step' sound when sounds clip is busy (frame != 1)", () => {
    // from GreenSnowDudie.as:110
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walking = true;
    ai.walkendx = 100;
    ai.walkendy = 0;
    ai.walkxmov = 5;
    ai.walkymov = 0;

    let played = "";
    tickGreen(
      ai,
      ctx({
        soundsCurrentFrame: 7,
        rand: seqRandom([]),
        onPlaySound: (s) => {
          played = s;
        },
      }),
    );
    expect(played).toBe("");
  });
});

// ---------- decision cascade (E) cocking → throw ----------

describe("frameloop branch (E) — cocking countdown and toss", () => {
  it("decrements cocking by 1 each tick", () => {
    // from GreenSnowDudie.as:117-119
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.cocking = 20;
    tickGreen(ai, ctx({ rand: seqRandom([0.0]) }));
    expect(ai.cocking).toBe(19);
  });

  it("dispatches throwball exactly when cocking reaches 10", () => {
    // from GreenSnowDudie.as:120-123
    const ai = createGreenAI({ x: 200, y: 150 });
    ai.cocking = 11; // will become 10 after decrement
    let throws: { force: number; x: number; y: number; team: string }[] = [];
    let pose = "";
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.5]), // throw force = 0.3 + 0.5*0.6 = 0.6
        onThrow: (e) => throws.push(e),
        onPose: (p) => {
          pose = p;
        },
      }),
    );
    expect(ai.cocking).toBe(10);
    expect(throws.length).toBe(1);
    expect(throws[0].team).toBe("green");
    expect(throws[0].force).toBeCloseTo(0.6, 6);
    expect(throws[0].x).toBe(200);
    expect(throws[0].y).toBe(150 - 15); // y - 15 per AS:163
    expect(pose).toBe("toss");
  });

  it("does NOT throw on any cocking value other than 10", () => {
    // from GreenSnowDudie.as:120
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.cocking = 12; // -> 11, no throw
    let throws = 0;
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.5]),
        onThrow: () => throws++,
      }),
    );
    expect(throws).toBe(0);

    ai.cocking = 5; // -> 4, no throw
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.5]),
        onThrow: () => throws++,
      }),
    );
    expect(throws).toBe(0);
  });

  it("after release, ten more frames of cocking play out before returning to balling", () => {
    // from GreenSnowDudie.as:117-126 — semantics restated in spec/ai.md §4
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.cocking = 11;
    let throws = 0;
    // Tick once → throw at cocking==10
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.5]),
        onThrow: () => throws++,
      }),
    );
    expect(throws).toBe(1);
    expect(ai.cocking).toBe(10);

    // Then 10 more ticks decrement cocking to 0 with NO further throw.
    for (let i = 0; i < 10; i++) {
      tickGreen(
        ai,
        ctx({
          rand: seqRandom([0.0]), // stay below 0.975 to skip walk roll
          onThrow: () => throws++,
        }),
      );
    }
    expect(throws).toBe(1);
    expect(ai.cocking).toBe(0);
  });
});

// ---------- decision cascade (F) random walk roll ----------

describe("frameloop branch (F) — random walk roll", () => {
  it("rolls Math.random() > 0.975: rate is 2.5%/frame", () => {
    // from GreenSnowDudie.as:129
    // Roll value just above 0.975 -> walk; value just at 0.975 -> no walk.
    // When walking starts and walkendx isn't preset, branch (F) consumes two
    // more rand() calls inside randomdestinationwithinboundaries (AS:30-31).
    const ai1 = createGreenAI({ x: 100, y: 100 });
    tickGreen(ai1, ctx({ rand: seqRandom([0.976, 0.5, 0.5]) }));
    expect(ai1.walking).toBe(true);

    const ai2 = createGreenAI({ x: 100, y: 100 });
    tickGreen(ai2, ctx({ rand: seqRandom([0.975, 0.5]) })); // first dice 0.975 (NOT >); fallthrough to balling-RNG
    expect(ai2.walking).toBe(false);
  });

  it("when walkendx already set, walk branch is taken regardless of dice roll", () => {
    // from GreenSnowDudie.as:129 — `Math.random() > 0.975 || this.walkendx`
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walkendx = 100;
    ai.walkendy = 50;
    tickGreen(ai, ctx({ rand: seqRandom([0.0]) })); // dice clearly fails
    expect(ai.walking).toBe(true);
    // step magnitude == walkspeed (5) with direction (100,50)/|...| * 5
    const dist = Math.sqrt(100 * 100 + 50 * 50);
    const step = 5 / dist;
    expect(ai.walkxmov).toBeCloseTo(100 * step, 6);
    expect(ai.walkymov).toBeCloseTo(50 * step, 6);
  });

  it("when no walkend preset, rolls a random destination [0..500)x[0..300) and clips to boundary", () => {
    // from GreenSnowDudie.as:130-141
    const ai = createGreenAI({ x: 0, y: 0 });
    // rand sequence: [walk-roll, randDestX, randDestY]
    // 0.976 triggers walk; 0.4 -> 200; 0.5 -> 150
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.976, 0.4, 0.5]),
      }),
    );
    expect(ai.walking).toBe(true);
    // raw dest = (200,150). The line (610,0)->(0,340) at y=150 has x=610-150*(610/340)
    // slope = (340-0)/(0-610) = -340/610. line_x(y=150) = 610 + (150 - 0)/slope = 610 - 150*610/340
    const slope = (340 - 0) / (0 - 610);
    const lineXAt150 = (150 - 0) / slope + 610;
    // less=0 => keep x ≤ lineX. 200 < lineXAt150? lineXAt150 ≈ 610 - 269.1 = 340.88, so 200 < 340.88 -> not clipped.
    expect(lineXAt150).toBeGreaterThan(200);
    expect(ai.walkendx).toBeCloseTo(200, 6);
    expect(ai.walkendy).toBeCloseTo(150, 6);
  });
});

// ---------- decision cascade (G) titles freeze ----------

describe("frameloop branch (G) — titles visibility freeze", () => {
  it("does not start balling/cocking when titles are visible", () => {
    // from GreenSnowDudie.as:144-147
    const ai = createGreenAI({ x: 100, y: 100 });
    // No walkendx, no walking, no cocking, balling==0 → would normally start balling.
    tickGreen(
      ai,
      ctx({
        titlesVisible: true,
        rand: seqRandom([0.0, 0.0, 0.0]),
      }),
    );
    expect(ai.balling).toBe(0);
    expect(ai.cocking).toBe(0);
  });

  it("titles freeze does NOT block the random-walk roll (branch F runs first)", () => {
    // from GreenSnowDudie.as:127-147 — branch F precedes branch G in the cascade.
    const ai = createGreenAI({ x: 0, y: 0 });
    tickGreen(
      ai,
      ctx({
        titlesVisible: true,
        rand: seqRandom([0.99, 0.5, 0.5]),
      }),
    );
    expect(ai.walking).toBe(true);
  });
});

// ---------- decision cascade (H) balling countdown → cocking ----------

describe("frameloop branch (H) — balling countdown and transition to cock", () => {
  it("decrements balling each tick", () => {
    // from GreenSnowDudie.as:148-150
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.balling = 5;
    tickGreen(ai, ctx({ rand: seqRandom([0.0]) }));
    expect(ai.balling).toBe(4);
  });

  it("when balling reaches 0, sets pose='cock' and rolls cocking in [15..45]", () => {
    // from GreenSnowDudie.as:151-155
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.balling = 1;
    let pose = "";
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 0.0]), // walk roll fails; cocking RNG = 0.0
        onPose: (p) => {
          pose = p;
        },
      }),
    );
    expect(ai.balling).toBe(0);
    expect(pose).toBe("cock");
    // cocking = 15 + round(0.0 * 30) = 15.
    expect(ai.cocking).toBe(15);
  });

  it("cocking max value when RNG = 1.0 is 45", () => {
    // from GreenSnowDudie.as:154
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.balling = 1;
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 1.0]),
      }),
    );
    expect(ai.cocking).toBe(45);
  });

  it("cocking value is integer (Math.round of random*30)", () => {
    // from GreenSnowDudie.as:154
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.balling = 1;
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 0.5]),
      }),
    );
    expect(ai.cocking).toBe(15 + Math.round(0.5 * 30));
    expect(Number.isInteger(ai.cocking)).toBe(true);
  });
});

// ---------- decision cascade (I) start balling ----------

describe("frameloop branch (I) — start balling", () => {
  it("when balling==0 (and nothing else fired), sets pose='balling' and rolls balling in [10..60]", () => {
    // from GreenSnowDudie.as:158-159
    const ai = createGreenAI({ x: 100, y: 100 });
    let pose = "";
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 0.0]), // first: walk-roll fail; second: balling RNG
        onPose: (p) => {
          pose = p;
        },
      }),
    );
    expect(pose).toBe("balling");
    expect(ai.balling).toBe(10); // 10 + round(0*50)
  });

  it("balling max when RNG=1.0 is 60", () => {
    // from GreenSnowDudie.as:159
    const ai = createGreenAI({ x: 100, y: 100 });
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 1.0]),
      }),
    );
    expect(ai.balling).toBe(60);
  });

  it("balling is integer-valued", () => {
    // from GreenSnowDudie.as:159 — Math.round
    const ai = createGreenAI({ x: 100, y: 100 });
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0, 0.37]),
      }),
    );
    expect(ai.balling).toBe(10 + Math.round(0.37 * 50));
    expect(Number.isInteger(ai.balling)).toBe(true);
  });
});

// ---------- yougothit (HP transitions) ----------

describe("greenYouGotHit — HP transitions", () => {
  it("3 -> 2 sets justhit, adobefrozenframebugfix=50, plays hit anim + hit1 sound", () => {
    // from GreenSnowDudie.as:37-50
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.balling = 30;
    ai.cocking = 12;
    ai.walking = true;

    let pose = "";
    let sound = "";
    greenYouGotHit(ai, {
      onPose: (p) => {
        pose = p;
      },
      onPlaySound: (s) => {
        sound = s;
      },
      rand: seqRandom([]),
    });

    expect(ai.hitpoints).toBe(2);
    expect(ai.justhit).toBe(true);
    expect(ai.adobefrozenframebugfix).toBe(50);
    // yougothit clears walking/cocking/balling (AS:39-40)
    expect(ai.walking).toBe(false);
    expect(ai.cocking).toBe(0);
    expect(ai.balling).toBe(0);
    expect(ai.dead).toBe(false);
    expect(ai.down).toBe(false);
    expect(pose).toBe("hit");
    expect(sound).toBe("hit1");
  });

  it("2 -> 1 sets down=true, plays 'down' anim and hit1 sound", () => {
    // from GreenSnowDudie.as:51-56
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.hitpoints = 2;
    let pose = "";
    let sound = "";
    greenYouGotHit(ai, {
      onPose: (p) => {
        pose = p;
      },
      onPlaySound: (s) => {
        sound = s;
      },
      rand: seqRandom([]),
    });
    expect(ai.hitpoints).toBe(1);
    expect(ai.down).toBe(true);
    expect(ai.downRecoveryFrames).toBe(GREEN_DOWN_RECOVERY_FRAMES);
    expect(pose).toBe("down");
    expect(sound).toBe("hit1");
    expect(ai.dead).toBe(false);
  });

  it("2 -> 1 recovers from down so a final collision can KO the green", () => {
    // Regression: collision code gates on !down, so a permanent down state
    // makes level clear impossible through normal play.
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.hitpoints = 2;

    greenYouGotHit(ai, {
      onPose: () => {},
      onPlaySound: () => {},
      rand: seqRandom([]),
    });

    for (let i = 0; i < GREEN_DOWN_RECOVERY_FRAMES - 1; i++) {
      tickGreen(ai, ctx({ rand: seqRandom([]) }));
    }
    expect(ai.down).toBe(true);
    expect(ai.hitpoints).toBe(1);

    tickGreen(ai, ctx({ rand: seqRandom([]) }));
    expect(ai.down).toBe(false);

    let pose = "";
    greenYouGotHit(ai, {
      onPose: (p) => {
        pose = p;
      },
      onPlaySound: () => {},
      rand: seqRandom([0.5]),
    });
    expect(ai.hitpoints).toBe(0);
    expect(ai.dead).toBe(true);
    expect(pose).toBe("dead");
  });

  it("1 -> 0 sets dead=true, plays 'dead' anim and a kids[1..3] sound", () => {
    // from GreenSnowDudie.as:58-66
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.hitpoints = 1;
    let pose = "";
    let sound = "";
    greenYouGotHit(ai, {
      onPose: (p) => {
        pose = p;
      },
      onPlaySound: (s) => {
        sound = s;
      },
      // Math.ceil(0.5 * 3) = 2  ->  "kids2"
      rand: seqRandom([0.5]),
    });
    expect(ai.hitpoints).toBe(0);
    expect(ai.dead).toBe(true);
    expect(pose).toBe("dead");
    expect(sound).toBe("kids2");
  });

  it("kids sound is 'kids1' when rand near 0", () => {
    // from GreenSnowDudie.as:65 — Math.ceil(rand*3)
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.hitpoints = 1;
    let sound = "";
    greenYouGotHit(ai, {
      onPose: () => {},
      onPlaySound: (s) => {
        sound = s;
      },
      // Math.ceil(0.001 * 3) = 1
      rand: seqRandom([0.001]),
    });
    expect(sound).toBe("kids1");
  });

  it("kids sound is 'kids3' when rand close to 1", () => {
    // from GreenSnowDudie.as:65
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.hitpoints = 1;
    let sound = "";
    greenYouGotHit(ai, {
      onPose: () => {},
      onPlaySound: (s) => {
        sound = s;
      },
      // Math.ceil(0.99 * 3) = 3
      rand: seqRandom([0.99]),
    });
    expect(sound).toBe("kids3");
  });
});

// ---------- walk start helper ----------

describe("greenStartWalk — walk vector calculation", () => {
  it("computes step length == walkspeed in direction of walkend", () => {
    // from GreenSnowDudie.as:139-141
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walkendx = 30;
    ai.walkendy = 40; // distance 50, step 5
    greenStartWalk(ai);
    expect(ai.walkxmov).toBeCloseTo(3, 6);
    expect(ai.walkymov).toBeCloseTo(4, 6);
    const stepMag = Math.sqrt(ai.walkxmov ** 2 + ai.walkymov ** 2);
    expect(stepMag).toBeCloseTo(ai.walkspeed, 6);
  });

  it("respects current walkspeed (e.g. level-6 walkspeed=15)", () => {
    // from Snowcraft1Rewrite.as:279
    const ai = createGreenAI({ x: 0, y: 0 });
    ai.walkspeed = 15;
    ai.walkendx = 60;
    ai.walkendy = 80; // distance 100
    greenStartWalk(ai);
    const stepMag = Math.sqrt(ai.walkxmov ** 2 + ai.walkymov ** 2);
    expect(stepMag).toBeCloseTo(15, 6);
  });
});

// ---------- random destination + boundary clip ----------

describe("randomdestinationwithinboundaries", () => {
  it("draws x = rand*500, y = rand*300 then clips to boundary", () => {
    // from GreenSnowDudie.as:30-32 — raw range x∈[0,500), y∈[0,300); boundary
    // line clips x DOWN to the line for any (x,y) with x > line_x.
    const r = seqRandom([0.0, 0.0]);
    const d = randomDestinationWithinBoundaries(r);
    expect(d.x).toBe(0);
    expect(d.y).toBe(0);

    // For a y near 0 the boundary line is at x≈610, so the raw x is not clipped.
    const r2 = seqRandom([0.999999, 0.0]);
    const d2 = randomDestinationWithinBoundaries(r2);
    expect(d2.x).toBeCloseTo(0.999999 * 500, 6);
    expect(d2.y).toBe(0);
  });

  it("clips destination to be left of (less=0) the green boundary line (610,0)->(0,340)", () => {
    // from GreenSnowDudie.as:32 — checkline(610,0,0,340,...,less=0)
    // For y=170 the line crosses x = 305 (midpoint). A raw x=400 should clip down to 305.
    // (rand draws: x_raw=0.8 → 400; y_raw=0.5666... → 170.)
    const r = seqRandom([0.8, 170 / 300]);
    const d = randomDestinationWithinBoundaries(r);
    // Replicate the AS line math: slope=(340-0)/(0-610)=-340/610.
    // line_x(y) = (y - 0)/slope + 610 = y * (-610/340) + 610.
    const expectedLineX = 170 * (-610 / 340) + 610;
    expect(expectedLineX).toBeCloseTo(305, 6);
    expect(d.x).toBeCloseTo(expectedLineX, 6);
    expect(d.y).toBe(170);
  });
});

describe("checkline — direct boundary clip primitive", () => {
  it("less=0 clips x DOWN to the line (keep right side, i.e. smaller x)", () => {
    // from ASnowDudie.as:47-67
    // line (610,0)->(0,340); at y=170, line_x = 305.
    // Note: AS code clips x>line_x DOWN to line_x. With slope = -340/610 negative,
    // 'right side of line' visually is x<line_x; the AS condition `x > line_x => x = line_x`
    // is what we replicate verbatim.
    const out = checkline(610, 0, 0, 340, 400, 170, 0);
    expect(out.y).toBe(170);
    expect(out.x).toBeCloseTo(305, 6);
  });

  it("less=0 leaves x untouched if already <= line_x", () => {
    // from ASnowDudie.as:59-61 — only clamps when x > line_x
    const out = checkline(610, 0, 0, 340, 100, 170, 0);
    expect(out.x).toBe(100);
    expect(out.y).toBe(170);
  });

  it("less=1 clips x UP to the line (keep left side)", () => {
    // from ASnowDudie.as:52-58 — used by RedSnowDudie:179
    const out = checkline(592, 0, 0, 320, 50, 160, 1);
    // line_x at y=160: slope=(320-0)/(0-592)=-320/592. line_x = 160/slope + 592.
    const slope = (320 - 0) / (0 - 592);
    const lineX = 160 / slope + 592;
    expect(out.x).toBeCloseTo(lineX, 6);
    expect(out.y).toBe(160);
  });
});

// ---------- throw helper / force range ----------

describe("greenThrowForce — random force in [0.3, 0.9]", () => {
  it("rand=0 yields force=0.3", () => {
    // from GreenSnowDudie.as:163
    expect(greenThrowForce(0)).toBeCloseTo(0.3, 6);
  });

  it("rand=1 yields force=0.9", () => {
    // from GreenSnowDudie.as:163
    expect(greenThrowForce(1)).toBeCloseTo(0.9, 6);
  });

  it("rand=0.5 yields force=0.6", () => {
    // from GreenSnowDudie.as:163
    expect(greenThrowForce(0.5)).toBeCloseTo(0.6, 6);
  });
});

// ---------- end-to-end cadence ----------

describe("end-to-end throw cadence (no walking, no hits)", () => {
  it("min path: balling=10 then cocking=15 → throw at frame 16 (1+5)", () => {
    // from spec/ai.md §4: min 15 frames between "starts balling" and "ball release"
    // We force RNG so that:
    //  - all walk-rolls return 0.0 (no walk)
    //  - balling RNG=0.0 -> balling=10
    //  - cocking RNG=0.0 -> cocking=15
    // Sequence per tick: in branch (F) we always consume one rand for the dice roll.
    // Tick 1: walk-roll=0.0; balling==0 so branch (I) runs, consumes balling-RNG=0.0,
    //         sets balling=10, pose=balling. (2 rands)
    // Tick 2..11 (10 ticks): walk-roll=0.0; branch (H) decrements balling 10→0;
    //         on the tick when balling reaches 0, consumes cocking-RNG=0.0,
    //         sets cocking=15, pose=cock. (1 rand for first 9 ticks, 2 rands for the 10th tick)
    // Tick 12..16 (5 ticks): walk-roll=0.0; branch (E) decrements cocking 15→10.
    //         On the tick when cocking==10, fires throwball (consumes force-RNG).
    let throws = 0;
    let lastThrowTick = -1;

    const ai = createGreenAI({ x: 100, y: 100 });
    // Build rand sequence carefully:
    const rands: number[] = [];
    rands.push(0.0); // tick 1 walk-roll
    rands.push(0.0); // tick 1 balling RNG
    for (let t = 2; t <= 10; t++) {
      rands.push(0.0); // walk-roll only
    }
    rands.push(0.0); // tick 11 walk-roll
    rands.push(0.0); // tick 11 cocking RNG
    for (let t = 12; t <= 15; t++) {
      rands.push(0.0); // walk-roll only
    }
    rands.push(0.0); // tick 16 walk-roll
    rands.push(0.5); // tick 16 throw force RNG

    const r = seqRandom(rands);
    for (let t = 1; t <= 16; t++) {
      tickGreen(
        ai,
        ctx({
          rand: r,
          onThrow: () => {
            throws++;
            lastThrowTick = t;
          },
        }),
      );
    }
    expect(throws).toBe(1);
    expect(lastThrowTick).toBe(16);
  });
});

// ---------- determinism ----------

describe("determinism", () => {
  it("two AI instances driven by the same RNG sequence produce identical histories", () => {
    // The faithful port must preserve full determinism given a controlled RNG.
    const seq = [
      0.0, 0.42, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.6,
    ];
    const ticks = 20;

    const a = createGreenAI({ x: 100, y: 100 });
    const b = createGreenAI({ x: 100, y: 100 });
    const trA: string[] = [];
    const trB: string[] = [];

    const rA = seqRandom(seq.slice());
    const rB = seqRandom(seq.slice());

    for (let t = 0; t < ticks; t++) {
      tickGreen(
        a,
        ctx({
          rand: rA,
          onPose: (p) => trA.push(`p:${p}`),
          onThrow: (e) => trA.push(`t:${e.force.toFixed(4)}`),
          onPlaySound: (s) => trA.push(`s:${s}`),
        }),
      );
      tickGreen(
        b,
        ctx({
          rand: rB,
          onPose: (p) => trB.push(`p:${p}`),
          onThrow: (e) => trB.push(`t:${e.force.toFixed(4)}`),
          onPlaySound: (s) => trB.push(`s:${s}`),
        }),
      );
    }
    expect(trA).toEqual(trB);
    expect(a.balling).toBe(b.balling);
    expect(a.cocking).toBe(b.cocking);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

// ---------- light interaction with hit recovery ----------

describe("interaction: just-hit blocks throw cadence", () => {
  it("A green that gets hit while cocking has cocking=0 reset; will not throw until justhit clears", () => {
    // from GreenSnowDudie.as:39-40,46-48
    const ai = createGreenAI({ x: 100, y: 100 });
    ai.cocking = 11;
    greenYouGotHit(ai, {
      onPose: () => {},
      onPlaySound: () => {},
      rand: seqRandom([]),
    });
    expect(ai.cocking).toBe(0);
    expect(ai.balling).toBe(0);
    expect(ai.justhit).toBe(true);

    let throws = 0;
    // 50 frames of frozen recovery (adobefrozenframebugfix decrements 50→0 over 50 ticks; clears on tick 51).
    for (let i = 0; i < 50; i++) {
      tickGreen(
        ai,
        ctx({
          rand: seqRandom([0.0]),
          onThrow: () => throws++,
        }),
      );
    }
    expect(throws).toBe(0);
    expect(ai.justhit).toBe(true);
    // 51st tick: adobe -> -1, justhit cleared.
    tickGreen(
      ai,
      ctx({
        rand: seqRandom([0.0]),
        onThrow: () => throws++,
      }),
    );
    expect(ai.justhit).toBe(false);
  });
});
