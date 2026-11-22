/**
 * Coordinate conversions between mathematical coordinates and Three.js view coordinates.
 * Math coordinates: Z up (x right, y depth, z up).
 * Three.js coordinates: Y up (x right, y up, z depth towards viewer).
 * Mapping: (x, y, z) -> (x, z, -y).
 */
import type { Vec3 } from "@ai-classroom/geometry-core";

/** Convert math coordinates (Z up) to Three.js coordinates (Y up) */
export function toThree(v: Vec3): [number, number, number] {
  return [v[0], v[2], -v[1]];
}

/** Convert Three.js coordinates (Y up) to math coordinates (Z up) */
export function fromThree(v: [number, number, number]): Vec3 {
  return [v[0], -v[2], v[1]];
}
