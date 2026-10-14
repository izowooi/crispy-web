"use client";

import { motion } from "motion/react";
import { memo, useState } from "react";
import { BASE_ELEMENTS } from "@/lib/elements";
import { tintOf } from "./tint";

export type BoardTile = {
  id: string;
  name: string;
  emoji: string;
  /** Center position in viewport pixels. */
  x: number;
  y: number;
  /** Unix ms of creation; 0 for tiles restored from storage (no pop-in). */
  born: number;
  /** Set while this tile is being absorbed into a pending fusion. */
  fusing?: string;
  /** Changes to retrigger the rejection shake. */
  shake?: number;
};

const HANJA = new Map(BASE_ELEMENTS.map((e) => [e.name, e.hanja]));
const spring = { type: "spring", stiffness: 520, damping: 34 } as const;
const instant = { duration: 0 } as const;

type Props = {
  tile: BoardTile;
  dragging: boolean;
  target: boolean;
  registerEl: (el: HTMLElement | null) => void;
  onPointerDown: (e: React.PointerEvent, tile: BoardTile) => void;
  onDoubleClick: (tile: BoardTile) => void;
};

export const BoardTileView = memo(function BoardTileView({
  tile,
  dragging,
  target,
  registerEl,
  onPointerDown,
  onDoubleClick,
}: Props) {
  const fresh = tile.born > 0 && Date.now() - tile.born < 1500;
  const hanja = HANJA.get(tile.name);
  // Decided once at mount so re-renders during a drag don't replay the landing.
  const [landing] = useState(fresh);
  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ zIndex: dragging ? 60 : tile.fusing ? 15 : 10 }}
      initial={{ x: tile.x, y: tile.y, scale: fresh ? 0.2 : 0.85, opacity: 0 }}
      animate={{
        x: tile.x,
        y: tile.y,
        scale: tile.fusing ? 0.45 : dragging ? 1.07 : target ? 1.04 : 1,
        opacity: tile.fusing ? 0 : 1,
      }}
      exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.18 } }}
      transition={{
        x: dragging ? instant : spring,
        y: dragging ? instant : spring,
        scale: fresh ? { type: "spring", stiffness: 380, damping: 14 } : spring,
        opacity: tile.fusing ? { duration: 0.2, delay: 0.14 } : { duration: 0.16 },
      }}
    >
      {/* Squash & stretch on birth: lands flat, overshoots tall, settles. Origin (0,0) is the tile's visual center. */}
      <motion.div
        style={{ transformOrigin: "0px 0px" }}
        initial={false}
        animate={landing ? { scaleX: [1.35, 0.82, 1.08, 0.97, 1], scaleY: [0.6, 1.22, 0.92, 1.03, 1] } : undefined}
        transition={{ duration: 0.62, times: [0, 0.3, 0.55, 0.8, 1], ease: "easeOut" }}
      >
      <div
        key={tile.shake ?? 0}
        ref={registerEl}
        data-tile={tile.name}
        className={`tile -translate-x-1/2 -translate-y-1/2 ${dragging ? "tile--dragging" : "cursor-grab"} ${
          target ? "tile--target" : ""
        } ${tile.shake ? "animate-[shake_420ms_ease-in-out]" : ""}`}
        style={{ "--tint": tintOf(tile.name) } as React.CSSProperties}
        onPointerDown={(e) => onPointerDown(e, tile)}
        onDoubleClick={() => onDoubleClick(tile)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="tile__emoji">{tile.emoji}</span>
        <span>{tile.name}</span>
        {hanja && <span className="tile__hanja">{hanja}</span>}
      </div>
      </motion.div>
    </motion.div>
  );
});
