import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Polyfill localStorage for jsdom environments that don't provide it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

if (typeof localStorage === "undefined" || !localStorage.getItem) {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Clear localStorage between tests
beforeEach(() => {
  if (typeof localStorage !== "undefined" && localStorage.clear) {
    localStorage.clear();
  }
});
