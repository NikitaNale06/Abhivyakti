import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import {
  getHandDetector,
  getLandmarksDetector,
} from './tfliteModels';
import type { HandDetection, Landmark } from './landmarks';

const DETECTOR_INPUT = 192;
const LANDMARK_INPUT = 224;
const PALM_SCORE_THRESHOLD = 0.4;
const LANDMARK_FLAG_THRESHOLD = 0.3;
const PALM_EXPANSION = 2.6;

interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PalmBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  handCenterX: number;
  handCenterY: number;
  handSize: number;
}

let cachedAnchors: Anchor[] | null = null;

/**
 * Generate 2016 SSD anchors for MediaPipe 192x192 Palm Detector.
 */
function getAnchors(): Anchor[] {
  if (cachedAnchors) return cachedAnchors;

  const strides = [8, 16, 16, 16];
  const minScale = 0.1484375;
  const maxScale = 0.75;
  const inputSize = 192;
  const anchors: Anchor[] = [];
  let layerId = 0;

  while (layerId < strides.length) {
    const anchorHeight: number[] = [];
    const anchorWidth: number[] = [];
    let lastSameStrideLayer = layerId;

    while (
      lastSameStrideLayer < strides.length &&
      strides[lastSameStrideLayer] === strides[layerId]
    ) {
      const scale =
        minScale +
        ((maxScale - minScale) * lastSameStrideLayer) / (strides.length - 1.0);
      const nextScale =
        lastSameStrideLayer === strides.length - 1
          ? 1.0
          : minScale +
            ((maxScale - minScale) * (lastSameStrideLayer + 1)) /
              (strides.length - 1.0);

      anchorHeight.push(scale);
      anchorWidth.push(scale);

      const interpScale = Math.sqrt(scale * nextScale);
      anchorHeight.push(interpScale);
      anchorWidth.push(interpScale);

      lastSameStrideLayer++;
    }

    const stride = strides[layerId];
    const featureMapW = Math.ceil(inputSize / stride);
    const featureMapH = Math.ceil(inputSize / stride);

    for (let y = 0; y < featureMapH; y++) {
      for (let x = 0; x < featureMapW; x++) {
        for (let aId = 0; aId < anchorWidth.length; aId++) {
          const xCenter = ((x + 0.5) * stride) / inputSize;
          const yCenter = ((y + 0.5) * stride) / inputSize;
          anchors.push({
            x: xCenter,
            y: yCenter,
            w: 1.0,
            h: 1.0,
          });
        }
      }
    }

    layerId = lastSameStrideLayer;
  }

  cachedAnchors = anchors;
  return anchors;
}

function calculateIoU(
  b1: { x: number; y: number; w: number; h: number },
  b2: { x: number; y: number; w: number; h: number },
): number {
  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.w, b2.x + b2.w);
  const y2 = Math.min(b1.y + b1.h, b2.y + b2.h);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  const unionArea = b1.w * b1.h + b2.w * b2.h - interArea;
  return unionArea > 0 ? interArea / unionArea : 0;
}

