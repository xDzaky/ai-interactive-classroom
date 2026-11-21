/**
 * useWeakDevice.test.ts — P07-T06
 * Unit tests for the weak-device detector.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { isWeakDevice, useWeakDevice } from "./useWeakDevice";

describe("isWeakDevice", () => {
  const originalNav = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNav,
      configurable: true,
    });
  });

  it("returns false when hardwareConcurrency >= 4 and no deviceMemory", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 8 },
      configurable: true,
    });
    expect(isWeakDevice()).toBe(false);
  });

  it("returns true when hardwareConcurrency < 4", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 2 },
      configurable: true,
    });
    expect(isWeakDevice()).toBe(true);
  });

  it("returns true when deviceMemory < 4", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 8, deviceMemory: 2 },
      configurable: true,
    });
    expect(isWeakDevice()).toBe(true);
  });

  it("returns false when deviceMemory >= 4 and cpus >= 4", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 4, deviceMemory: 4 },
      configurable: true,
    });
    expect(isWeakDevice()).toBe(false);
  });
});

describe("useWeakDevice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a stable boolean", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 8 },
      configurable: true,
    });
    const { result, rerender } = renderHook(() => useWeakDevice());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("returns true on weak device", () => {
    Object.defineProperty(global, "navigator", {
      value: { hardwareConcurrency: 1 },
      configurable: true,
    });
    const { result } = renderHook(() => useWeakDevice());
    expect(result.current).toBe(true);
  });
});
