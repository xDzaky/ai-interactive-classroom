/**
 * react19-compat.ts
 *
 * Polyfill for legacy React 18 internal symbols that are accessed by
 * libraries using react-reconciler v0.27 (e.g. @react-three/fiber v8).
 * In React 19, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED was deprecated/removed
 * in favor of __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.
 */
import * as React from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyReact = React as any;

if (typeof window !== "undefined" || typeof globalThis !== "undefined") {
  const target = typeof window !== "undefined" ? window : globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target as any).React = anyReact;
}

if (!anyReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  const clientInternals =
    anyReact.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE || {};

  anyReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    ReactCurrentOwner: { current: null },
    ReactCurrentDispatcher: { current: null },
    ReactCurrentBatchConfig: { transition: null },
    ReactCurrentActQueue: {
      current: null,
      isBatchingLegacy: false,
      didScheduleLegacyUpdate: false,
    },
    ReactDebugCurrentFrame: { getCurrentStack: null },
    ...clientInternals,
  };
}
