import argparse
from pathlib import Path

import cv2
import joblib
import numpy as np
import tensorflow as tf

from isl_features import make_detector, detect_features, draw_hands

ap = argparse.ArgumentParser()
ap.add_argument("--model_dir", default=".")
ap.add_argument("--camera", type=int, default=0)
ap.add_argument("--stable", type=int, default=7, help="frames the same label must hold")
ap.add_argument("--min_conf", type=float, default=0.75)
ap.add_argument("--mirror", action="store_true",
                help="flip frames before prediction (use if the training photos were mirrored)")
args = ap.parse_args()

model_dir = Path(args.model_dir)
model = tf.keras.models.load_model(model_dir / "isl_landmark_model.keras")
scaler = joblib.load(model_dir / "isl_scaler.pkl")
encoder = joblib.load(model_dir / "isl_label_encoder.pkl")

detector = make_detector(static=False, det_conf=0.35)
cap = cv2.VideoCapture(args.camera)

text = ""
last_label = None
streak = 0
locked = False

while True:
    ok, frame = cap.read()
    if not ok:
        break

    proc = cv2.flip(frame, 1) if args.mirror else frame
    feat, lms = detect_features(proc, detector)
    label, conf = "-", 0.0

    if feat is not None:
        probs = model(scaler.transform(feat[None]).astype(np.float32), training=False).numpy()[0]
        k = int(probs.argmax())
        label = str(encoder.classes_[k])
        conf = float(probs[k])

        if conf >= args.min_conf:
            if label == last_label:
                streak += 1
            else:
                last_label = label
                streak = 1
                locked = False

            if streak >= args.stable and not locked:
                text += label
                locked = True
        else:
            streak = 0

        draw_hands(proc, lms)
    else:
        last_label = None
        streak = 0
        locked = False

    view = proc if args.mirror else cv2.flip(proc, 1)
    cv2.putText(view, f"{label}  {conf:.2f}", (10, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
    cv2.putText(view, text[-40:], (10, view.shape[0] - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

    cv2.imshow("ISL classifier", view)

    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break
    if key == ord("c"):
        text = ""
    elif key == ord("b"):
        text = text[:-1]
    elif key == ord(" "):
        text += " "

cap.release()
detector.close()
cv2.destroyAllWindows()
