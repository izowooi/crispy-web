"use client";

import { useEffect } from "react";

export type ToastVariant = "success" | "error";

interface Props {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, variant, onClose, duration = 1800 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colorClass =
    variant === "success"
      ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
      : "bg-red-600 text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg ${colorClass}`}
    >
      {message}
    </div>
  );
}
