"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-800 transition-colors"
    >
      {copied ? "✓ 복사됨" : "🔗 공유 URL 복사"}
    </button>
  );
}
