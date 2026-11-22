/**
 * Constants and hyperparameters for shape recognizer v2 (P10-T09)
 */

export const CONSTANTS = {
  // Input rejection
  DEFAULT_MIN_LENGTH_PX: 24,
  DEFAULT_MIN_POINTS: 8,
  POINT_MIN_DIST_PX: 1.0,

  // Resampling
  RESAMPLE_N: 64,

  // Closed stroke detection
  CLOSED_GAP_RATIO: 0.20,

  // Open stroke (line) detection
  LINE_PERP_DEV_RATIO: 0.15,
  LINE_CHORD_RATIO: 0.80,
  LINE_SNAP_ANGLE_DEG: 5.0,

  // Ellipse / Circle
  ELLIPSE_RMS_DIVISOR: 0.22,
  CIRCLE_AXIS_RATIO: 0.85,

  // Polygon detection (Douglas-Peucker tolerances relative to bbox diagonal)
  POLYGON_EPSILONS: [0.02, 0.03, 0.05, 0.07, 0.10],
  CORNER_MERGE_RATIO: 0.06,
  DROP_CORNER_ANGLE_DEG: 165.0,
  FIT_ERROR_DIVISOR: 0.10,
  POLYGON_REGULARITY_CV: 0.30,
  QUAD_OPP_SIDE_EQUAL_RATIO: 0.22,
  QUAD_SIDE_EQUAL_RATIO: 0.22,
  QUAD_RIGHT_ANGLE_TOLERANCE_DEG: 15.0,

  // Decision thresholds
  DECISION_SNAP_MIN_CONF: 0.80,
  DECISION_SNAP_MARGIN: 0.10,
  DECISION_SUGGEST_MIN_CONF: 0.50,

  // Angle snapping
  ANGLE_SNAP_TOLERANCE_DEG: 7.0,
} as const;
