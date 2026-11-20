(() => {
  if (window.__abhLoaded) return; window.__abhLoaded = true;
  const EXT_ORIGIN = new URL(chrome.runtime.getURL('/')).origin;
  const DEFAULTS = { enabled: true, mode: 'all', minConf: 0.75, holdMs: 300, spaceMs: 1500, mirror: false, maxSide: 512, theme: 'system', pw2: 1, ph2: 84 };
  const MAX_VIDEOS = 4, MIN_GAP_MS = 33, MIN_W = 200, MIN_H = 120, MIN_PW = 240, MIN_PH = 64;
  let settings = { ...DEFAULTS };
  const tracks = new Map();          // video -> Track
  const saved = new WeakMap();       // video -> {text, pref, minimized}  (survives scrolling out of view)
  const hosts = new Set();           // our overlay hosts (for the keyboard shield)
  let engine = null, seq = 0, rr = 0, idleSince = null;

  // ---------- keyboard shield: typing in our box must never trigger YouTube/Meet shortcuts ----------
  const shield = (e) => { const p = e.composedPath && e.composedPath(); if (p && p.some((n) => hosts.has(n))) e.stopImmediatePropagation(); };
  ['keydown', 'keyup', 'keypress'].forEach((t) => window.addEventListener(t, shield, true));

  // ---------- settings ----------
  const applySettings = () => { tracks.forEach((t) => { Object.assign(t.cap.opts, { minConf: +settings.minConf, holdMs: +settings.holdMs, spaceMs: +settings.spaceMs }); t.ui.render(); }); };
  try {
    chrome.storage.local.get(DEFAULTS).then((s) => { settings = { ...DEFAULTS, ...s }; applySettings(); });
    chrome.storage.onChanged.addListener((ch) => {
      for (const k in ch) settings[k] = ch[k].newValue;
      applySettings(); if (!settings.enabled) removeAll();
    });
  } catch (_) {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', () => tracks.forEach((t) => t.ui.render()));
  const isDark = () => settings.theme === 'dark' || (settings.theme !== 'light' && mq.matches);

  // ---------- engine (hand model runs in an extension iframe: immune to page CSP) ----------
  function ensureEngine() {
    if (engine) return engine;
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('engine/engine.html');
    iframe.setAttribute('aria-hidden', 'true'); iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;border:0;opacity:0.01;pointer-events:none;z-index:-1;';
    document.documentElement.appendChild(iframe);
    engine = { iframe, state: 'loading', message: 'Loading hand model…', waiter: null };
    return engine;
  }
  function disposeEngine() { if (engine) { engine.iframe.remove(); engine = null; } }
  window.addEventListener('message', (e) => {
    if (!engine || e.origin !== EXT_ORIGIN || e.source !== engine.iframe.contentWindow) return;
    const d = e.data || {};
    if (d.type === 'status') { engine.state = d.state; engine.message = d.message || ''; tracks.forEach((t) => t.ui.render()); }
    else if ((d.type === 'result' || d.type === 'error') && engine.waiter && d.seq === engine.waiter.seq) {
      const w = engine.waiter; engine.waiter = null; clearTimeout(w.timer); w.resolve(d);
    }
  });
  function request(track, bitmap) {
    return new Promise((resolve) => {
      const my = ++seq;
      const timer = setTimeout(() => { if (engine && engine.waiter && engine.waiter.seq === my) { engine.waiter = null; resolve({ type: 'error', message: 'timeout' }); } }, 4000);
      engine.waiter = { seq: my, resolve, timer };
      engine.iframe.contentWindow.postMessage({ type: 'frame', id: track.id, seq: my, bitmap, mirror: !!settings.mirror }, EXT_ORIGIN, [bitmap]);
    });
  }

  // ---------- overlay UI ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    back: ['M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z', 'M17 9.5l-5 5', 'M12 9.5l5 5'],
    trash: ['M4 7h16', 'M9 7V4.5h6V7', 'M6 7l1 13h10l1-13', 'M10 11v5', 'M14 11v5'],
    copy: ['M9 9h11v11H9z', 'M5 15V4h11'],
    save: ['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 20h14'],
    min: ['M6 12h12'],
    dock: ['M4 5h16v14H4z', 'M4 15h16'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
  };
  function svg(keys, size) {
    const s = document.createElementNS(SVGNS, 'svg');
    for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', size || 14], ['height', size || 14], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]) s.setAttribute(k, v);
    for (const d of keys) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.appendChild(p); }
    return s;
  }
  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box}
  .wrap{--bg:#fff;--field:#f4f4f5;--border:#e4e4e7;--text:#18181b;--muted:#71717a;--accent:#ea580c;--soft:#fff1e8;--shadow:0 2px 10px rgba(0,0,0,.18);
    font:13px/1.2 system-ui,'Segoe UI',Roboto,Arial,sans-serif;color:var(--text)}
  .wrap.dark{--bg:#18181b;--field:#232327;--border:#34343a;--text:#f4f4f5;--muted:#a1a1aa;--accent:#fb7a3c;--soft:#2b2119;--shadow:0 2px 10px rgba(0,0,0,.5)}
  .panel{position:absolute;left:0;top:0;display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow);pointer-events:auto;overflow:hidden}
  .head{display:flex;align-items:center;gap:8px;height:32px;flex:none;padding:0 6px 0 8px;cursor:grab;touch-action:none;user-select:none;border-bottom:1px solid var(--border)}
  .head.drag{cursor:grabbing}
  .logo{flex:none;width:18px;height:18px;border-radius:5px;display:grid;place-items:center;color:#fff;background:var(--accent);font:600 12px/1 'Noto Sans Devanagari','Nirmala UI',system-ui,sans-serif}
  .title{flex:none;font-weight:600;font-size:13px}
  .stat{flex:1;min-width:0;display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden}
  .stat span{overflow:hidden;text-overflow:ellipsis}
  .dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--muted)}
  .dot.ok{background:#22c55e}.dot.load{background:#f59e0b}.dot.err{background:#ef4444}
  .live{flex:none;display:flex;align-items:baseline;gap:4px;padding:2px 8px;border-radius:6px;background:var(--soft);color:var(--accent);min-width:50px;justify-content:center}
  .live b{font-size:14px;font-weight:700;min-width:10px;text-align:center}.live i{font-size:11px;font-style:normal}
  .live.off{opacity:.5}
  .btns{flex:none;display:flex;gap:2px}
  button{all:unset;box-sizing:border-box;cursor:pointer;display:grid;place-items:center;width:24px;height:24px;border-radius:6px;color:var(--muted)}
  button:hover{color:var(--text);background:var(--field)}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  button.ok{color:#16a34a}
  .hidden{display:none!important}
  .note{flex:none;margin:6px 8px 0;padding:5px 8px;border-radius:6px;background:var(--soft);color:var(--accent);font-size:12px;line-height:1.3}
  .note.err{background:rgba(239,68,68,.12);color:#dc2626}.wrap.dark .note.err{color:#f87171}
  .body{flex:1;min-height:0;padding:6px 8px 8px;display:flex}
  textarea{all:unset;box-sizing:border-box;flex:1;min-width:0;width:100%;height:100%;padding:5px 8px;border-radius:6px;background:var(--field);border:1px solid transparent;color:var(--text);font:500 16px/1.35 system-ui,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.03em;white-space:pre-wrap;overflow-wrap:anywhere;overflow-y:auto;cursor:text;user-select:text;-webkit-user-select:text}
  textarea:focus{border-color:var(--accent)}
  textarea::placeholder{font:400 13px/1.35 system-ui,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:0;color:var(--muted);opacity:1}
  .grip{position:absolute;right:1px;bottom:1px;width:14px;height:14px;cursor:nwse-resize;touch-action:none;opacity:.55;
    background:linear-gradient(135deg,transparent 0 55%,var(--muted) 55% 63%,transparent 63% 75%,var(--muted) 75% 83%,transparent 83%)}
  .grip:hover{opacity:1}
  .panel.narrow .title,.panel.narrow .stat span{display:none}
  .pill{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 5px;border-radius:8px;pointer-events:auto;cursor:pointer;color:#fff;
    background:var(--accent);box-shadow:var(--shadow);width:auto;font:600 13px/1 system-ui,'Segoe UI',Roboto,Arial,sans-serif}
  .pill:hover{color:#fff;background:var(--accent);filter:brightness(1.08)}
  .pill .logo{width:18px;height:18px;background:rgba(255,255,255,.25)}
  .pill .pl{min-width:18px;padding:1px 6px;border-radius:5px;background:#fff;color:var(--accent);font:700 13px/1.2 system-ui,sans-serif;text-align:center}
  .pill .pt{white-space:pre}`;

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));

  class Overlay {
    constructor(track, init) {
      this.t = track;
      this.pref = Object.assign({ wFrac: +settings.pw2 || 1, h: +settings.ph2 || 84, userSized: false, floating: false, x: 0, y: 0 }, init && init.pref);
      this.minimized = !!(init && init.minimized);
      this.host = el('div'); this.host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:0;top:0;width:0;height:0;pointer-events:none;';
      hosts.add(this.host);
      const root = this.root = this.host.attachShadow({ mode: 'closed' });
      try { const sh = new CSSStyleSheet(); sh.replaceSync(CSS); root.adoptedStyleSheets = [sh]; } catch (_) { const st = el('style'); st.textContent = CSS; root.appendChild(st); }
      const wrap = this.wrap = el('div', 'wrap');
      // keep clicks/scrolls inside our UI from reaching the page's player handlers
      ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'wheel', 'contextmenu'].forEach((n) => wrap.addEventListener(n, (e) => e.stopPropagation()));

      // panel
      const panel = this.panel = el('div', 'panel');
      const head = this.head = el('div', 'head');
      const logo = el('div', 'logo', 'अ');
      this.title = el('div', 'title', 'Abhivyakta');
      this.stat = el('div', 'stat'); this.statDot = el('div', 'dot'); this.statTxt = el('span', '', ''); this.stat.append(this.statDot, this.statTxt);
      this.live = el('div', 'live off'); this.liveL = el('b', '', '–'); this.liveP = el('i', '', ''); this.live.append(this.liveL, this.liveP);
      const btns = el('div', 'btns');
      const mk = (icon, title, fn) => { const b = el('button'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.appendChild(svg(ICONS[icon])); b.addEventListener('click', fn); return b; };
      this.bBack = mk('back', 'Backspace (delete last character)', () => this.backspace());
      this.bClear = mk('trash', 'Clear everything', () => this.clear());
      this.bCopy = mk('copy', 'Copy text', () => this.copy());
      this.bSave = mk('save', 'Save as .txt', () => this.save());
      this.bDock = mk('dock', 'Snap back under the video', () => { this.pref.floating = false; this.place(); }); this.bDock.classList.add('hidden');
      this.bMin = mk('min', 'Minimize', () => { this.minimized = true; this.render(); this.place(); });
      btns.append(this.bBack, this.bClear, this.bCopy, this.bSave, this.bDock, this.bMin);
      head.append(logo, this.title, this.stat, this.live, btns);
      this.note = el('div', 'note hidden');
      const body = el('div', 'body');
      const ta = this.ta = el('textarea'); ta.spellcheck = false; ta.autocomplete = 'off'; ta.setAttribute('aria-label', 'Built word');
      ta.placeholder = 'Letters you sign appear here — click to edit, Enter for a new line.';
      body.appendChild(ta);
      const grip = this.grip = el('div', 'grip'); grip.title = 'Drag to resize';
      panel.append(head, this.note, body, grip);

      // minimized pill
      const pill = this.pill = el('button', 'pill'); pill.type = 'button'; pill.title = 'Open Abhivyakta';
      this.pillLogo = el('span', 'logo', 'अ'); this.pillName = el('span', 'pt', 'Abhivyakta'); this.pillL = el('span', 'pl hidden', '');
      pill.append(this.pillLogo, this.pillName, this.pillL);
      pill.addEventListener('click', () => { this.minimized = false; this.render(); this.place(); });

      wrap.append(panel, pill); root.appendChild(wrap);
      if (init && init.text) ta.value = init.text;
      this.wireDrag(); this.wireResize();
    }
    get text() { return this.ta.value; }

    // ----- text operations -----
    insert(str) {
      const ta = this.ta, v = ta.value;
      if (str === ' ' && (!v || /\s$/.test(v))) return;
      if (this.root.activeElement === ta) { ta.setRangeText(str, ta.selectionStart, ta.selectionEnd, 'end'); }
      else { ta.value = v + str; ta.scrollTop = ta.scrollHeight; }
    }
    backspace() {
      const ta = this.ta; ta.focus();
      if (ta.selectionStart === ta.selectionEnd) { const e = ta.value.length; if (ta.selectionStart === 0 && e) ta.setSelectionRange(e, e); }
      if (!document.execCommand || !document.execCommand('delete')) ta.value = ta.value.slice(0, -1);
    }
    clear() {
      const ta = this.ta; ta.focus(); ta.select();
      if (!document.execCommand || !document.execCommand('delete')) ta.value = '';
      this.t.cap.reset(); this.render();
    }
    flash(btn) { btn.classList.add('ok'); const old = btn.firstChild; btn.replaceChild(svg(ICONS.check), old); setTimeout(() => { btn.classList.remove('ok'); btn.replaceChild(old, btn.firstChild); }, 1200); }
    async copy() {
      const v = this.ta.value; if (!v.trim()) return;
      try { await navigator.clipboard.writeText(v); }
      catch (_) { const sel = [this.ta.selectionStart, this.ta.selectionEnd]; this.ta.select(); document.execCommand('copy'); this.ta.setSelectionRange(sel[0], sel[1]); }
      this.flash(this.bCopy);
    }
    save() {
      const v = this.ta.value; if (!v.trim()) return;
      const d = new Date(), p = (n) => String(n).padStart(2, '0');
      const name = `Abhivyakta-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`;
      const url = URL.createObjectURL(new Blob([v.replace(/\n/g, '\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.flash(this.bSave);
    }

    // ----- drag + resize -----
    wireDrag() {
      let st = null;
      this.head.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        const r = this.panel.getBoundingClientRect();
        st = { dx: e.clientX - r.left, dy: e.clientY - r.top }; this.head.classList.add('drag'); this.head.setPointerCapture(e.pointerId); e.preventDefault();
      });
      this.head.addEventListener('pointermove', (e) => {
        if (!st) return;
        this.pref.floating = true; this.pref.x = e.clientX - st.dx; this.pref.y = e.clientY - st.dy; this.place();
      });
      const end = (e) => { if (!st) return; st = null; this.head.classList.remove('drag'); try { this.head.releasePointerCapture(e.pointerId); } catch (_) {} };
      this.head.addEventListener('pointerup', end); this.head.addEventListener('pointercancel', end);
      this.head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) { this.pref.floating = false; this.place(); } });
    }
    wireResize() {
      let st = null;
      this.grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = this.panel.getBoundingClientRect();
        st = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }; this.grip.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
      });
      this.grip.addEventListener('pointermove', (e) => {
        if (!st) return;
        const vw = this.t.video.getBoundingClientRect().width || st.w;
        const w = clamp(st.w + e.clientX - st.x, MIN_PW, innerWidth - 8), h = clamp(st.h + e.clientY - st.y, MIN_PH, innerHeight - 8);
        this.pref.wFrac = w / vw; this.pref.h = h; this.pref.userSized = true; this.place();
      });
      const end = (e) => {
        if (!st) return; st = null; try { this.grip.releasePointerCapture(e.pointerId); } catch (_) {}
        try { chrome.storage.local.set({ pw2: this.pref.wFrac, ph2: this.pref.h }); } catch (_) {}
      };
      this.grip.addEventListener('pointerup', end); this.grip.addEventListener('pointercancel', end);
    }

    // ----- state -> DOM -----
    status() {
      const t = this.t, e = engine;
      if (!e || e.state === 'loading') return { k: 'load', short: 'Loading…', msg: (e && e.message) || 'Loading hand model…' };
      if (e.state === 'error') return { k: 'err', short: 'Setup needed', msg: e.message };
      if (t.blocked) return { k: 'err', short: 'Video blocked', msg: "This site doesn't let extensions read its video frames, so signs can't be detected here." };
      if (t.paused) return { k: 'idle', short: 'Paused' };
      if (t.cap.live) return { k: 'ok', short: t.hands > 1 ? '2 hands detected' : '1 hand detected' };
      return { k: 'idle', short: 'Looking for hands…' };
    }
    render() {
      this.wrap.classList.toggle('dark', isDark());
      const s = this.status(), live = this.t.cap.live && this.t.cap.live.conf >= 0.5 ? this.t.cap.live : null;
      this.stat.className = 'stat ' + (s.k === 'ok' ? 'ok' : ''); this.statDot.className = 'dot ' + (s.k === 'idle' ? '' : s.k); this.statTxt.textContent = s.short;
      this.live.classList.toggle('off', !live); this.liveL.textContent = live ? live.label : '–'; this.liveP.textContent = live ? Math.round(live.conf * 100) + '%' : '';
      this.note.classList.toggle('hidden', !s.msg); if (s.msg) { this.note.textContent = s.msg; this.note.className = 'note' + (s.k === 'err' ? ' err' : ''); }
      this.panel.style.minHeight = s.msg ? '104px' : ''; this.panel.classList.toggle('hidden', this.minimized); this.pill.classList.toggle('hidden', !this.minimized);
      this.pillL.classList.toggle('hidden', !live); this.pillL.textContent = live ? live.label : '';
      this.pillName.classList.toggle('hidden', !!live);
      this.bDock.classList.toggle('hidden', !this.pref.floating);
    }
    place() {
      const v = this.t.video, r = v.getBoundingClientRect(), pf = this.pref, fs = document.fullscreenElement;
      const inFs = !!(fs && fs !== v && fs.contains(v));
      const parent = inFs ? fs : document.documentElement;
      if (this.host.parentNode !== parent) parent.appendChild(this.host);
      const lift = inFs ? 100 : 72;   // keep clear of the player's control bar
      if (this.minimized) {           // bottom-left of the video, above the controls
        const x = clamp(r.left + 12, 4, innerWidth - 150), y = clamp(r.bottom - 28 - lift + 8, 4, innerHeight - 40);
        this.host.style.left = x + 'px'; this.host.style.top = y + 'px'; return;
      }
      const h = clamp(pf.h, MIN_PH, innerHeight - 16);
      const inside = inFs || r.bottom + h + 8 > innerHeight;   // no room below the video
      const maxW = Math.max(MIN_PW, innerWidth - 16);
      const w = clamp(pf.wFrac * r.width, MIN_PW, pf.userSized ? maxW : Math.min(maxW, inside ? 560 : 760));
      let x, y;
      if (pf.floating) { x = clamp(pf.x, 0, innerWidth - w); y = clamp(pf.y, 0, innerHeight - h); pf.x = x; pf.y = y; }
      else if (inside) {              // bottom-left, above the controls, never over the middle of the picture
        x = clamp(r.left + 12, 4, innerWidth - w - 4);
        y = clamp(r.bottom - h - lift, 4, innerHeight - h - 4);
      } else {                        // normal: directly under the video
        x = clamp(r.left + (r.width - w) / 2, 4, innerWidth - w - 4);
        y = clamp(r.bottom + 8, 4, innerHeight - h - 4);
      }
      this.host.style.left = x + 'px'; this.host.style.top = y + 'px';
      this.panel.style.width = w + 'px'; this.panel.style.height = h + 'px';
      this.panel.classList.toggle('narrow', w < 400);
    }
    snapshot() { return { text: this.ta.value, pref: { ...this.pref }, minimized: this.minimized }; }
    destroy() { hosts.delete(this.host); this.host.remove(); }
  }

  class Track {
    constructor(video) {
      this.video = video; this.id = Math.random().toString(36).slice(2);
      this.cap = new ISLCaption.CaptionState({ minConf: +settings.minConf, holdMs: +settings.holdMs, spaceMs: +settings.spaceMs });
      this.blocked = false; this.paused = false; this.lastT = -1; this.errs = 0; this.hands = 0;
      this.ui = new Overlay(this, saved.get(video));
    }
  }

  // ---------- finding videos ----------
  const usable = (v) => {
    if (!v.isConnected || !v.videoWidth) return false;
    const r = v.getBoundingClientRect();
    if (r.width < MIN_W || r.height < MIN_H || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    const cs = getComputedStyle(v); return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  function dropTrack(v, t) { saved.set(v, t.ui.snapshot()); t.ui.destroy(); tracks.delete(v); }
  function scan() {
    if (!settings.enabled) return removeAll();
    const vids = [...document.querySelectorAll('video')].filter(usable)
      .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)
      .slice(0, settings.mode === 'largest' ? 1 : MAX_VIDEOS);
    for (const [v, t] of [...tracks]) if (!vids.includes(v)) dropTrack(v, t);
    for (const v of vids) if (!tracks.has(v)) { ensureEngine(); const t = new Track(v); tracks.set(v, t); t.ui.render(); t.ui.place(); }
    if (tracks.size) idleSince = null; else if (engine) { idleSince = idleSince || Date.now(); if (Date.now() - idleSince > 30000) { disposeEngine(); idleSince = null; } }
  }
  function removeAll() { for (const [v, t] of [...tracks]) dropTrack(v, t); disposeEngine(); }

  // ---------- main loop ----------
  const fit = (w, h, max) => { const k = Math.min(1, max / Math.max(w, h)); return [Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k))]; };
  async function step() {
    if (!settings.enabled || !tracks.size || !engine || engine.state !== 'ready') return 250;
    const list = [...tracks.values()];
    for (let n = 0; n < list.length; n++) {
      const t = list[(rr++) % list.length], v = t.video;
      const wasPaused = t.paused; t.paused = v.paused || v.ended;
      if (t.paused !== wasPaused) t.ui.render();
      if (t.paused && v.currentTime === t.lastT) continue;
      if (v.readyState < 2 || !v.videoWidth || t.blocked) continue;
      t.lastT = v.currentTime;
      const [w, h] = fit(v.videoWidth, v.videoHeight, +settings.maxSide);
      let bmp;
      try { bmp = await createImageBitmap(v, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }); } catch (_) { continue; }
      const res = await request(t, bmp);
      if (res.type === 'error') {
        if (++t.errs >= 5 && res.message !== 'timeout') { t.blocked = true; console.debug('[Abhivyakta]', res.message); }
        t.ui.render(); return MIN_GAP_MS;
      }
      t.errs = 0; t.hands = res.n || 0;
      const add = t.cap.update(res, performance.now());
      if (add) t.ui.insert(add);
      t.ui.render();
      return MIN_GAP_MS;
    }
    return 150;
  }
  (async function loop() {
    let wait = 250; const t0 = performance.now();
    try { wait = await step(); } catch (e) { console.debug('[Abhivyakta] step error', e); }
    setTimeout(loop, Math.max(0, wait - (performance.now() - t0)));
  })();

  setInterval(scan, 800); scan();
  (function layout() { tracks.forEach((t) => t.ui.place()); requestAnimationFrame(layout); })();
  document.addEventListener('fullscreenchange', () => tracks.forEach((t) => t.ui.place()));
})();
