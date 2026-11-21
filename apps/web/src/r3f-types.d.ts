/**
 * Augment React.JSX.IntrinsicElements with @react-three/fiber's ThreeElements.
 * Required because tsconfig uses "jsx": "react-jsx" (new transform) which checks
 * React.JSX instead of the global JSX namespace that R3F v8 augments.
 */
import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
