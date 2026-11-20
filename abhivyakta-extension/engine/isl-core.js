(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ISLCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FEATURE_DIM = 130, MIN_HAND_PX = 5.0;

  // Port of _hand_scale() from isl_features.py (pts: Float32Array(63), pixel units)
  function handScale(p) {
    const wm = Math.fround(Math.hypot(p[27] - p[0], p[28] - p[1])); // |p9-p0|
    const pw = Math.fround(Math.hypot(p[15] - p[51], p[16] - p[52])); // |p5-p17|
    return 0.5 * (wm + pw);
  }

  // Port of landmarks_to_features(). handLandmarks: [[{x,y,z} x21], ...]
  function landmarksToFeatures(handLandmarks, width, height) {
    if (!handLandmarks || !handLandmarks.length) return null;
    let hands = [];
    for (const hl of handLandmarks) {
      const p = new Float32Array(63);
      for (let i = 0; i < 21; i++) {
        const l = hl[i];
        p[3 * i] = l.x * width; p[3 * i + 1] = l.y * height; p[3 * i + 2] = l.z * width;
      }
      if (handScale(p) >= MIN_HAND_PX) hands.push(p);
    }
    if (!hands.length) return null;
    hands.sort((a, b) => a[0] - b[0]);
    hands = hands.slice(0, 2);
    const feat = new Float32Array(FEATURE_DIM), scales = [];
    hands.forEach((p, i) => {
      const s = handScale(p), o = i * 63;
      for (let k = 0; k < 21; k++) {
        feat[o + 3 * k] = (p[3 * k] - p[0]) / s;
        feat[o + 3 * k + 1] = (p[3 * k + 1] - p[1]) / s;
        feat[o + 3 * k + 2] = (p[3 * k + 2] - p[2]) / s;
      }
      feat[126 + i] = 1; scales.push(s);
    });
    if (hands.length === 2) {
      const m = (scales[0] + scales[1]) / 2;
      feat[128] = (hands[1][0] - hands[0][0]) / m;
      feat[129] = (hands[1][1] - hands[0][1]) / m;
    }
    return feat;
  }

  // StandardScaler + 130-256-128-64-36 MLP (BatchNorm folded into the dense layers)
  class ISLClassifier {
    constructor(meta, weights, dims) {
      dims = dims || [130, 256, 128, 64, 36];
      this.mean = Float32Array.from(meta.mean); this.scale = Float32Array.from(meta.scale);
      this.classes = meta.classes; this.layers = [];
      const f = new Float32Array(weights); let off = 0;
      for (let l = 0; l < dims.length - 1; l++) {
        const i = dims[l], o = dims[l + 1];
        const W = f.subarray(off, off + i * o); off += i * o;
        const b = f.subarray(off, off + o); off += o;
        this.layers.push({ i, o, W, b });
      }
      if (off !== f.length) throw new Error('isl_mlp.bin size mismatch');
      this.bufs = dims.map((d) => new Float32Array(d));
    }
    classify(feat) {
      let x = this.bufs[0];
      for (let k = 0; k < FEATURE_DIM; k++) x[k] = (feat[k] - this.mean[k]) / this.scale[k];
      const last = this.layers.length - 1;
      for (let l = 0; l <= last; l++) {
        const { i, o, W, b } = this.layers[l], y = this.bufs[l + 1];
        y.set(b);
        for (let a = 0; a < i; a++) {
          const xv = x[a]; if (xv === 0) continue;
          const row = a * o;
          for (let j = 0; j < o; j++) y[j] += xv * W[row + j];
        }
        if (l < last) for (let j = 0; j < o; j++) if (y[j] < 0) y[j] = 0;
        x = y;
      }
      let max = -Infinity; for (const v of x) if (v > max) max = v;
      let sum = 0; const p = new Float32Array(x.length);
      for (let j = 0; j < x.length; j++) { p[j] = Math.exp(x[j] - max); sum += p[j]; }
      let k = 0; for (let j = 0; j < p.length; j++) { p[j] /= sum; if (p[j] > p[k]) k = j; }
      return { label: this.classes[k], conf: p[k], probs: p };
    }
  }
  return { landmarksToFeatures, ISLClassifier, FEATURE_DIM };
});
