"use client";

type Image = {
  id: string;
  src: string;       // data URL
  prompt: string;
  seed?: number;
};

type Props = {
  images: Image[];
};

export function Gallery({ images }: Props) {
  if (images.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] text-[var(--color-fg-dim)]">
        생성된 이미지가 여기에 표시됩니다
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {images.map((im) => (
        <figure key={im.id} className="overflow-hidden rounded-xl border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)]">
          <img
            data-testid="result"
            src={im.src}
            alt={im.prompt.slice(0, 60)}
            className="block h-auto w-full"
          />
          <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-[var(--color-fg-dim)]">
            <span className="truncate" title={im.prompt}>
              {im.prompt}
            </span>
            <a
              href={im.src}
              download={`gennai-${im.id}.png`}
              className="rounded bg-[var(--color-bg-elev-2)] px-2 py-1 text-[var(--color-fg)] hover:bg-[var(--color-accent)] hover:text-black"
            >
              ⬇
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export type { Image as GalleryImage };
