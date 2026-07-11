import Image from "next/image";
import type { OverlayConfig } from "./studio-types";

export function OverlayLayer({ overlay }: { overlay: OverlayConfig }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {overlay.title ? (
        <div className="absolute top-[6%] right-[7%] left-[7%] text-center font-display text-[clamp(1rem,4vw,3rem)] leading-none font-semibold tracking-[-0.03em] text-[#fff7e8] [text-shadow:0_2px_12px_rgba(0,0,0,.8),0_1px_2px_rgba(0,0,0,.9)]">
          {overlay.title}
        </div>
      ) : null}
      {overlay.dialogue ? (
        <div className="dialogue-overlay absolute top-[64%] right-[4.5%] left-[4.5%] h-[31.5%] overflow-hidden rounded-[clamp(8px,1.5vw,18px)] border border-white/70 bg-black/80 px-[4%] py-[2.5%] text-left text-white shadow-2xl backdrop-blur-[2px]">
          {overlay.speaker ? (
            <div className="mb-[0.5%] text-[clamp(.55rem,1.6vw,1.15rem)] leading-tight font-bold text-[#eab15f]">
              {overlay.speaker}
            </div>
          ) : null}
          <div className="overflow-hidden text-[clamp(.65rem,2vw,1.45rem)] leading-[1.35] font-semibold whitespace-pre-wrap [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
            {overlay.dialogue}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OverlayImage({
  src,
  alt,
  overlay,
  className = "object-contain",
}: {
  src: string;
  alt: string;
  overlay: OverlayConfig;
  className?: string;
}) {
  return (
    <>
      <Image src={src} alt={alt} fill unoptimized className={className} sizes="(max-width: 1024px) 100vw, 62vw" />
      <OverlayLayer overlay={overlay} />
    </>
  );
}
