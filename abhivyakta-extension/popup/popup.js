const DEFAULTS = { enabled: true, mode: 'all', minConf: 0.75, holdMs: 300, spaceMs: 1500, mirror: false, maxSide: 512, theme: 'system' };
const $ = (id) => document.getElementById(id);
const NUM = new Set(['minConf', 'holdMs', 'spaceMs', 'maxSide']);
chrome.storage.local.get(DEFAULTS).then((s) => {
  document.documentElement.dataset.theme = s.theme;
  for (const k in DEFAULTS) {
    const el = $(k), lab = $(k + 'V');
    if (el.type === 'checkbox') el.checked = !!s[k]; else el.value = s[k];
    if (lab) lab.textContent = s[k];
    el.addEventListener('input', () => {
      const v = el.type === 'checkbox' ? el.checked : NUM.has(k) ? +el.value : el.value;
      if (lab) lab.textContent = v;
      if (k === 'theme') document.documentElement.dataset.theme = v;
      chrome.storage.local.set({ [k]: v });
    });
  }
});
