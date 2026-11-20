"""Background worker: grab the screen -> find hands (MediaPipe) -> classify the letter."""
import json
import shutil
import sys
import threading
import time
from pathlib import Path

from .core import CaptionState, ISLClassifier, landmarks_to_features

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
             "hand_landmarker/float16/1/hand_landmarker.task")


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parent.parent


def models_dir() -> Path:
    return app_dir() / "models"


def list_monitors():
    """Physical monitors as [{'left','top','width','height'}, ...] (empty list if mss is missing)."""
    try:
        import mss
        with mss.mss() as sct:
            return [dict(left=int(m["left"]), top=int(m["top"]), width=int(m["width"]), height=int(m["height"]))
                    for m in sct.monitors[1:]]
    except Exception:
        return []


class Engine(threading.Thread):
    """Messages are put on `out_q` as tuples:
        ('status', 'loading'|'ready'|'error', text)
        ('live', label|None, confidence, hands)
        ('letter', text)
        ('capture_error', text)
    """

    def __init__(self, out_q, cfg):
        super().__init__(daemon=True, name="abhivyakta-engine")
        self.q = out_q
        self.cfg = cfg                      # shared dict, the UI updates it at any time
        self.run_evt = threading.Event()    # set = capturing, clear = paused
        self.quit = False
        self._reset = False

    # ----- controls (called from the UI thread) -----
    def start_capture(self):
        self.run_evt.set()

    def stop_capture(self):
        self.run_evt.clear()

    def reset_caption(self):
        self._reset = True

    def shutdown(self):
        self.quit = True
        self.run_evt.set()

    # ----- internals -----
    def post(self, *msg):
        self.q.put(msg)

    def run(self):
        try:
            self._load()
        except Exception as e:  # noqa: BLE001 - shown to the user
            self.post("status", "error", str(e))
            return
        self.post("status", "ready", "")
        try:
            self._loop()
        except Exception as e:  # noqa: BLE001
            self.post("capture_error", f"Unexpected error: {e}")

    def _ensure_task(self, path: Path):
        if path.exists() and path.stat().st_size > 1_000_000:
            return
        self.post("status", "loading", "Downloading the hand model (one time, about 8 MB)...")
        import urllib.request
        tmp = path.with_suffix(".part")
        try:
            with urllib.request.urlopen(MODEL_URL, timeout=30) as r, open(tmp, "wb") as f:
                shutil.copyfileobj(r, f)
            tmp.replace(path)
        except Exception as e:  # noqa: BLE001
            try:
                tmp.unlink()
            except OSError:
                pass
            raise RuntimeError(
                f"Could not download hand_landmarker.task ({e}). Download it from {MODEL_URL} "
                f"and put it in the 'models' folder, then restart the app.")

    def _load(self):
        self.post("status", "loading", "Loading models...")
        try:
            import numpy as np
            from PIL import Image
            import mss
            import mediapipe as mp
            from mediapipe.tasks import python as mpp
            from mediapipe.tasks.python import vision
        except ImportError as e:
            raise RuntimeError(f"Missing package '{e.name}'. Run:  pip install -r requirements.txt")
        self.np, self.Image, self.mss, self.mp = np, Image, mss, mp

        md = models_dir()
        try:
            meta = json.loads((md / "isl_meta.json").read_text(encoding="utf-8"))
            weights = (md / "isl_mlp.bin").read_bytes()
        except OSError as e:
            raise RuntimeError(f"Missing model file: {e.filename}")
        self.clf = ISLClassifier(meta, weights)

        task = md / "hand_landmarker.task"
        self._ensure_task(task)
        self.post("status", "loading", "Starting the hand model...")
        opts = vision.HandLandmarkerOptions(
            base_options=mpp.BaseOptions(model_asset_buffer=task.read_bytes()),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.35,
            min_hand_presence_confidence=0.35,
            min_tracking_confidence=0.5,
        )
        self.lm = vision.HandLandmarker.create_from_options(opts)

    def _loop(self):
        np, Image, mp = self.np, self.Image, self.mp
        resample = getattr(Image, "Resampling", Image).BILINEAR
        cap = CaptionState()
        sct = self.mss.mss()          # mss handles are thread-bound, so it is created here
        was_running = False
        fails = 0
        while not self.quit:
            if not self.run_evt.is_set():
                if was_running:
                    was_running = False
                    self.post("live", None, 0.0, 0)
                self.run_evt.wait(0.2)
                continue
            if not was_running:
                was_running = True
                fails = 0
                cap.reset()
                self.post("live", None, 0.0, 0)
            t0 = time.perf_counter()
            cfg = self.cfg
            if self._reset:
                self._reset = False
                cap.reset()
            cap.min_conf = float(cfg.get("minConf", 0.75))
            cap.hold_ms = float(cfg.get("holdMs", 300))
            cap.space_ms = float(cfg.get("spaceMs", 1500))
            try:
                shot = sct.grab(cfg["rect"])
                img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
                w, h = shot.size
                k = min(1.0, float(cfg.get("maxSide", 1280)) / max(w, h))
                if k < 1.0:
                    img = img.resize((max(2, round(w * k)), max(2, round(h * k))), resample)
                arr = np.asarray(img)
                if cfg.get("mirror"):
                    arr = arr[:, ::-1]
                arr = np.ascontiguousarray(arr)
                fw, fh = img.size
                res = self.lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=arr))
            except Exception as e:  # noqa: BLE001
                fails += 1
                if fails >= 5:
                    self.run_evt.clear()
                    was_running = False
                    self.post("capture_error", f"Could not capture the screen: {e}")
                time.sleep(0.1)
                continue
            fails = 0
            hands = [[(p.x, p.y, p.z) for p in hl] for hl in res.hand_landmarks]
            feat = landmarks_to_features(hands, fw, fh)
            if feat is None:
                label, conf, r = None, 0.0, None
            else:
                label, conf = self.clf.classify(feat)
                r = (label, conf)
            add = cap.update(r, time.monotonic() * 1000.0)
            self.post("live", label, conf, len(hands))
            if add:
                self.post("letter", add)
            spare = 0.045 - (time.perf_counter() - t0)
            if spare > 0:
                time.sleep(spare)
