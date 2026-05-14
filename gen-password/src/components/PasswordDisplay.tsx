"use client";

import { useState } from "react";
import { Dictionary } from "@/lib/i18n";

interface Props {
  password: string;
  dict: Dictionary;
  onRefresh: () => void;
  onCopySuccess: () => void;
  onCopyFail: () => void;
}

export function PasswordDisplay({
  password,
  dict,
  onRefresh,
  onCopySuccess,
  onCopyFail,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onCopyFail();
    }
  };

  return (
    <div className="w-full">
      <label className="text-sm font-medium text-stone-600 dark:text-stone-300">
        {dict.passwordLabel}
      </label>
      <div className="mt-2 flex items-stretch gap-2">
        <div
          dir="ltr"
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-lg break-all dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          aria-label={dict.passwordLabel}
        >
          {password || " "}
        </div>
        <button
          onClick={onRefresh}
          aria-label={dict.refreshAria}
          className="rounded-lg border border-stone-200 bg-white px-3 text-xl hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
        >
          🔄
        </button>
        <button
          onClick={handleCopy}
          disabled={!password}
          className="rounded-lg bg-sky-600 px-4 font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {copied ? dict.copiedButton : dict.copyButton}
        </button>
      </div>
    </div>
  );
}
