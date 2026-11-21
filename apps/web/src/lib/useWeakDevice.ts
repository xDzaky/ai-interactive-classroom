/**
 * useWeakDevice.ts — P07-T06
 * Detects weak devices to degrade quality of heavy 3D rendering.
 * Criteria: navigator.hardwareConcurrency < 4 OR navigator.deviceMemory < 4
 *
 * Returns true when the device is considered weak.
 */

/**
 * Pure helper — usable outside React (e.g. in component file-level const).
 * Returns true when the device has limited CPU/memory resources.
 */
export function isWeakDevice(): boolean {
  if (typeof navigator === "undefined") return false; // SSR guard
  const cpuWeak =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency < 4;
  // navigator.deviceMemory is non-standard but widely supported (Chrome/Edge)
  const memWeak =
    "deviceMemory" in navigator &&
    typeof (navigator as { deviceMemory?: number }).deviceMemory === "number" &&
    ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) < 4;
  return cpuWeak || memWeak;
}

/**
 * React hook wrapper — returns a stable boolean for the lifetime of the component.
 * The value does not change while the page is open (device capability is static).
 */
import { useState } from "react";

export function useWeakDevice(): boolean {
  const [weak] = useState<boolean>(() => isWeakDevice());
  return weak;
}
