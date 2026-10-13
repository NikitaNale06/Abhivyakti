/**
 * 130-feature extraction matching python `isl_features.py` from the hope model:
 *   - 21 landmarks × 3 coords (x,y,z) / scale for hand 0 (63 features)
 *   - 21 landmarks × 3 coords (x,y,z) / scale for hand 1 (63 features)
 *   - Hand presence flags: [has_hand0, has_hand1] (2 features)
 *   - Wrist-to-wrist offset (dx, dy) / mean_scale if 2 hands present (2 features)
 *   = 130 features
 */

export type Landmark = { x: number; y: number; z: number };
export type HandLandmarks = Landmark[]; // 21 items

export interface HandDetection {
  landmarks: HandLandmarks;
  handedness: 'Left' | 'Right';
  confidence: number;
}

export const NUM_LANDMARKS = 21;
export const FEATURE_DIM = 130;
export const MIN_HAND_PX = 5.0;

/**
 * Hand scale in pixel units:
 * Average of palm length (wrist p0 to middle MCP p9) and palm width (index MCP p5 to pinky MCP p17).
 */
function handScale(pts: [number, number, number][]): number {
  const dxWristMcp = pts[9][0] - pts[0][0];
  const dyWristMcp = pts[9][1] - pts[0][1];
  const wristToMcp = Math.sqrt(dxWristMcp * dxWristMcp + dyWristMcp * dyWristMcp);

  const dxPalmWidth = pts[5][0] - pts[17][0];
  const dyPalmWidth = pts[5][1] - pts[17][1];
  const palmWidth = Math.sqrt(dxPalmWidth * dxPalmWidth + dyPalmWidth * dyPalmWidth);

  return 0.5 * (wristToMcp + palmWidth);
}

/**
 * Extract 130 features from detected hands matching `isl_features.py`:
 * - Converts normalized coordinates (0..1) to pixel space based on width/height.
 * - Filters out hands with scale < MIN_HAND_PX.
 * - Sorts hands with left-most wrist first.
 * - Takes up to 2 hands.
 * - Calculates relative landmarks normalized by palm scale.
 * - Appends presence flags and inter-wrist displacement.
 */
export function extract130Features(
  hands: HandDetection[],
  width: number = 512,
  height: number = 512,
): number[] {
  if (!hands || hands.length === 0) {
    return new Array<number>(FEATURE_DIM).fill(0);
  }

  // Convert each detected hand's landmarks to pixel units: [x * W, y * H, z * W]
  const validHands: { pts: [number, number, number][]; scale: number }[] = [];

  for (const h of hands) {
    if (!h.landmarks || h.landmarks.length < NUM_LANDMARKS) continue;

    const pts: [number, number, number][] = h.landmarks.map((l) => [
      (Number.isFinite(l.x) ? l.x : 0) * width,
      (Number.isFinite(l.y) ? l.y : 0) * height,
      (Number.isFinite(l.z) ? l.z : 0) * width,
    ]);

    const scale = handScale(pts);
    if (scale >= MIN_HAND_PX) {
      validHands.push({ pts, scale });
    }
  }

  if (validHands.length === 0) {
    return new Array<number>(FEATURE_DIM).fill(0);
  }

  // Stable ordering: left-most wrist first (pts[0][0] ascending)
  validHands.sort((a, b) => a.pts[0][0] - b.pts[0][0]);
  const selected = validHands.slice(0, 2);

  const feat = new Array<number>(FEATURE_DIM).fill(0);
  const scales: number[] = [];

  for (let i = 0; i < selected.length; i++) {
    const { pts, scale } = selected[i];
    const wrist = pts[0];
    const safeScale = scale > 1e-6 ? scale : 1e-6;

    for (let j = 0; j < NUM_LANDMARKS; j++) {
      const p = pts[j];
      const relX = (p[0] - wrist[0]) / safeScale;
      const relY = (p[1] - wrist[1]) / safeScale;
      const relZ = (p[2] - wrist[2]) / safeScale;

      feat[i * 63 + j * 3 + 0] = relX;
      feat[i * 63 + j * 3 + 1] = relY;
      feat[i * 63 + j * 3 + 2] = relZ;
    }

    feat[126 + i] = 1.0;
    scales.push(scale);
  }

  if (selected.length === 2 && scales.length === 2) {
    const meanScale = (scales[0] + scales[1]) / 2.0;
    const safeMeanScale = meanScale > 1e-6 ? meanScale : 1e-6;
    feat[128] = (selected[1].pts[0][0] - selected[0].pts[0][0]) / safeMeanScale;
    feat[129] = (selected[1].pts[0][1] - selected[0].pts[0][1]) / safeMeanScale;
  }

  return feat;
}