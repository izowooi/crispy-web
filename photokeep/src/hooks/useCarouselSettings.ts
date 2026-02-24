'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'photokeep-carousel-sensitivity';
const EVENT_NAME = 'photokeep-carousel-sensitivity-change';

export const DEFAULT_SENSITIVITY = 50;
export const MIN_SENSITIVITY = 20;
export const MAX_SENSITIVITY = 150;

export function useCarouselSensitivity() {
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_SENSITIVITY && parsed <= MAX_SENSITIVITY) {
        setSensitivity(parsed);
      }
    }
  }, []);

  useEffect(() => {
    function handleChange(e: Event) {
      setSensitivity((e as CustomEvent<number>).detail);
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  const updateSensitivity = useCallback((value: number) => {
    const clamped = Math.max(MIN_SENSITIVITY, Math.min(MAX_SENSITIVITY, value));
    setSensitivity(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clamped }));
  }, []);

  return { sensitivity, updateSensitivity };
}
