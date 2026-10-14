import type { TensorflowModel } from 'react-native-fast-tflite';

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

export async function getHandDetector(): Promise<TensorflowModel> {
  if (handDetector) return handDetector;
  const loadTensorflowModel = getLoadTensorflowModel();
  const model = await loadTensorflowModel(
    require('../assets/models/hand_detector.tflite'),
    [],
  );
  if (!model) throw new Error('Failed to load hand detector model');
  handDetector = model;
  return model;
}

export async function getLandmarksDetector(): Promise<TensorflowModel> {
  if (landmarksDetector) return landmarksDetector;
  const loadTensorflowModel = getLoadTensorflowModel();
  const model = await loadTensorflowModel(
    require('../assets/models/hand_landmarks_detector.tflite'),
    [],
  );
  if (!model) throw new Error('Failed to load hand landmarks detector model');
  landmarksDetector = model;
  return model;
}

export async function getClassifier(): Promise<TensorflowModel> {
  if (classifier) return classifier;
  const loadTensorflowModel = getLoadTensorflowModel();
  const model = await loadTensorflowModel(
    require('../assets/models/isl_landmark_model.tflite'),
    [],
  );
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