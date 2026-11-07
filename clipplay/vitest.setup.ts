import '@testing-library/dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Browser mocks only apply to jsdom suites; node suites (storage, auth) have no window.
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock Audio API
  window.HTMLMediaElement.prototype.play = async () => {};
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};
}
