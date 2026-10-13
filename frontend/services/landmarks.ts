/**
 * 130-feature extraction matching the training pipeline:
 *   - 21 landmarks × 3 coords (x,y,z) = 63 features per hand
 *   - 2 hands = 126 features
 *   - + 2 hand-presence flags
 *   - + 2 wrist-to-wrist offsets (x, y)
 *   = 130 features
 */

export type Landmark = { x: number; y: number; z: number };
export type HandLandmarks = Landmark[]; // 21 items

export interface HandDetection {
  landmarks: HandLandmarks;
  handedness: 'Left' | 'Right';
  confidence: number;
}

const NUM_LANDMARKS = 21;
const FEATURES_PER_HAND = NUM_LANDMARKS * 3; // 63

/**
 * Normalize one hand's landmarks:
 *   - Wrist (landmark 0) becomes the origin
 *   - Scale by distance(wrist, middle-finger MCP = landmark 9)
 *   - Result is rotation/scale-invariant hand shape
 *
 * NOTE: The image is already flipped horizontally (front-cam mirror corrected)
 * before reaching here, so no additional x-negation is needed.
 */
function normalizeHand(landmarks: HandLandmarks): number[] {
  const wrist = landmarks[0];
  const middleBase = landmarks[9];

  const dx = middleBase.x - wrist.x;
  const dy = middleBase.y - wrist.y;
  const dz = middleBase.z - wrist.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;

  const out: number[] = [];
  for (let i = 0; i < NUM_LANDMARKS; i++) {
    const lm = landmarks[i];
    out.push((lm.x - wrist.x) / dist);
    out.push((lm.y - wrist.y) / dist);
    out.push((lm.z - wrist.z) / dist);
  }
  return out;
}

/**
 * Extract 130 features from 0, 1, or 2 detected hands.
 *
 * Training-time behavior:
 *   - Hands sorted left-to-right by wrist x-coordinate
 *   - Missing hands padded with zeros
 *   - Presence flags [has_left, has_right]
 *   - Wrist-to-wrist offset (x, y) — 0 if only one hand
 */
export function extract130Features(hands: HandDetection[]): number[] {
  // Sort by wrist x, left-to-right (small x = left)
  const sorted = [...hands].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x);

  const left = sorted[0];
  const right = sorted[1];

  const leftFeatures = left
    ? normalizeHand(left.landmarks)
    : new Array<number>(FEATURES_PER_HAND).fill(0);

  const rightFeatures = right
    ? normalizeHand(right.landmarks)
    : new Array<number>(FEATURES_PER_HAND).fill(0);

  const leftPresent = left ? 1 : 0;
  const rightPresent = right ? 1 : 0;

  let wristDx = 0;
  let wristDy = 0;
  if (left && right) {
    wristDx = right.landmarks[0].x - left.landmarks[0].x;
    wristDy = right.landmarks[0].y - left.landmarks[0].y;
  }

  return [
    ...leftFeatures,      // 63
    ...rightFeatures,     // 63
    leftPresent,          // 1
    rightPresent,         // 1
    wristDx,              // 1
    wristDy,              // 1
  ]; // = 130
}