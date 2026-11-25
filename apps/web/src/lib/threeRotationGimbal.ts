/**
 * threeRotationGimbal.ts — 3D 360° 3-Axis Quaternion Rotation Gimbal Ring Gizmo (V5)
 *
 * Pure Three.js + gimbal-lock-free quaternion math:
 * - X-Axis (Pitch): Orange-Red (#F97316), YZ plane, normal (1, 0, 0)
 * - Y-Axis (Yaw):   Green (#22C55E),      XZ plane, normal (0, 1, 0)
 * - Z-Axis (Roll):  Cyan-Blue (#06B6D4),  XY plane, normal (0, 0, 1)
 * - Outer Screen-Space Trackball Ring (#94A3B8, radius 1.10 * R, camera-facing)
 * - Invisible fat hit-torus (tube = 0.14) for effortless finger/stylus picking
 * - Active Angle Wedge (sector mesh) + inactive ring dimming (opacity 0.22)
 * - Edge-On Fallback when |camDir · axisWorld| < 0.14
 */
import * as THREE from 'three';

export type GimbalAxis = 'x' | 'y' | 'z';

export const GIMBAL_COLORS: Record<GimbalAxis, number> = {
  x: 0xf97316, // Orange-Red
  y: 0x22c55e, // Green
  z: 0x06b6d4, // Cyan-Blue
};

export const AXIS_VECTORS: Record<GimbalAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// ---------------------------------------------------------------------------
// Pure Quaternion & Angle Math (unit-tested for zero gimbal lock)
// ---------------------------------------------------------------------------

/** Normalize angle in radians to [0, 360) degrees */
export function normalizeDeg360(rad: number): number {
  const deg = ((rad * 180) / Math.PI) % 360;
  return (deg + 360) % 360;
}

/** Snap angle to nearest step (default 15° = π/12) */
export function snapAngleRad(rad: number, stepRad = Math.PI / 12): number {
  return Math.round(rad / stepRad) * stepRad;
}

/** Signed rotation angle Δθ in radians around axisWorld from v0 to vt */
export function computeGimbalRotationDelta(
  v0: THREE.Vector3,
  vt: THREE.Vector3,
  axisWorld: THREE.Vector3,
): number {
  const a = axisWorld.clone().normalize();
  const u0 = v0.clone().normalize();
  const ut = vt.clone().normalize();
  const cross = new THREE.Vector3().crossVectors(u0, ut);
  const sinPart = cross.dot(a);
  const cosPart = Math.max(-1, Math.min(1, u0.dot(ut)));
  return Math.atan2(sinPart, cosPart);
}

/**
 * Edge-on fallback when camera view direction is nearly parallel to the ring plane
 * (|d_cam · axisWorld| < 0.14): projects pointer delta onto 2D screen tangent.
 */
export function computeEdgeOnFallbackDelta(
  pointerDeltaScreen: { dx: number; dy: number },
  tangentScreen2D: { tx: number; ty: number },
  sensitivity = 0.012,
): number {
  const tLen = Math.hypot(tangentScreen2D.tx, tangentScreen2D.ty);
  if (tLen < 1e-6) return pointerDeltaScreen.dx * sensitivity;
  const nx = tangentScreen2D.tx / tLen;
  const ny = tangentScreen2D.ty / tLen;
  return (pointerDeltaScreen.dx * nx + pointerDeltaScreen.dy * ny) * sensitivity;
}

/** Gimbal-lock-free incremental quaternion update: q_solid = q_delta * q_start */
export function applyGimbalQuaternion(
  startQuat: THREE.Quaternion,
  axisWorld: THREE.Vector3,
  deltaRad: number,
): THREE.Quaternion {
  const qDelta = new THREE.Quaternion().setFromAxisAngle(
    axisWorld.clone().normalize(),
    deltaRad,
  );
  return qDelta.multiply(startQuat.clone()).normalize();
}

// ---------------------------------------------------------------------------
// Three.js RotationGimbal3D Controller
// ---------------------------------------------------------------------------

export interface GimbalHUDState {
  activeAxis: GimbalAxis | null;
  angleDeg: number;
  dragging: boolean;
}

export class RotationGimbal3D {
  public readonly root = new THREE.Group();
  private readonly visibleRings: Record<GimbalAxis, THREE.Mesh>;
  private readonly hitRings: Record<GimbalAxis, THREE.Mesh>;
  private readonly outerRing: THREE.Mesh;
  private wedgeMesh: THREE.Mesh | null = null;
  private radius: number;

