import labelsData from '../assets/models/isl_labels.json';
import { getClassifier } from './tfliteModels';
import { applyScaler } from './islScaler';

const LABELS: string[] = labelsData.classes;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.50;

export interface Prediction {
  sign: string;
  confidence: number;
  alternatives: { sign: string; confidence: number }[];
}

/**
 * Run classifier on 130 raw features.
 * Returns top prediction + alternatives.
 */
export async function classify(
  features130: number[],
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): Promise<Prediction | null> {
  const model = await getClassifier();
  const scaled = applyScaler(features130);

  // Convert to Float32Array
  const input = new Float32Array(scaled);

  // Run inference
  const outputs = await model.run([input.buffer as ArrayBuffer]);
  if (!outputs || outputs.length === 0) return null;

  const rawOut = new Float32Array(outputs[0]);
  if (rawOut.length === 0) return null;

  // Verify softmax vs logits
  let sum = 0;
  for (let i = 0; i < rawOut.length; i++) sum += rawOut[i];

  let probs: Float32Array = rawOut;
  if (Math.abs(sum - 1.0) > 0.05) {
    let maxLogit = -Infinity;
    for (let i = 0; i < rawOut.length; i++) {
      if (rawOut[i] > maxLogit) maxLogit = rawOut[i];
    }
    const exp = new Float32Array(rawOut.length);
    let expSum = 0;
    for (let i = 0; i < rawOut.length; i++) {
      exp[i] = Math.exp(rawOut[i] - maxLogit);
      expSum += exp[i];
    }
    for (let i = 0; i < rawOut.length; i++) {
      exp[i] /= expSum || 1;
    }
    probs = exp;
  }

  // Find top-3
  const indexed = Array.from(probs).map((p, i) => ({
    idx: i,
    p: Number.isFinite(p) ? p : 0,
  }));
  indexed.sort((a, b) => b.p - a.p);
  const top3 = indexed.slice(0, 3);

  const best = top3[0];
  if (!best || best.p < confidenceThreshold || !LABELS[best.idx]) {
    return null; // low confidence
  }

  return {
    sign: LABELS[best.idx],
    confidence: best.p,
    alternatives: top3.slice(1).map(({ idx, p }) => ({
      sign: LABELS[idx] ?? '',
      confidence: p,
    })),
  };
}