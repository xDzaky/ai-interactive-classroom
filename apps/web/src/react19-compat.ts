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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const anyReact = require("react") as Record<string, unknown>;

const clientInternals =
  (anyReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as Record<
    string,
    unknown
  >) ?? {};

const shim: Record<string, unknown> = {
  ReactCurrentOwner: { current: null },
  ReactCurrentDispatcher: {
    current: {
      readContext: () => null,
      useCallback: () => () => {},
      useContext: () => null,
      useEffect: () => {},
      useImperativeHandle: () => {},
      useInsertionEffect: () => {},
      useLayoutEffect: () => {},
      useMemo: () => null,
      useReducer: () => [null, () => {}],
      useRef: () => ({ current: null }),
      useState: () => [null, () => {}],
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

// Use Object.defineProperty so the value cannot be overwritten after we set it.
// This is the critical fix — a simple assignment can be overwritten by React 19
// internal initialization that happens at module load time.
const KEY = "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED";

try {
  if (!Object.getOwnPropertyDescriptor(anyReact, KEY)?.get) {
    Object.defineProperty(anyReact, KEY, {
      get() {
        return shim;
      },
      set(_val: unknown) {
        // Swallow any attempt to overwrite — the shim must survive React 19 init
      },
      configurable: false,
      enumerable: false,
    });
  }
} catch {
  // Property already defined non-configurable — assign directly as fallback
  if (!anyReact[KEY]) {
    anyReact[KEY] = shim;
  }
}

// Expose React globally for libraries that access window.React
const target = typeof window !== "undefined" ? window : globalThis;
(target as Record<string, unknown>).React = anyReact;

export {};
