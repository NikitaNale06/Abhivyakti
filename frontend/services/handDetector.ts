// import * as ImageManipulator from 'expo-image-manipulator';
// import * as jpeg from 'jpeg-js';
// import {
//   getHandDetector,
//   getLandmarksDetector,
// } from './tfliteModels';
// import type { HandDetection, Landmark } from './landmarks';

// const DETECTOR_INPUT = 192;
// const LANDMARK_INPUT = 224;
// const PALM_SCORE_THRESHOLD = 0.30;
// const LANDMARK_FLAG_THRESHOLD = 0.20;
// const PALM_EXPANSION = 2.4;
// const PALM_CENTER_SHIFT = 0.45;

// interface Anchor {
//   x: number;
//   y: number;
//   w: number;
//   h: number;
// }

// interface PalmBox {
//   x: number;
//   y: number;
//   w: number;
//   h: number;
//   score: number;
//   handCenterX: number;
//   handCenterY: number;
//   handSize: number;
// }

// let cachedAnchors: Anchor[] | null = null;

// /**
//  * Generate 2016 SSD anchors for MediaPipe 192x192 Palm Detector.
//  */
// function getAnchors(): Anchor[] {
//   if (cachedAnchors) return cachedAnchors;

//   const strides = [8, 16, 16, 16];
//   const minScale = 0.1484375;
//   const maxScale = 0.75;
//   const inputSize = 192;
//   const anchors: Anchor[] = [];
//   let layerId = 0;

//   while (layerId < strides.length) {
//     const anchorHeight: number[] = [];
//     const anchorWidth: number[] = [];
//     let lastSameStrideLayer = layerId;

//     while (
//       lastSameStrideLayer < strides.length &&
//       strides[lastSameStrideLayer] === strides[layerId]
//     ) {
//       const scale =
//         minScale +
//         ((maxScale - minScale) * lastSameStrideLayer) / (strides.length - 1.0);
//       const nextScale =
//         lastSameStrideLayer === strides.length - 1
//           ? 1.0
//           : minScale +
//             ((maxScale - minScale) * (lastSameStrideLayer + 1)) /
//               (strides.length - 1.0);

//       anchorHeight.push(scale);
//       anchorWidth.push(scale);

//       const interpScale = Math.sqrt(scale * nextScale);
//       anchorHeight.push(interpScale);
//       anchorWidth.push(interpScale);

//       lastSameStrideLayer++;
//     }

//     const stride = strides[layerId];
//     const featureMapW = Math.ceil(inputSize / stride);
//     const featureMapH = Math.ceil(inputSize / stride);

//     for (let y = 0; y < featureMapH; y++) {
//       for (let x = 0; x < featureMapW; x++) {
//         for (let aId = 0; aId < anchorWidth.length; aId++) {
//           const xCenter = ((x + 0.5) * stride) / inputSize;
//           const yCenter = ((y + 0.5) * stride) / inputSize;
//           anchors.push({
//             x: xCenter,
//             y: yCenter,
//             w: 1.0,
//             h: 1.0,
//           });
//         }
//       }
//     }

//     layerId = lastSameStrideLayer;
//   }

//   cachedAnchors = anchors;
//   return anchors;
// }

// function calculateIoU(
//   b1: { x: number; y: number; w: number; h: number },
//   b2: { x: number; y: number; w: number; h: number },
// ): number {
//   const x1 = Math.max(b1.x, b2.x);
//   const y1 = Math.max(b1.y, b2.y);
//   const x2 = Math.min(b1.x + b1.w, b2.x + b2.w);
//   const y2 = Math.min(b1.y + b1.h, b2.y + b2.h);
//   const interW = Math.max(0, x2 - x1);
//   const interH = Math.max(0, y2 - y1);
//   const interArea = interW * interH;
//   const unionArea = b1.w * b1.h + b2.w * b2.h - interArea;
//   return unionArea > 0 ? interArea / unionArea : 0;
// }

// export async function detectHands(
//   imageUri: string,
//   imgWidth?: number,
//   imgHeight?: number,
// ): Promise<HandDetection[]> {
//   const detections: HandDetection[] = [];

//   try {
//     // Determine image dimensions once
//     let imgW = imgWidth;
//     let imgH = imgHeight;
//     if (!imgW || !imgH) {
//       const info = await ImageManipulator.manipulateAsync(imageUri, [], {});
//       imgW = info.width;
//       imgH = info.height;
//     }

