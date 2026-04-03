"use client";

import { useState } from "react";

export function HeroDetailViewer({ cardUrl }: { cardUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full" style={{ minHeight: "600px" }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
          <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      <iframe
        src={cardUrl}
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoaded(true)}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
        style={{ height: "100vh", minHeight: "600px", display: loaded ? "block" : "none" }}
        title="영웅 카드"
      />
    </div>
  );
}