  private activeAxis: GimbalAxis | null = null;
  private startQuat = new THREE.Quaternion();
  private startAxisWorld = new THREE.Vector3();
  private startVecOnPlane = new THREE.Vector3();
  private startPointer = { x: 0, y: 0 };
  private isEdgeOn = false;
  private edgeTangentScreen = { tx: 1, ty: 0 };
  private currentDeltaRad = 0;

  constructor(boundingRadius = 1.35) {
    // Keep the 3-axis rotation gimbal cleanly inscribed INSIDE the 3D object
    this.radius = Math.max(0.55, 0.68 * boundingRadius);
    this.root.name = 'RotationGimbal3D';

    const makeRing = (axis: GimbalAxis) => {
      const visGeo = new THREE.TorusGeometry(this.radius, 0.024, 16, 96);
      const visMat = new THREE.MeshBasicMaterial({
        color: GIMBAL_COLORS[axis],
        transparent: true,
        opacity: 0.82,
        depthTest: false,
      });
      const visMesh = new THREE.Mesh(visGeo, visMat);
      visMesh.renderOrder = 20;
      visMesh.userData = { gimbalAxis: axis };

      const hitGeo = new THREE.TorusGeometry(this.radius, 0.14, 10, 48);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { gimbalAxis: axis };

      if (axis === 'x') {
        visMesh.rotation.y = Math.PI / 2;
        hitMesh.rotation.y = Math.PI / 2;
      } else if (axis === 'y') {
        visMesh.rotation.x = Math.PI / 2;
        hitMesh.rotation.x = Math.PI / 2;
      }
      this.root.add(visMesh, hitMesh);
      return { visMesh, hitMesh };
    };

    const rx = makeRing('x');
    const ry = makeRing('y');
    const rz = makeRing('z');
    this.visibleRings = { x: rx.visMesh, y: ry.visMesh, z: rz.visMesh };
    this.hitRings = { x: rx.hitMesh, y: ry.hitMesh, z: rz.hitMesh };

    // Inner subtle screen-space trackball ring (stays cleanly inside object bounds)
    const outerGeo = new THREE.TorusGeometry(this.radius * 0.98, 0.012, 10, 96);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.22,
      depthTest: false,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.renderOrder = 19;
    this.root.add(this.outerRing);
  }

  public setRadiusFromBoundingSphere(sphereRadius: number): void {
    // Keep gimbal rings cleanly inscribed inside the solid rather than protruding outside
    const nextR = Math.max(0.55, 0.62 * sphereRadius);
    const ratio = nextR / this.radius;
    if (Math.abs(ratio - 1) > 0.05) {
      this.root.scale.setScalar(ratio);
    }
  }

  public setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  public syncToCamera(camera: THREE.Camera): void {
    this.outerRing.quaternion.copy(camera.quaternion);
  }

  /** Try picking one of the 3 gimbal rings on pointerdown */
  public beginDrag(
    ndc: THREE.Vector2,
    clientPos: { x: number; y: number },
    camera: THREE.Camera,
    solidGroup: THREE.Object3D,
  ): GimbalAxis | null {
    if (!this.root.visible) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      [this.hitRings.x, this.hitRings.y, this.hitRings.z],
      false,
    );
    if (hits.length === 0) return null;

    const axis = hits[0].object.userData.gimbalAxis as GimbalAxis;
    this.activeAxis = axis;
    this.startQuat.copy(solidGroup.quaternion);
    this.startPointer = { ...clientPos };
    this.currentDeltaRad = 0;

    // World-space rotation axis
    this.startAxisWorld.copy(AXIS_VECTORS[axis]).normalize();

