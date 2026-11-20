import { FilesetResolver, HandLandmarker } from '../lib/vision_bundle.mjs';

const say = (m) => parent.postMessage(m, '*');
let landmarker = null, classifier = null, canvas = null;

async function init() {
  say({ type: 'status', state: 'loading', message: 'Loading models…' });
  const get = async (p) => {
    const r = await fetch(new URL('../models/' + p, location.href));
    if (!r.ok) throw new Error('Missing file: models/' + p);
    return r;
  };
  const meta = await (await get('isl_meta.json')).json();
  classifier = new ISLCore.ISLClassifier(meta, await (await get('isl_mlp.bin')).arrayBuffer());
  let task;
  try { task = new Uint8Array(await (await get('hand_landmarker.task')).arrayBuffer()); }
  catch (e) { throw new Error('Copy hand_landmarker.task into the extension\'s models/ folder, then reload the extension.'); }
  const fileset = await FilesetResolver.forVisionTasks(new URL('../lib/wasm', location.href).href);
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: task, delegate: 'CPU' },
    runningMode: 'IMAGE',
    numHands: 2,
    minHandDetectionConfidence: 0.35,
    minHandPresenceConfidence: 0.35,
    minTrackingConfidence: 0.5,
  });
  say({ type: 'status', state: 'ready' });
}

function handle(d) {
  const { id, seq, bitmap, mirror } = d;
  try {
    const w = bitmap.width, h = bitmap.height;
    let input = bitmap;
    if (mirror) {
      canvas = canvas || new OffscreenCanvas(w, h);
      canvas.width = w; canvas.height = h;
      const c = canvas.getContext('2d'); c.setTransform(-1, 0, 0, 1, w, 0); c.drawImage(bitmap, 0, 0);
      input = canvas;
    }
    const res = landmarker.detect(input);
    const feat = ISLCore.landmarksToFeatures(res.landmarks, w, h);
    if (!feat) return say({ type: 'result', id, seq, hasHand: false });
    const { label, conf } = classifier.classify(feat);
    say({ type: 'result', id, seq, hasHand: true, n: res.landmarks.length, label, conf });
  } catch (e) {
    say({ type: 'error', id, seq, message: String(e && e.message || e) });
  } finally { try { bitmap.close(); } catch (_) {} }
}

addEventListener('message', (e) => {
  if (e.source !== parent) return;
  if (e.data && e.data.type === 'frame' && landmarker) handle(e.data);
  else if (e.data && e.data.type === 'frame') { try { e.data.bitmap.close(); } catch (_) {} say({ type: 'error', id: e.data.id, seq: e.data.seq, message: 'engine not ready' }); }
});

init().catch((e) => say({ type: 'status', state: 'error', message: String(e && e.message || e) }));
