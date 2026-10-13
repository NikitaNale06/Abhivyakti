import labelsData from '../assets/models/isl_labels.json';
import { getClassifier } from './tfliteModels';
import { applyScaler } from './islScaler';

const LABELS: string[] = labelsData.classes;
const CONFIDENCE_THRESHOLD = 0.35;

export interface Prediction {
  sign: string;
  confidence: number;
  alternatives: { sign: string; confidence: number }[];
}

/**
 * Run classifier on 130 raw features.
 * Returns top prediction + alternatives.
 */
export async function classify(features130: number[]): Promise<Prediction | null> {
  const model = await getClassifier();
  const scaled = applyScaler(features130);

  // Convert to Float32Array
  const input = new Float32Array(scaled);

  // Run inference
  const outputs = await model.run([input.buffer]);
  const probs = new Float32Array(outputs[0]);

  // Find top-3
  const indexed = Array.from(probs).map((p, i) => ({ idx: i, p }));
  indexed.sort((a, b) => b.p - a.p);
  const top3 = indexed.slice(0, 3);

  const best = top3[0];
  if (best.p < CONFIDENCE_THRESHOLD) {
    return null; // low confidence
  }

  return {
    sign: LABELS[best.idx],
    confidence: best.p,
    alternatives: top3.slice(1).map(({ idx, p }) => ({
      sign: LABELS[idx],
      confidence: p,
    })),
  };
}