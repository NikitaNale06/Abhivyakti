import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import {
  getHandDetector,
  getLandmarksDetector,
} from './tfliteModels';
import type { HandDetection } from './landmarks';

const DETECTOR_INPUT = 224;
const LANDMARK_INPUT = 224;
const SCORE_THRESHOLD = 0.5;   // after sigmoid
const NUM_VALUES_PER_ANCHOR = 18;

export async function detectHands(imageUri: string): Promise<HandDetection[]> {
  // ---------- Stage 1: Detect palm bounding box ----------
  const detectorInput = await imageToFloat32(imageUri, DETECTOR_INPUT, DETECTOR_INPUT);
  const detector = await getHandDetector();
  const detectorOut = await detector.run([detectorInput.buffer as ArrayBuffer]);

  const bbox = decodeDetectorOutput(detectorOut);
  if (!bbox) {
    console.log('[handDetector] no bbox detected');
    return [];
  }

  console.log('[handDetector] bbox:', {
    x: bbox.x.toFixed(3),
    y: bbox.y.toFixed(3),
    w: bbox.w.toFixed(3),
    h: bbox.h.toFixed(3),
    score: bbox.score.toFixed(3),
  });

  // ---------- Crop palm from original image ----------
  const croppedUri = await cropImage(imageUri, bbox.x, bbox.y, bbox.w, bbox.h);

  // ---------- Stage 2: Detect 21 landmarks ----------
  const landmarkInput = await imageToFloat32(croppedUri, LANDMARK_INPUT, LANDMARK_INPUT);
  const landmarkModel = await getLandmarksDetector();
  const landmarkOut = await landmarkModel.run([landmarkInput.buffer as ArrayBuffer]);

  const landmarks = decodeLandmarkOutput(landmarkOut[0], bbox);
  if (!landmarks) {
    console.log('[handDetector] no landmarks decoded');
    return [];
  }

  console.log('[handDetector] SUCCESS: 21 landmarks extracted');
  console.log('[handDetector] landmark[0] (wrist):', {
    x: landmarks[0].x.toFixed(3),
    y: landmarks[0].y.toFixed(3),
    z: landmarks[0].z.toFixed(3),
  });
  console.log('[handDetector] landmark[9] (middle base):', {
    x: landmarks[9].x.toFixed(3),
    y: landmarks[9].y.toFixed(3),
    z: landmarks[9].z.toFixed(3),
  });

  return [
    {
      landmarks,
      handedness: 'Right',
      confidence: bbox.score,
    },
  ];
}

/* ------------------------------------------------------------------ */