export async function detectHands(imageUri: string): Promise<HandDetection[]> {
  const detections: HandDetection[] = [];

  try {
    // ---- Flip image horizontally ----
    // Training data was collected on back camera (or explicitly flipped front cam).
    // Front camera produces a mirror image, so we flip before running models.
    const flippedUri = await flipImageHorizontally(imageUri);

    // ---------- Stage 1: Detect palm bounding boxes on flipped image ----------
    const detectorInput = await imageToFloat32Normalized(flippedUri, DETECTOR_INPUT, DETECTOR_INPUT);
    const detector = await getHandDetector();
    const detectorOut = await detector.run([detectorInput.buffer as ArrayBuffer]);

    const palms = decodePalmDetector(detectorOut);
    console.log(`[handDetector] palm detector found ${palms.length} palm candidates`);

    const landmarkModel = await getLandmarksDetector();

    for (const palm of palms) {
      console.log(
        `[handDetector] processing palm (score: ${palm.score.toFixed(3)}, size: ${palm.handSize.toFixed(3)})`,
      );

      // Crop full hand from flipped image
      const cropX = Math.max(0, palm.handCenterX - palm.handSize / 2);
      const cropY = Math.max(0, palm.handCenterY - palm.handSize / 2);
      const cropW = Math.min(1 - cropX, palm.handSize);
      const cropH = Math.min(1 - cropY, palm.handSize);

      const croppedUri = await cropImage(flippedUri, cropX, cropY, cropW, cropH);
      const landmarkInput = await imageToFloat32Normalized(croppedUri, LANDMARK_INPUT, LANDMARK_INPUT);
      const landmarkOut = await landmarkModel.run([landmarkInput.buffer as ArrayBuffer]);

      const result = decodeLandmarkOutput(landmarkOut, {
        x: cropX,
        y: cropY,
        w: cropW,
        h: cropH,
      });

      if (result) {
        console.log(
          `[handDetector] Hand verified! Handedness: ${result.handedness}, confidence: ${result.confidence.toFixed(3)}`,
        );
        detections.push(result);
      }
    }

    // ---------- Fallback: center crop if no palm confirmed ----------
    if (detections.length === 0) {
      console.log('[handDetector] No palm confirmed. Trying center frame fallback...');
      const fallbackBox = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
      const fallbackUri = await cropImage(
        flippedUri,
        fallbackBox.x,
        fallbackBox.y,
        fallbackBox.w,
        fallbackBox.h,
      );
      const landmarkInput = await imageToFloat32Normalized(fallbackUri, LANDMARK_INPUT, LANDMARK_INPUT);
      const landmarkOut = await landmarkModel.run([landmarkInput.buffer as ArrayBuffer]);

      const result = decodeLandmarkOutput(landmarkOut, fallbackBox);
      if (result && result.confidence >= 0.35) {
        console.log(
          `[handDetector] Center fallback success! confidence: ${result.confidence.toFixed(3)}`,
        );
        detections.push(result);
      }
    }
  } catch (err) {
    console.error('[handDetector] Detection pipeline error:', err);
  }

  return detections;
}

/* ------------------------------------------------------------------ */