//     // ---------- Stage 1: Detect palm bounding boxes ----------
//     const detectorInput = await imageToFloat32Normalized(imageUri, DETECTOR_INPUT, DETECTOR_INPUT);
//     const detector = await getHandDetector();
//     const detectorOut = await detector.run([detectorInput.buffer as ArrayBuffer]);

//     const palms = decodePalmDetector(detectorOut);
//     const landmarkModel = await getLandmarksDetector();

//     for (const palm of palms) {
//       // Calculate crop box around full hand (including extended fingers and wrist)
//       const halfSize = palm.handSize / 2;
//       const cropX = Math.max(0, palm.handCenterX - halfSize);
//       const cropY = Math.max(0, palm.handCenterY - halfSize);
//       const cropW = Math.min(1 - cropX, palm.handSize);
//       const cropH = Math.min(1 - cropY, palm.handSize);

//       if (cropW < 0.05 || cropH < 0.05) continue;

//       const croppedUri = await cropImage(imageUri, cropX, cropY, cropW, cropH, imgW, imgH);
//       const landmarkInput = await imageToFloat32Normalized(croppedUri, LANDMARK_INPUT, LANDMARK_INPUT);
//       const landmarkOut = await landmarkModel.run([landmarkInput.buffer as ArrayBuffer]);

//       const result = decodeLandmarkOutput(landmarkOut, {
//         x: cropX,
//         y: cropY,
//         w: cropW,
//         h: cropH,
//       });

//       if (result) {
//         detections.push(result);
//       }
//     }

//     // ---------- Fallback: center crop if no palm confirmed ----------
//     if (detections.length === 0) {
//       const fallbackBox = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
//       const fallbackUri = await cropImage(
//         imageUri,
//         fallbackBox.x,
//         fallbackBox.y,
//         fallbackBox.w,
//         fallbackBox.h,
//         imgW,
//         imgH,
//       );
//       const landmarkInput = await imageToFloat32Normalized(fallbackUri, LANDMARK_INPUT, LANDMARK_INPUT);
//       const landmarkOut = await landmarkModel.run([landmarkInput.buffer as ArrayBuffer]);

//       const result = decodeLandmarkOutput(landmarkOut, fallbackBox);
//       if (result && result.confidence >= 0.20) {
//         detections.push(result);
//       }
//     }
//   } catch (err) {
//     console.error('[handDetector] Detection pipeline error:', err);
//   }

//   return detections;
// }

// /* ------------------------------------------------------------------ */

// function decodePalmDetector(outputs: ArrayBuffer[]): PalmBox[] {
//   if (!outputs || outputs.length < 2) {
//     return [];
//   }

//   // Ensure regRaw is the 36288-float buffer and scoresRaw is the 2016-float buffer
//   const buf0 = outputs[0];
//   const buf1 = outputs[1];
//   const regRaw = new Float32Array(buf0.byteLength > buf1.byteLength ? buf0 : buf1);
//   const scoresRaw = new Float32Array(buf0.byteLength > buf1.byteLength ? buf1 : buf0);
//   const anchors = getAnchors();

//   const numAnchors = Math.min(anchors.length, scoresRaw.length);
//   const candidates: PalmBox[] = [];

//   for (let i = 0; i < numAnchors; i++) {
//     const rawScore = scoresRaw[i];
//     const score = 1 / (1 + Math.exp(-rawScore));
//     if (score < PALM_SCORE_THRESHOLD) continue;

//     const off = i * 18;
//     if (off + 9 >= regRaw.length) continue;
//     const anchor = anchors[i];

//     // Decode center and dimensions relative to anchor
//     const xc = (regRaw[off + 0] / 192.0) * anchor.w + anchor.x;
//     const yc = (regRaw[off + 1] / 192.0) * anchor.h + anchor.y;
//     const w = (regRaw[off + 2] / 192.0) * anchor.w;
//     const h = (regRaw[off + 3] / 192.0) * anchor.h;

//     // Keypoints: kp0 = wrist, kp2 = middle finger MCP
//     const kp0x = (regRaw[off + 4] / 192.0) * anchor.w + anchor.x;
//     const kp0y = (regRaw[off + 5] / 192.0) * anchor.h + anchor.y;
//     const kp2x = (regRaw[off + 8] / 192.0) * anchor.w + anchor.x;
//     const kp2y = (regRaw[off + 9] / 192.0) * anchor.h + anchor.y;

//     const palmSize = Math.max(w, h);
//     const handSize = Math.max(0.12, Math.min(0.95, palmSize * PALM_EXPANSION));

