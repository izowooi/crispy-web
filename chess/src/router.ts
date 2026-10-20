import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

const current = () => window.location.hash.replace(/^#/, "") || "/";

export function useRoute(): string {
  return useSyncExternalStore(subscribe, current);
}

export function navigate(path: string) {
  window.location.hash = path;
}
