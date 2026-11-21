/**
 * react19-compat.ts
 *
 * Polyfill for legacy React 18 internal symbols accessed by libraries using
 * react-reconciler v0.27 (e.g. @react-three/fiber v8, react-konva).
 *
 * React 19 moved to __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
 * and removed __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.
 *
 * Fix: Use Object.defineProperty with configurable:false so React 19's own
 * initialization cannot overwrite the shim after we set it.
 *
 * MUST be the first import in main.tsx (before React itself).
 */
import * as ReactModule from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyReact = ReactModule as any;

const clientInternals =
  anyReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ?? {};

const shim: Record<string, unknown> = {
  ReactCurrentOwner: { current: null },
  ReactCurrentDispatcher: {
    current: {
      readContext: () => null,
      useCallback: (fn: unknown) => fn,
      useContext: () => null,
      useEffect: () => {},
      useImperativeHandle: () => {},
      useInsertionEffect: () => {},
      useLayoutEffect: () => {},
      useMemo: (fn: () => unknown) => fn(),
      useReducer: (r: unknown, s: unknown) => [s, () => {}],
      useRef: (v: unknown) => ({ current: v }),
      useState: (v: unknown) => [v, () => {}],
      useDebugValue: () => {},
      useDeferredValue: (v: unknown) => v,
      useTransition: () => [false, (cb: () => void) => cb()],
      useId: () => "",
      useSyncExternalStore: (_: unknown, snap: () => unknown) => snap(),
    },
  },
  ReactCurrentBatchConfig: { transition: null },
  ReactCurrentActQueue: {
    current: null,
    isBatchingLegacy: false,
    didScheduleLegacyUpdate: false,
  },
  ReactDebugCurrentFrame: { getCurrentStack: null },
  ...clientInternals,
};

const KEY = "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED";

try {
  if (!Object.getOwnPropertyDescriptor(anyReact, KEY)?.get) {
    Object.defineProperty(anyReact, KEY, {
      get() {
        return shim;
      },
      set(_val: unknown) {
        // Swallow overwrites — shim must survive React 19 init
      },
      configurable: false,
      enumerable: false,
    });
  }
} catch {
  // Already non-configurable — assign directly as fallback
  if (!anyReact[KEY]) {
    anyReact[KEY] = shim;
  }
}

// Expose React globally for libraries that check window.React
const target = typeof window !== "undefined" ? window : globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(target as any).React = anyReact;

export {};
