import type { TensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';

let handDetector: TensorflowModel | null = null;
let landmarksDetector: TensorflowModel | null = null;
let classifier: TensorflowModel | null = null;

function getLoadTensorflowModel() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fastTflite = require('react-native-fast-tflite');
    return fastTflite.loadTensorflowModel;
  } catch (err: any) {
    console.warn('[tfliteModels] Fast TFLite native module (NitroModules) not found:', err?.message ?? err);
    throw new Error(
      'Fast TFLite native module is not available in this build. Please run a native dev build using `npx expo run:android`.'
    );
  }
}

/**
 * Resolve a require()'d asset to a local file:// URI that works in
 * both dev builds (Metro) and standalone/EAS preview APKs.
 *
 * In a standalone build, Image.resolveAssetSource() may return an
 * HTTP URI pointing at a non-existent dev server. expo-asset's
 * downloadAsync() resolves the embedded asset to a local file path.
 */
async function resolveModelSource(moduleId: number): Promise<{ url: string }> {
  const [asset] = await Asset.loadAsync(moduleId);
  if (!asset?.localUri) {
    throw new Error(`Failed to resolve local URI for asset ${moduleId}`);
  }
  return { url: asset.localUri };
}

export async function getHandDetector(): Promise<TensorflowModel> {
  if (handDetector) return handDetector;
  const loadTensorflowModel = getLoadTensorflowModel();
  const source = await resolveModelSource(
    require('../assets/models/hand_detector.tflite'),
  );
  const model = await loadTensorflowModel(source, []);
  if (!model) throw new Error('Failed to load hand detector model');
  handDetector = model;
  return model;
}

export async function getLandmarksDetector(): Promise<TensorflowModel> {
  if (landmarksDetector) return landmarksDetector;
  const loadTensorflowModel = getLoadTensorflowModel();
  const source = await resolveModelSource(
    require('../assets/models/hand_landmarks_detector.tflite'),
  );
  const model = await loadTensorflowModel(source, []);
  if (!model) throw new Error('Failed to load hand landmarks detector model');
  landmarksDetector = model;
  return model;
}

export async function getClassifier(): Promise<TensorflowModel> {
  if (classifier) return classifier;
  const loadTensorflowModel = getLoadTensorflowModel();
  const source = await resolveModelSource(
    require('../assets/models/isl_landmark_model.tflite'),
  );
  const model = await loadTensorflowModel(source, []);
  if (!model) throw new Error('Failed to load ISL classifier model');
  classifier = model;
  return model;
}

export function getModelInfo() {
  return {
    handDetectorLoaded: handDetector !== null,
    landmarksDetectorLoaded: landmarksDetector !== null,
    classifierLoaded: classifier !== null,
  };
}