function decodePalmDetector(outputs: ArrayBuffer[]): PalmBox[] {
  if (!outputs || outputs.length < 2) {
    console.warn('[handDetector] Expected at least 2 outputs from palm detector');
    return [];
  }

  const regRaw = new Float32Array(outputs[0]);
  const scoresRaw = new Float32Array(outputs[1]);
  const anchors = getAnchors();

  const numAnchors = Math.min(anchors.length, scoresRaw.length);
  const candidates: PalmBox[] = [];

  for (let i = 0; i < numAnchors; i++) {
    const rawScore = scoresRaw[i];
    const score = 1 / (1 + Math.exp(-rawScore));
    if (score < PALM_SCORE_THRESHOLD) continue;

    const off = i * 18;
    const anchor = anchors[i];

    // Decode center and dimensions relative to anchor
    const xc = (regRaw[off + 0] / 192.0) * anchor.w + anchor.x;
    const yc = (regRaw[off + 1] / 192.0) * anchor.h + anchor.y;
    const w = (regRaw[off + 2] / 192.0) * anchor.w;
    const h = (regRaw[off + 3] / 192.0) * anchor.h;

    // Keypoints: kp0 = wrist, kp2 = middle finger MCP
    const kp0x = (regRaw[off + 4] / 192.0) * anchor.w + anchor.x;
    const kp0y = (regRaw[off + 5] / 192.0) * anchor.h + anchor.y;
    const kp2x = (regRaw[off + 8] / 192.0) * anchor.w + anchor.x;
    const kp2y = (regRaw[off + 9] / 192.0) * anchor.h + anchor.y;

    const palmSize = Math.max(w, h);
    const handSize = Math.max(0.12, Math.min(0.98, palmSize * PALM_EXPANSION));

    const dirX = kp2x - kp0x;
    const dirY = kp2y - kp0y;
    const handCenterX = xc + dirX * 0.4;
    const handCenterY = yc + dirY * 0.4;

    candidates.push({
      x: xc - w / 2,
      y: yc - h / 2,
      w,
      h,
      score,
      handCenterX,
      handCenterY,
      handSize,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  // NMS — up to 2 hands
  const selected: PalmBox[] = [];
  for (const cand of candidates) {
    if (selected.length >= 2) break;
    let overlap = false;
    for (const sel of selected) {
      if (calculateIoU(cand, sel) > 0.3) { overlap = true; break; }
    }
    if (!overlap) selected.push(cand);
  }

  return selected;
}

function decodeLandmarkOutput(
  outputs: ArrayBuffer[],
  crop: { x: number; y: number; w: number; h: number },
): HandDetection | null {
  try {
    if (!outputs || outputs.length === 0) return null;

    const rawLandmarks = new Float32Array(outputs[0]);
    if (rawLandmarks.length < 63) return null;

    // outputs[1] = hand flag (presence score)
    let handFlag = 1.0;
    if (outputs.length > 1) {
      handFlag = new Float32Array(outputs[1])[0];
    }

    if (handFlag < LANDMARK_FLAG_THRESHOLD) {
      console.log(`[handDetector] Landmark flag low: ${handFlag.toFixed(3)}`);
      return null;
    }

    // outputs[2] = handedness (> 0.5 → Right in mirrored-corrected space)
    let handedness: 'Left' | 'Right' = 'Right';
    if (outputs.length > 2) {
      handedness = new Float32Array(outputs[2])[0] > 0.5 ? 'Right' : 'Left';
    }

    const landmarks: Landmark[] = [];
    for (let i = 0; i < 21; i++) {
      // Landmark model outputs pixel coords in 0..224 space
      const lx = rawLandmarks[i * 3 + 0] / LANDMARK_INPUT;  // [0..1] within crop
      const ly = rawLandmarks[i * 3 + 1] / LANDMARK_INPUT;
      const lz = rawLandmarks[i * 3 + 2] / LANDMARK_INPUT;

      landmarks.push({
        x: crop.x + lx * crop.w,
        y: crop.y + ly * crop.h,
        z: lz,
      });
    }

    return {
      landmarks,
      handedness,
      confidence: handFlag,
    };
  } catch (e) {
    console.error('[handDetector] decode landmarks error:', e);
    return null;
  }
}

/**
 * Flip image horizontally so front-camera mirror is corrected.
 * The ISL model was trained on back-camera / non-mirrored frames.
 */
async function flipImageHorizontally(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ flip: ImageManipulator.FlipType.Horizontal }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/**
 * Convert image to Float32Array with values in [0, 1].
 * MediaPipe palm detector expects [0..1] normalized RGB float32 input.
 */
async function imageToFloat32Normalized(
  uri: string,
  width: number,
  height: number,
): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width, height } }],
    {
      base64: true,
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (!resized.base64) throw new Error('resize failed');

  const binary = atob(resized.base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

  const out = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < width * height * 4; i += 4, j += 3) {
    out[j]     = decoded.data[i]     / 255.0;
    out[j + 1] = decoded.data[i + 1] / 255.0;
    out[j + 2] = decoded.data[i + 2] / 255.0;
  }
  return out;
}

async function cropImage(
  uri: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<string> {
  const info = await ImageManipulator.manipulateAsync(uri, [], {});
  const imgW = info.width;
  const imgH = info.height;

  let originX = Math.round(x * imgW);
  let originY = Math.round(y * imgH);
  let cropW = Math.round(w * imgW);
  let cropH = Math.round(h * imgH);

  originX = Math.max(0, Math.min(imgW - 2, originX));
  originY = Math.max(0, Math.min(imgH - 2, originY));
  cropW = Math.max(1, Math.min(imgW - originX, cropW));
  cropH = Math.max(1, Math.min(imgH - originY, cropH));

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: cropW, height: cropH } }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}