//     const dirX = kp2x - kp0x;
//     const dirY = kp2y - kp0y;
//     const handCenterX = xc + dirX * PALM_CENTER_SHIFT;
//     const handCenterY = yc + dirY * PALM_CENTER_SHIFT;

//     candidates.push({
//       x: xc - w / 2,
//       y: yc - h / 2,
//       w,
//       h,
//       score,
//       handCenterX,
//       handCenterY,
//       handSize,
//     });
//   }

//   candidates.sort((a, b) => b.score - a.score);

//   // Non-Maximum Suppression (up to 2 hands)
//   const selected: PalmBox[] = [];
//   for (const cand of candidates) {
//     if (selected.length >= 2) break;
//     let overlap = false;
//     for (const sel of selected) {
//       if (calculateIoU(cand, sel) > 0.3) {
//         overlap = true;
//         break;
//       }
//     }
//     if (!overlap) selected.push(cand);
//   }

//   return selected;
// }

// function decodeLandmarkOutput(
//   outputs: ArrayBuffer[],
//   crop: { x: number; y: number; w: number; h: number },
// ): HandDetection | null {
//   try {
//     if (!outputs || outputs.length === 0) return null;

//     let rawLandmarks: Float32Array | null = null;
//     let handFlag = 1.0;
//     let handedness: 'Left' | 'Right' = 'Right';

//     // Identify output tensors by shape and value characteristics
//     for (const buf of outputs) {
//       const f = new Float32Array(buf);
//       if (f.length === 63) {
//         let maxVal = 0;
//         for (let i = 0; i < 63; i++) {
//           const v = Math.abs(f[i]);
//           if (v > maxVal) maxVal = v;
//         }
//         // Pixel coordinates (0..224), unlike world landmarks which are in [-0.1..0.1]
//         if (maxVal > 1.0) {
//           rawLandmarks = f;
//         }
//       }
//     }

//     if (!rawLandmarks && outputs[0]) {
//       rawLandmarks = new Float32Array(outputs[0]);
//     }
//     if (!rawLandmarks || rawLandmarks.length < 63) return null;

//     if (outputs.length > 1) {
//       const f1 = new Float32Array(outputs[1]);
//       if (f1.length === 1) handFlag = f1[0];
//     }

//     if (handFlag < LANDMARK_FLAG_THRESHOLD) {
//       return null;
//     }

//     if (outputs.length > 2) {
//       const f2 = new Float32Array(outputs[2]);
//       if (f2.length === 1) handedness = f2[0] > 0.5 ? 'Right' : 'Left';
//     }

//     const landmarks: Landmark[] = [];
//     for (let i = 0; i < 21; i++) {
//       const lx = rawLandmarks[i * 3 + 0] / LANDMARK_INPUT;
//       const ly = rawLandmarks[i * 3 + 1] / LANDMARK_INPUT;
//       const lz = rawLandmarks[i * 3 + 2] / LANDMARK_INPUT;

//       landmarks.push({
//         x: crop.x + lx * crop.w,
//         y: crop.y + ly * crop.h,
//         z: lz,
//       });
//     }

//     return {
//       landmarks,
//       handedness,
//       confidence: handFlag,
//     };
//   } catch (e) {
//     console.error('[handDetector] decode landmarks error:', e);
//     return null;
//   }
// }

// /**
//  * Convert image to Float32Array with values in [0, 1].
//  * MediaPipe detector & landmark models expect [0..1] normalized RGB float32.
//  */
// async function imageToFloat32Normalized(
//   uri: string,
//   width: number,
//   height: number,
// ): Promise<Float32Array> {
//   const resized = await ImageManipulator.manipulateAsync(
//     uri,
//     [{ resize: { width, height } }],
//     {
//       base64: true,
//       compress: 0.9,
//       format: ImageManipulator.SaveFormat.JPEG,
//     },
//   );

//   if (!resized.base64) throw new Error('resize failed');

//   const binary = atob(resized.base64);
//   const len = binary.length;
//   const bytes = new Uint8Array(len);
//   for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

//   const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

//   const out = new Float32Array(width * height * 3);
//   for (let i = 0, j = 0; i < width * height * 4; i += 4, j += 3) {
//     out[j]     = decoded.data[i]     / 255.0;
//     out[j + 1] = decoded.data[i + 1] / 255.0;
//     out[j + 2] = decoded.data[i + 2] / 255.0;
//   }
//   return out;
// }

