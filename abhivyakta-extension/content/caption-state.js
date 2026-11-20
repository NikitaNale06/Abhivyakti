(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ISLCaption = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Same logic as realtime_isl.py: confidence >= minConf and the same label held
  // before it is committed; commits once until the label changes or the hand leaves.
  class CaptionState {
    constructor(opts) { this.opts = Object.assign({ minConf: 0.70, holdMs: 300, minSamples: 2, spaceMs: 1500 }, opts); this.reset(); }
    reset() { this.text = ''; this.cand = null; this.count = 0; this.candSince = null; this.locked = false; this.noHandSince = null; this.live = null; }
    update(r, now) {
      const o = this.opts; let add = '';
      if (!r || !r.hasHand) {
        this.cand = null; this.count = 0; this.locked = false; this.live = null;
        if (this.noHandSince == null) this.noHandSince = now;
        if (this.text && !this.text.endsWith(' ') && now - this.noHandSince >= o.spaceMs) { this.text += ' '; add = ' '; }
        return add;
      }
      this.noHandSince = null; this.live = { label: r.label, conf: r.conf };
      if (r.conf >= o.minConf) {
        if (r.label === this.cand) { this.count++; if (this.candSince == null) this.candSince = now; }
        else { this.cand = r.label; this.count = 1; this.candSince = now; this.locked = false; }
        if (!this.locked && this.count >= o.minSamples && now - this.candSince >= o.holdMs) {
          this.text += r.label; this.locked = true; add = r.label;
          if (this.text.length > 300) this.text = this.text.slice(-200);
        }
      } else { this.count = 0; this.candSince = null; }
      return add;
    }
  }
  return { CaptionState };
});
