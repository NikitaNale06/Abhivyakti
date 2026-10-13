import scalerData from '../assets/models/isl_scaler.json';

const MEAN: number[] = scalerData.mean;
const SCALE: number[] = scalerData.scale;
const FEATURE_DIM: number = scalerData.feature_dim;

export function getFeatureDim(): number {
  return FEATURE_DIM;
}

/**
 * Apply StandardScaler:
 *   scaled[i] = (feature[i] - mean[i]) / scale[i]
 */
export function applyScaler(features: number[]): number[] {
  if (features.length !== FEATURE_DIM) {
    throw new Error(`Expected ${FEATURE_DIM} features, got ${features.length}`);
  }

  const out = new Array<number>(FEATURE_DIM);
  for (let i = 0; i < FEATURE_DIM; i++) {
    const s = SCALE[i] || 1;
    out[i] = (features[i] - MEAN[i]) / s;
  }
  return out;
}