// async function cropImage(
//   uri: string,
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   imgWidth?: number,
//   imgHeight?: number,
// ): Promise<string> {
//   let imgW = imgWidth;
//   let imgH = imgHeight;
//   if (!imgW || !imgH) {
//     const info = await ImageManipulator.manipulateAsync(uri, [], {});
//     imgW = info.width;
//     imgH = info.height;
//   }

//   let originX = Math.round(x * imgW);
//   let originY = Math.round(y * imgH);
//   let cropW = Math.round(w * imgW);
//   let cropH = Math.round(h * imgH);

//   originX = Math.max(0, Math.min(imgW - 10, originX));
//   originY = Math.max(0, Math.min(imgH - 10, originY));
//   cropW = Math.max(10, Math.min(imgW - originX, cropW));
//   cropH = Math.max(10, Math.min(imgH - originY, cropH));

//   const result = await ImageManipulator.manipulateAsync(
//     uri,
//     [{ crop: { originX, originY, width: cropW, height: cropH } }],
//     { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
//   );
//   return result.uri;
// }


import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { getHandDetector, getLandmarksDetector } from './tfliteModels';
import type { HandDetection, Landmark } from './landmarks';

const DETECTOR_INPUT = 192;
const LANDMARK_INPUT = 224;
const FRAME_WIDTH = 512; // frame is decoded once at this width, aspect preserved

const PALM_SCORE_THRESHOLD = 0.3;
const PALM_NMS_IOU = 0.3;
const MAX_PALM_CANDIDATES = 4; // verify more than we keep
const MAX_HANDS = 2;
const LANDMARK_FLAG_THRESHOLD = 0.35; // same as det_conf in Python
const HAND_DEDUPE_IOU = 0.5;

// MediaPipe hand ROI settings
const ROI_SCALE = 2.6;
const ROI_SHIFT = 0.5;

interface Frame {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

/** Square, possibly rotated region in frame-pixel space. (ux,uy) = unit "up" vector. */
interface Roi {
  cx: number;
  cy: number;
  side: number;
  ux: number;
  uy: number;
}

interface PalmCandidate {
  score: number;
  box: { x: number; y: number; w: number; h: number };
  roi: Roi;
}

interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

let cachedAnchors: Anchor[] | null = null;

/** 2016 SSD anchors for the 192x192 palm detector. */
function getAnchors(): Anchor[] {
  if (cachedAnchors) return cachedAnchors;

  const strides = [8, 16, 16, 16];
  const minScale = 0.1484375;
  const maxScale = 0.75;
  const anchors: Anchor[] = [];
  let layerId = 0;

  while (layerId < strides.length) {
    let perCell = 0;
    let last = layerId;
    while (last < strides.length && strides[last] === strides[layerId]) {
      perCell += 2;
      last++;
    }
    const stride = strides[layerId];
    const fm = Math.ceil(DETECTOR_INPUT / stride);
    for (let y = 0; y < fm; y++) {
      for (let x = 0; x < fm; x++) {
        for (let a = 0; a < perCell; a++) {
          anchors.push({
            x: ((x + 0.5) * stride) / DETECTOR_INPUT,
            y: ((y + 0.5) * stride) / DETECTOR_INPUT,
            w: 1.0,
            h: 1.0,
          });
        }
      }
    }
    layerId = last;
  }

  cachedAnchors = anchors;
  return anchors;
}

/* ------------------------------------------------------------------ */
/* Frame decoding + ROI sampling                                       */
/* ------------------------------------------------------------------ */

async function loadFrame(uri: string): Promise<Frame> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: FRAME_WIDTH } }],
    { base64: true, compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );
  if (!resized.base64) throw new Error('resize failed');

  const binary = atob(resized.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return { data: decoded.data, width: decoded.width, height: decoded.height };
}

/** ROI-local (u,v in 0..1, v downwards) -> frame pixel coordinates. */
function roiToFrame(roi: Roi, u: number, v: number): [number, number] {
  const a = (u - 0.5) * roi.side; // along "right"
  const b = (v - 0.5) * roi.side; // along "down"
  const rx = -roi.uy;
  const ry = roi.ux;
  return [roi.cx + a * rx - b * roi.ux, roi.cy + a * ry - b * roi.uy];
}

/**
 * Sample a (rotated, square) ROI from the frame into a size x size RGB float tensor in [0,1].
 * Anything outside the frame is black (== MediaPipe's zero padding).
 */