    const center = new THREE.Vector3();
    solidGroup.getWorldPosition(center);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    this.isEdgeOn = Math.abs(camDir.dot(this.startAxisWorld)) < 0.14;

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.startAxisWorld, center);
    const hitPt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hitPt)) {
      this.startVecOnPlane.subVectors(hitPt, center).normalize();
    } else {
      this.startVecOnPlane.subVectors(hits[0].point, center).normalize();
    }

    if (this.isEdgeOn) {
      const tangent3D = new THREE.Vector3().crossVectors(this.startAxisWorld, this.startVecOnPlane).normalize();
      const p0 = hits[0].point.clone().project(camera);
      const p1 = hits[0].point.clone().add(tangent3D.multiplyScalar(0.5)).project(camera);
      this.edgeTangentScreen = { tx: p1.x - p0.x, ty: -(p1.y - p0.y) };
    }

    this.applyHighlight(axis);
    return axis;
  }

  public updateDrag(
    ndc: THREE.Vector2,
    clientPos: { x: number; y: number },
    camera: THREE.Camera,
    solidGroup: THREE.Object3D,
    snap15Deg: boolean,
  ): GimbalHUDState | null {
    if (!this.activeAxis) return null;

    let delta = 0;
    if (this.isEdgeOn) {
      delta = computeEdgeOnFallbackDelta(
        { dx: clientPos.x - this.startPointer.x, dy: clientPos.y - this.startPointer.y },
        this.edgeTangentScreen,
      );
    } else {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      const center = new THREE.Vector3();
      solidGroup.getWorldPosition(center);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.startAxisWorld, center);
      const pt = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, pt)) {
        const vt = pt.sub(center).normalize();
        delta = computeGimbalRotationDelta(this.startVecOnPlane, vt, this.startAxisWorld);
      }
    }

    if (snap15Deg) {
      delta = snapAngleRad(delta, Math.PI / 12);
    }

    this.currentDeltaRad = delta;
    const nextQ = applyGimbalQuaternion(this.startQuat, this.startAxisWorld, delta);
    solidGroup.quaternion.copy(nextQ);
    this.updateWedgeMesh(this.activeAxis, delta);

    return {
      activeAxis: this.activeAxis,
      angleDeg: Math.round(normalizeDeg360(delta)),
      dragging: true,
    };
  }

  public endDrag(): GimbalHUDState {
    const finalDeg = Math.round(normalizeDeg360(this.currentDeltaRad));
    const axis = this.activeAxis;
    this.activeAxis = null;
    this.resetHighlight();
    this.clearWedgeMesh();
    return { activeAxis: axis, angleDeg: finalDeg, dragging: false };
  }

  public isDragging(): boolean {
    return this.activeAxis !== null;
  }

  private applyHighlight(active: GimbalAxis): void {
    (['x', 'y', 'z'] as GimbalAxis[]).forEach((ax) => {
      const ring = this.visibleRings[ax];
      const mat = ring.material as THREE.MeshBasicMaterial;
      if (ax === active) {
        mat.opacity = 1.0;
        ring.scale.setScalar(1.06);
      } else {
        mat.opacity = 0.22;
        ring.scale.setScalar(1.0);
      }
    });
  }

  private resetHighlight(): void {
    (['x', 'y', 'z'] as GimbalAxis[]).forEach((ax) => {
      const ring = this.visibleRings[ax];
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.92;
      ring.scale.setScalar(1.0);
    });
  }

  private updateWedgeMesh(axis: GimbalAxis, deltaRad: number): void {
    this.clearWedgeMesh();
    const absDelta = Math.abs(deltaRad);
    if (absDelta < 0.02) return;
    const startAngle = deltaRad >= 0 ? 0 : deltaRad;
    const geo = new THREE.CircleGeometry(this.radius * 0.94, 40, startAngle, absDelta);
    const mat = new THREE.MeshBasicMaterial({
      color: GIMBAL_COLORS[axis],
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 18;
    if (axis === 'x') mesh.rotation.y = Math.PI / 2;
    else if (axis === 'y') mesh.rotation.x = Math.PI / 2;
    this.wedgeMesh = mesh;
    this.root.add(mesh);
  }

  private clearWedgeMesh(): void {
    if (this.wedgeMesh) {
      this.root.remove(this.wedgeMesh);
      this.wedgeMesh.geometry.dispose();
      (this.wedgeMesh.material as THREE.Material).dispose();
      this.wedgeMesh = null;
    }
  }

  public dispose(): void {
    this.clearWedgeMesh();
    (['x', 'y', 'z'] as GimbalAxis[]).forEach((ax) => {
      this.visibleRings[ax].geometry.dispose();
      (this.visibleRings[ax].material as THREE.Material).dispose();
      this.hitRings[ax].geometry.dispose();
      (this.hitRings[ax].material as THREE.Material).dispose();
    });
    this.outerRing.geometry.dispose();
    (this.outerRing.material as THREE.Material).dispose();
  }
}
