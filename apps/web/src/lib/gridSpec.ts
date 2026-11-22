/**
 * gridSpec.ts — P10-T04
 * Adaptive grid spacing specification.
 * Pure function — no DOM, no React.
 */

export interface GridSpec {
  worldSpacing: number;
  screenSpacing: number;
  visible: boolean;
}

/**
 * Calculates adaptive grid spacing given viewport scale.
 *
 * Rule:
 * spacing = baseWorld;
 * while (spacing * scale < 14) spacing *= 5;
 * visible = scale >= 0.15;
 */
export function gridSpec(scale: number, baseWorld = 20): GridSpec {
  const visible = scale >= 0.15;
  let spacing = baseWorld;
  while (spacing * scale < 14) {
    spacing *= 5;
  }
  return {
    worldSpacing: spacing,
    screenSpacing: spacing * scale,
    visible,
  };
}
