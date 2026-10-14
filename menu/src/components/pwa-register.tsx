"use client";

import { useEffect } from "react";
import { startPwaClient } from "@/lib/pwa-client";

export function PwaRegister() {
  useEffect(() => {
    startPwaClient();
  }, []);
  return null;
}
