"use client";

import { useEffect, useRef, useState } from "react";

export function HeroDetailViewer({ cardUrl }: { cardUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const proxyUrl = `/api/card?url=${encodeURIComponent(cardUrl)}`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => setLoaded(true);
    iframe.addEventListener("load", handleLoad);

    // Already loaded (e.g. cached)
    if (iframe.contentDocument?.readyState === "complete") {
      setLoaded(true);
    }

    return () => iframe.removeEventListener("load", handleLoad);
  }, []);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ minHeight: "600px" }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        sandbox="allow-scripts allow-same-origin"
        className="w-full"
        style={{
          height: "100vh",
          minHeight: "600px",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s",
        }}
        title="영웅 카드"
      />
    </div>
  );
}
