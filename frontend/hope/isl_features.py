import urllib.request
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

FEATURE_VERSION = 2
N_LM = 21
FEATURE_DIM = 2 * N_LM * 3 + 2 + 2      # 130
MIN_HAND_PX = 5.0                        # ignore "hands" smaller than this (junk detections)

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/latest/hand_landmarker.task"
)
MODEL_PATH = Path(__file__).resolve().parent / "hand_landmarker.task"

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17),
]


def ensure_model():
    if not MODEL_PATH.exists() or MODEL_PATH.stat().st_size < 1_000_000:
        print("Downloading hand_landmarker.task ...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return str(MODEL_PATH)


class HandDetector:
    def __init__(self, static=True, max_hands=2, det_conf=0.35):
        self.static = static
        self.last_pad = False      # True if the last detection needed the padding fallback
        self._ts = 0
        opts = vision.HandLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=ensure_model()),
            running_mode=(
                vision.RunningMode.IMAGE if static else vision.RunningMode.VIDEO
            ),
            num_hands=max_hands,
            min_hand_detection_confidence=det_conf,
            min_hand_presence_confidence=det_conf,
            min_tracking_confidence=0.5,
        )
        self.lm = vision.HandLandmarker.create_from_options(opts)

    def detect(self, rgb):
        img = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=np.ascontiguousarray(rgb),
        )
        if self.static:
            res = self.lm.detect(img)
        else:
            self._ts += 33
            res = self.lm.detect_for_video(img, self._ts)
        return res.hand_landmarks

    def close(self):
        self.lm.close()


def make_detector(static=True, max_hands=2, det_conf=0.35):
    return HandDetector(static=static, max_hands=max_hands, det_conf=det_conf)


def draw_hands(frame_bgr, hand_landmarks):
    h, w = frame_bgr.shape[:2]
    for hl in hand_landmarks or []:
        pts = [(int(l.x * w), int(l.y * h)) for l in hl]
        for a, b in HAND_CONNECTIONS:
            cv2.line(frame_bgr, pts[a], pts[b], (0, 255, 0), 2)
        for p in pts:
            cv2.circle(frame_bgr, p, 3, (0, 0, 255), -1)


def _hand_scale(pts):
    # pts are in pixel units. Average of palm length and palm width.
    wrist_to_mcp = float(np.linalg.norm(pts[9, :2] - pts[0, :2]))
    palm_width = float(np.linalg.norm(pts[5, :2] - pts[17, :2]))
    return 0.5 * (wrist_to_mcp + palm_width)


def landmarks_to_features(hand_landmarks, width, height):
    """hand_landmarks: MediaPipe result; width/height: size of the image that was given to MediaPipe."""
    if not hand_landmarks:
        return None

    hands = []
    for hl in hand_landmarks:
        # MediaPipe x,y are normalised by width,height; z uses roughly the same scale as x.
        pts = np.array(
            [[l.x * width, l.y * height, l.z * width] for l in hl],
            dtype=np.float32,
        )
        if _hand_scale(pts) >= MIN_HAND_PX:
            hands.append(pts)

    if not hands:
        return None

    # Stable ordering: left-most wrist first.
    hands.sort(key=lambda p: float(p[0, 0]))
    hands = hands[:2]

    feat = np.zeros(FEATURE_DIM, dtype=np.float32)
    scales = []

    for i, pts in enumerate(hands):
        scale = _hand_scale(pts)
        rel = (pts - pts[0]) / scale
        feat[i * 63:(i + 1) * 63] = rel.reshape(-1)
        feat[126 + i] = 1.0
        scales.append(scale)

    if len(hands) == 2:
        feat[128:130] = (hands[1][0, :2] - hands[0][0, :2]) / float(np.mean(scales))

    return feat


def _run(img_bgr, detector):
    h, w = img_bgr.shape[:2]
    lms = detector.detect(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    return landmarks_to_features(lms, w, h), lms


def detect_features(img_bgr, detector, max_side=512, pad_fallback=False):
    h, w = img_bgr.shape[:2]
    m = max(h, w)
    if m > max_side:
        k = max_side / m
        img_bgr = cv2.resize(
            img_bgr, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA
        )

    detector.last_pad = False
    feat, lms = _run(img_bgr, detector)

    # Dataset images where the hand fills the whole frame are often missed.
    # Retry once with a grey border (static images only, never for live video).
    if feat is None and pad_fallback:
        h, w = img_bgr.shape[:2]
        p = int(0.4 * max(h, w))
        padded = cv2.copyMakeBorder(
            img_bgr, p, p, p, p, cv2.BORDER_CONSTANT, value=(127, 127, 127)
        )
        feat2, lms2 = _run(padded, detector)
        if feat2 is not None:
            detector.last_pad = True
            return feat2, lms2

    return feat, lms


def read_image(path):
    flags = cv2.IMREAD_COLOR
    try:
        # Big photos decode much faster with JPEG down-scaling; we shrink to 512 px anyway.
        if Path(path).stat().st_size > 1_500_000:
            flags = cv2.IMREAD_REDUCED_COLOR_2
    except OSError:
        pass
    return cv2.imread(str(path), flags)


def extract_from_path(path, detector, pad_fallback=True):
    img = read_image(path)
    if img is None:
        return None
    feat, _ = detect_features(img, detector, pad_fallback=pad_fallback)
    return feat


# ---- helpers for the multiprocessing pool used in the notebook ----
_WORKER_DET = None


def init_worker(det_conf=0.35):
    global _WORKER_DET
    _WORKER_DET = make_detector(static=True, det_conf=det_conf)


def extract_worker(path):
    feat = extract_from_path(path, _WORKER_DET, pad_fallback=True)
    return feat, bool(feat is not None and _WORKER_DET.last_pad)