function sampleRoi(frame: Frame, roi: Roi, size: number): Float32Array {
  const { data, width: W, height: H } = frame;
  const out = new Float32Array(size * size * 3);
  const step = roi.side / size;
  const rx = -roi.uy;
  const ry = roi.ux;
  let o = 0;

  for (let j = 0; j < size; j++) {
    const b = (j + 0.5) * step - roi.side / 2;
    for (let i = 0; i < size; i++) {
      const a = (i + 0.5) * step - roi.side / 2;
      const fx = roi.cx + a * rx - b * roi.ux - 0.5;
      const fy = roi.cy + a * ry - b * roi.uy - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;

      let r = 0, g = 0, bl = 0;
      for (let k = 0; k < 4; k++) {
        const xx = x0 + (k & 1);
        const yy = y0 + (k >> 1);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const wgt = ((k & 1) ? tx : 1 - tx) * ((k >> 1) ? ty : 1 - ty);
        const idx = (yy * W + xx) * 4;
        r += data[idx] * wgt;
        g += data[idx + 1] * wgt;
        bl += data[idx + 2] * wgt;
      }
      out[o++] = r / 255;
      out[o++] = g / 255;
      out[o++] = bl / 255;
    }
  }
  return out;
}

function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface DetectionResult {
  hands: HandDetection[];
  /** Size of the frame the landmarks are normalised against. Pass to extract130Features. */
  frameWidth: number;
  frameHeight: number;
}

export async function detectHandsWithSize(imageUri: string): Promise<DetectionResult> {
  const hands: HandDetection[] = [];
  let frame: Frame = { data: new Uint8Array(0), width: FRAME_WIDTH, height: FRAME_WIDTH };

  try {
    frame = await loadFrame(imageUri);

    // ---- Stage 1: palm detection on a LETTERBOXED 192x192 image ----
    const side = Math.max(frame.width, frame.height);
    const letterbox: Roi = { cx: frame.width / 2, cy: frame.height / 2, side, ux: 0, uy: -1 };
    const detInput = sampleRoi(frame, letterbox, DETECTOR_INPUT);

    const detector = await getHandDetector();
    const detOut = await detector.run([detInput.buffer as ArrayBuffer]);
    const palms = decodePalmDetector(detOut, letterbox);

    // ---- Stage 2: landmarks for each candidate (rotated, square, zero-padded crop) ----
    const landmarkModel = await getLandmarksDetector();
    const found: HandDetection[] = [];

    for (const palm of palms) {
      const input = sampleRoi(frame, palm.roi, LANDMARK_INPUT);
      const out = await landmarkModel.run([input.buffer as ArrayBuffer]);
      const det = decodeLandmarkOutput(out, palm.roi, frame);
      if (det) found.push(det);
    }

    // ---- Stage 3: de-duplicate and keep the best MAX_HANDS ----
    found.sort((a, b) => b.confidence - a.confidence);
    for (const cand of found) {
      if (hands.length >= MAX_HANDS) break;
      const bb = landmarkBox(cand.landmarks);
      if (hands.some((h) => iou(bb, landmarkBox(h.landmarks)) > HAND_DEDUPE_IOU)) continue;
      hands.push(cand);
    }
  } catch (err) {
    console.error('[handDetector] Detection pipeline error:', err);
  }

  return { hands, frameWidth: frame.width, frameHeight: frame.height };
}

/** Backwards-compatible wrapper. */
export async function detectHands(imageUri: string): Promise<HandDetection[]> {
  return (await detectHandsWithSize(imageUri)).hands;
}

/* ------------------------------------------------------------------ */

