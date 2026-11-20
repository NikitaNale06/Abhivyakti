"""ISL fingerspelling core: feature extraction, classifier and letter-hold logic.

This is a direct Python port of the browser extension's engine/isl-core.js and
content/caption-state.js, so both apps read signs the same way.
"""
import numpy as np

FEATURE_DIM = 130
MIN_HAND_PX = 5.0
DIMS = (130, 256, 128, 64, 36)


def _hand_scale(p):
    """p: float32 array (21, 3) in pixel units."""
    wm = float(np.hypot(p[9, 0] - p[0, 0], p[9, 1] - p[0, 1]))     # |p9 - p0|
    pw = float(np.hypot(p[5, 0] - p[17, 0], p[5, 1] - p[17, 1]))   # |p5 - p17|
    return 0.5 * (wm + pw)


def landmarks_to_features(hands_lm, width, height):
    """hands_lm: [[(x, y, z) * 21], ...] normalised landmarks. Returns float32[130] or None."""
    if not hands_lm:
        return None
    hands = []
    for hl in hands_lm:
        p = np.empty((21, 3), dtype=np.float32)
        for i, (x, y, z) in enumerate(hl):
            p[i] = (x * width, y * height, z * width)
        if _hand_scale(p) >= MIN_HAND_PX:
            hands.append(p)
    if not hands:
        return None
    hands.sort(key=lambda a: float(a[0, 0]))
    hands = hands[:2]
    feat = np.zeros(FEATURE_DIM, dtype=np.float32)
    scales = []
    for i, p in enumerate(hands):
        s = _hand_scale(p)
        feat[i * 63:(i + 1) * 63] = ((p - p[0]) / s).reshape(-1)
        feat[126 + i] = 1.0
        scales.append(s)
    if len(hands) == 2:
        m = (scales[0] + scales[1]) / 2.0
        feat[128] = (hands[1][0, 0] - hands[0][0, 0]) / m
        feat[129] = (hands[1][0, 1] - hands[0][0, 1]) / m
    return feat


class ISLClassifier:
    """StandardScaler + 130-256-128-64-36 MLP (BatchNorm already folded into the dense layers)."""

    def __init__(self, meta, weights: bytes):
        self.mean = np.asarray(meta["mean"], dtype=np.float32)
        self.scale = np.asarray(meta["scale"], dtype=np.float32)
        self.classes = list(meta["classes"])
        flat = np.frombuffer(weights, dtype="<f4")
        off = 0
        self.layers = []
        for i, o in zip(DIMS[:-1], DIMS[1:]):
            w = flat[off:off + i * o].reshape(i, o)
            off += i * o
            b = flat[off:off + o]
            off += o
            self.layers.append((w, b))
        if off != flat.size:
            raise ValueError("isl_mlp.bin size mismatch")

    def classify(self, feat):
        x = (feat - self.mean) / self.scale
        last = len(self.layers) - 1
        for n, (w, b) in enumerate(self.layers):
            x = x @ w + b
            if n < last:
                x = np.maximum(x, 0.0)
        x = x - x.max()
        e = np.exp(x)
        p = e / e.sum()
        k = int(p.argmax())
        return self.classes[k], float(p[k])


class CaptionState:
    """A letter is accepted once it is confident, held for a moment, and then locked
    until the sign changes or the hand leaves. A long pause with no hand adds a space."""

    def __init__(self, min_conf=0.75, hold_ms=300, min_samples=2, space_ms=1500):
        self.min_conf = min_conf
        self.hold_ms = hold_ms
        self.min_samples = min_samples
        self.space_ms = space_ms
        self.reset()

    def reset(self):
        self.text = ""
        self.cand = None
        self.count = 0
        self.cand_since = None
        self.locked = False
        self.no_hand_since = None

    def update(self, res, now_ms):
        """res: None (no hand) or (label, conf). Returns the text to append ('' if none)."""
        add = ""
        if res is None:
            self.cand = None
            self.count = 0
            self.locked = False
            if self.no_hand_since is None:
                self.no_hand_since = now_ms
            if self.text and not self.text.endswith(" ") and now_ms - self.no_hand_since >= self.space_ms:
                self.text += " "
                add = " "
            return add
        label, conf = res
        self.no_hand_since = None
        if conf >= self.min_conf:
            if label == self.cand:
                self.count += 1
                if self.cand_since is None:
                    self.cand_since = now_ms
            else:
                self.cand = label
                self.count = 1
                self.cand_since = now_ms
                self.locked = False
            if not self.locked and self.count >= self.min_samples and now_ms - self.cand_since >= self.hold_ms:
                self.text += label
                self.locked = True
                add = label
                if len(self.text) > 300:
                    self.text = self.text[-200:]
        else:
            self.count = 0
            self.cand_since = None
        return add
