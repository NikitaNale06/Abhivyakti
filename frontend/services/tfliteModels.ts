import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

let handDetector: TensorflowModel | null = null;
let landmarksDetector: TensorflowModel | null = null;
let classifier: TensorflowModel | null = null;

export async function getHandDetector(): Promise<TensorflowModel> {
  if (handDetector) return handDetector;
  handDetector = await loadTensorflowModel(
    require('../assets/models/hand_detector.tflite'),
    [],
  );
  return handDetector;
}

export async function getLandmarksDetector(): Promise<TensorflowModel> {
  if (landmarksDetector) return landmarksDetector;
  landmarksDetector = await loadTensorflowModel(
    require('../assets/models/hand_landmarks_detector.tflite'),
    [],
  );
  return landmarksDetector;
}

export async function getClassifier(): Promise<TensorflowModel> {
  if (classifier) return classifier;
  classifier = await loadTensorflowModel(
    require('../assets/models/isl_landmark_model.tflite'),
    [],
  );
  return classifier;
}

export function getModelInfo() {
  return {
    handDetectorLoaded: handDetector !== null,
    landmarksDetectorLoaded: landmarksDetector !== null,
    classifierLoaded: classifier !== null,
  };
}