function landmarkBox(lms: Landmark[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of lms) {
    if (l.x < minX) minX = l.x;
    if (l.y < minY) minY = l.y;
    if (l.x > maxX) maxX = l.x;
    if (l.y > maxY) maxY = l.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function decodePalmDetector(outputs: ArrayBuffer[], letterbox: Roi): PalmCandidate[] {
  if (!outputs || outputs.length < 2) return [];

  const buf0 = outputs[0];
  const buf1 = outputs[1];
  const regRaw = new Float32Array(buf0.byteLength > buf1.byteLength ? buf0 : buf1);
  const scoresRaw = new Float32Array(buf0.byteLength > buf1.byteLength ? buf1 : buf0);
  const anchors = getAnchors();
  const n = Math.min(anchors.length, scoresRaw.length);

  const cands: PalmCandidate[] = [];

  for (let i = 0; i < n; i++) {
    const score = 1 / (1 + Math.exp(-scoresRaw[i]));
    if (score < PALM_SCORE_THRESHOLD) continue;

    const off = i * 18;
    if (off + 9 >= regRaw.length) continue;
    const an = anchors[i];

    // Everything below is in letterbox-normalised coords (0..1)
    const xc = regRaw[off] / DETECTOR_INPUT * an.w + an.x;
    const yc = regRaw[off + 1] / DETECTOR_INPUT * an.h + an.y;
    const w = regRaw[off + 2] / DETECTOR_INPUT * an.w;
    const h = regRaw[off + 3] / DETECTOR_INPUT * an.h;
    const kp0x = regRaw[off + 4] / DETECTOR_INPUT * an.w + an.x; // wrist
    const kp0y = regRaw[off + 5] / DETECTOR_INPUT * an.h + an.y;
    const kp2x = regRaw[off + 8] / DETECTOR_INPUT * an.w + an.x; // middle MCP
    const kp2y = regRaw[off + 9] / DETECTOR_INPUT * an.h + an.y;

    // To frame pixels
    const [cx, cy] = roiToFrame(letterbox, xc, yc);
    const [wx, wy] = roiToFrame(letterbox, kp0x, kp0y);
    const [mx, my] = roiToFrame(letterbox, kp2x, kp2y);
    const wPx = w * letterbox.side;
    const hPx = h * letterbox.side;

    // Rotation: wrist -> middle MCP should point "up" in the crop
    let ux = mx - wx;
    let uy = my - wy;
    const len = Math.hypot(ux, uy);
    if (len < 1e-3) {
      ux = 0;
      uy = -1;
    } else {
      ux /= len;
      uy /= len;
    }

    const palmSize = Math.max(wPx, hPx);
    if (palmSize < 8) continue;

    cands.push({
      score,
      box: { x: cx - wPx / 2, y: cy - hPx / 2, w: wPx, h: hPx },
      roi: {
        cx: cx + ux * ROI_SHIFT * palmSize,
        cy: cy + uy * ROI_SHIFT * palmSize,
        side: palmSize * ROI_SCALE,
        ux,
        uy,
      },
    });
  }

  cands.sort((a, b) => b.score - a.score);

  const selected: PalmCandidate[] = [];
  for (const c of cands) {
    if (selected.length >= MAX_PALM_CANDIDATES) break;
    if (selected.some((s) => iou(c.box, s.box) > PALM_NMS_IOU)) continue;
    selected.push(c);
  }
  return selected;
}

function decodeLandmarkOutput(
  outputs: ArrayBuffer[],
  roi: Roi,
  frame: Frame,
): HandDetection | null {
  try {
    if (!outputs || outputs.length === 0) return null;

    let raw: Float32Array | null = null;
    for (const buf of outputs) {
      const f = new Float32Array(buf);
      if (f.length === 63) {
        let maxVal = 0;
        for (let i = 0; i < 63; i++) maxVal = Math.max(maxVal, Math.abs(f[i]));
        if (maxVal > 1.0) raw = f; // pixel-space landmarks, not world landmarks
      }
    }
    if (!raw && outputs[0]) raw = new Float32Array(outputs[0]);
    if (!raw || raw.length < 63) return null;

    let flag = 1.0;
    let handedness: 'Left' | 'Right' = 'Right';
    if (outputs.length > 1) {
      const f1 = new Float32Array(outputs[1]);
      if (f1.length === 1) flag = f1[0];
    }
    if (flag < LANDMARK_FLAG_THRESHOLD) return null;
    if (outputs.length > 2) {
      const f2 = new Float32Array(outputs[2]);
      if (f2.length === 1) handedness = f2[0] > 0.5 ? 'Right' : 'Left';
    }

    const landmarks: Landmark[] = [];
    for (let i = 0; i < 21; i++) {
      const u = raw[i * 3] / LANDMARK_INPUT;
      const v = raw[i * 3 + 1] / LANDMARK_INPUT;
      const z = raw[i * 3 + 2] / LANDMARK_INPUT;

      const [px, py] = roiToFrame(roi, u, v);
      landmarks.push({
        x: px / frame.width,
        y: py / frame.height,
        // MediaPipe scales z like x: (z/224) * roiWidth, in image-width units
        z: (z * roi.side) / frame.width,
      });
    }

    return { landmarks, handedness, confidence: flag };
  } catch (e) {
    console.error('[handDetector] decode landmarks error:', e);
    return null;
  }
}