async function imageToFloat32(
  uri: string,
  width: number,
  height: number,
): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width, height } }],
    {
      base64: true,
      compress: 1.0,
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
    out[j] = decoded.data[i] / 255;
    out[j + 1] = decoded.data[i + 1] / 255;
    out[j + 2] = decoded.data[i + 2] / 255;
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
  // x, y, w, h are NORMALIZED (0-1)
  // Need actual image size
  const info = await ImageManipulator.manipulateAsync(uri, [], {});
  const imgW = info.width;
  const imgH = info.height;

  const pad = 0.2;
  const cx = Math.max(0, x - w * pad);
  const cy = Math.max(0, y - h * pad);
  const cw = Math.min(1 - cx, w * (1 + pad * 2));
  const ch = Math.min(1 - cy, h * (1 + pad * 2));

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.round(cx * imgW),
          originY: Math.round(cy * imgH),
          width: Math.round(cw * imgW),
          height: Math.round(ch * imgH),
        },
      },
    ],
    { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

function decodeDetectorOutput(
  outputs: ArrayBuffer[],
): { x: number; y: number; w: number; h: number; score: number } | null {
  if (!outputs || outputs.length === 0) return null;

  try {
    const raw = new Float32Array(outputs[0]);
    console.log('[handDetector] detector output length:', raw.length);

    const totalValues = raw.length;
    const detectedAnchors = Math.floor(totalValues / NUM_VALUES_PER_ANCHOR);

    if (detectedAnchors * NUM_VALUES_PER_ANCHOR !== totalValues) {
      console.warn('[handDetector] output not divisible by 18:', totalValues);
      return null;
    }

    console.log('[handDetector] detected anchors:', detectedAnchors);

    // Find best anchor by raw score at position 17
    let bestIdx = -1;
    let bestRawScore = -Infinity;

    for (let i = 0; i < detectedAnchors; i++) {
      const rawScore = raw[i * NUM_VALUES_PER_ANCHOR + 17];
      if (rawScore > bestRawScore) {
        bestRawScore = rawScore;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) return null;

    // Apply sigmoid to get probability
    const score = 1 / (1 + Math.exp(-bestRawScore));
    console.log(
      '[handDetector] raw score:',
      bestRawScore.toFixed(3),
      '→ sigmoid:',
      score.toFixed(3),
    );

    if (score < SCORE_THRESHOLD) {
      console.warn('[handDetector] no hand above threshold. score:', score.toFixed(3));
      return null;
    }

    const off = bestIdx * NUM_VALUES_PER_ANCHOR;

    // MediaPipe SSD format: [x_center, y_center, w, h, kp0x, kp0y, ..., score]
    // x, y, w, h may be in pixel space (0-224) or normalized (0-1)
    let xc = raw[off + 0];
    let yc = raw[off + 1];
    let w = raw[off + 2];
    let h = raw[off + 3];

    // Auto-detect: if values > 1.5, they're in pixels
    if (xc > 1.5 || yc > 1.5 || w > 1.5 || h > 1.5) {
      console.log('[handDetector] bbox in pixel space, normalizing by 224');
      xc = xc / DETECTOR_INPUT;
      yc = yc / DETECTOR_INPUT;
      w = w / DETECTOR_INPUT;
      h = h / DETECTOR_INPUT;
    }

    // Convert from center (xc, yc) to top-left (x, y)
    const x = xc - w / 2;
    const y = yc - h / 2;

    console.log(
      '[handDetector] final normalized bbox:',
      x.toFixed(3), y.toFixed(3), w.toFixed(3), h.toFixed(3),
    );

    return { x, y, w, h, score };
  } catch (e) {
    console.error('[handDetector] decode detector fail:', e);
    return null;
  }
}

function decodeLandmarkOutput(
  output: ArrayBuffer,
  bbox: { x: number; y: number; w: number; h: number },
): { x: number; y: number; z: number }[] | null {
  try {
    const raw = new Float32Array(output);
    console.log('[handDetector] landmark output length:', raw.length);
    console.log(
      '[handDetector] landmark sample raw[0..8]:',
      raw[0].toFixed(4),
      raw[1].toFixed(4),
      raw[2].toFixed(4),
      raw[3].toFixed(4),
      raw[4].toFixed(4),
      raw[5].toFixed(4),
      raw[6].toFixed(4),
      raw[7].toFixed(4),
      raw[8].toFixed(4),
    );

    if (raw.length < 63) {
      console.warn('[handDetector] landmark output too small:', raw.length);
      return null;
    }

    // Detect coordinate range
    let maxVal = 0;
    for (let i = 0; i < 63; i++) {
      if (Math.abs(raw[i]) > maxVal) maxVal = Math.abs(raw[i]);
    }
    console.log('[handDetector] max abs value in landmarks:', maxVal.toFixed(4));

    const isPixelSpace = maxVal > 1.5;

    const landmarks = [];
    for (let i = 0; i < 21; i++) {
      let lx = raw[i * 3];
      let ly = raw[i * 3 + 1];
      let lz = raw[i * 3 + 2];

      // If pixel space, normalize to [0, 1] relative to crop
      if (isPixelSpace) {
        lx = lx / LANDMARK_INPUT;
        ly = ly / LANDMARK_INPUT;
      }

      // Convert from crop-relative (0-1) to full-image normalized
      landmarks.push({
        x: bbox.x + lx * bbox.w,
        y: bbox.y + ly * bbox.h,
        z: lz,
      });
    }

    return landmarks;
  } catch (e) {
    console.error('[handDetector] decode landmarks fail:', e);
    return null;
  }
}