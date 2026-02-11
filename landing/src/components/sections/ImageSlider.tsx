"use client";

import { useState } from "react";
import Image from "next/image";

const images = [
  { src: "/images/slide-01.webp", alt: "Slide 1" },
  { src: "/images/slide-02.webp", alt: "Slide 2" },
  { src: "/images/slide-03.webp", alt: "Slide 3" },
];

export default function ImageSlider() {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full h-[calc(100vh-64px-73px)] bg-neutral-100 overflow-hidden select-none">
      {images.map((img, i) => (
        <div
          key={img.src}
          className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            className="object-contain"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Left button */}
      <button
        onClick={prev}
        aria-label="Previous image"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 text-white opacity-40 hover:opacity-80 transition-opacity duration-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Right button */}
      <button
        onClick={next}
        aria-label="Next image"
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 text-white opacity-40 hover:opacity-80 transition-opacity duration-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${i === current
                ? "bg-white w-4"
                : "bg-white/40 hover:bg-white/70"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
