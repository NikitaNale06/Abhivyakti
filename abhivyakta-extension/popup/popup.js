const $ = (id) => document.getElementById(id);
const DEFAULTS = { enabled: true, mode: 'all', mirror: false, theme: 'system' };
let mode = 'in';            // 'in' | 'up'
let busy = false;

// ───────── settings (signed-in view) ─────────
chrome.storage.local.get(DEFAULTS).then((s) => {
  document.documentElement.dataset.theme = s.theme;
  for (const k of Object.keys(DEFAULTS)) {
    const el = $(k);
    if (el.type === 'checkbox') el.checked = !!s[k]; else el.value = s[k];
    el.addEventListener('input', () => {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'theme') document.documentElement.dataset.theme = v;
      chrome.storage.local.set({ [k]: v });
    });
  }
});

// ───────── which view ─────────
function render({ auth }) {
  const user = auth?.refreshToken ? auth.user || {} : null;
  $('appView').hidden = !user;
  $('authView').hidden = !!user;
  if (!user) return;
  const name = user.display_name || user.email || 'Signed in';
  $('userName').textContent = name;
  $('userEmail').textContent = user.email || '';
  $('avatarFallback').textContent = name.slice(0, 1).toUpperCase();
  const img = $('avatar');
  img.hidden = !user.photo_url;
  $('avatarFallback').hidden = !!user.photo_url;
  img.onerror = () => { img.hidden = true; $('avatarFallback').hidden = false; };
  if (user.photo_url) img.src = user.photo_url;
}
chrome.storage.local.get(['auth']).then(render);
chrome.storage.onChanged.addListener((c, area) => {
  if (area !== 'local') return;
  if (c.auth) chrome.storage.local.get(['auth']).then(render);
  if (c.authPending) setBusy(!!c.authPending.newValue);
  if (c.authError) showError(c.authError.newValue);
});
chrome.storage.local.get(['authPending', 'authError']).then((s) => { setBusy(!!s.authPending); showError(s.authError); });

// ───────── auth form ─────────
function showError(msg) { $('error').hidden = !msg; $('error').textContent = msg || ''; }
function setBusy(v) {
  busy = v;
  $('submit').disabled = v; $('google').disabled = v;
  $('googleLabel').textContent = v ? 'Waiting…' : 'Continue with Google';
}
function setMode(m) {
  mode = m;
  const up = m === 'up';
  $('tabIn').setAttribute('aria-selected', !up); $('tabUp').setAttribute('aria-selected', up);
  $('nameRow').hidden = $('confirmRow').hidden = !up;
  $('submit').textContent = up ? 'Create account' : 'Sign in';
  $('password').autocomplete = up ? 'new-password' : 'current-password';
  showError('');
}
$('tabIn').addEventListener('click', () => setMode('in'));
$('tabUp').addEventListener('click', () => setMode('up'));

$('google').addEventListener('click', () => {
  showError(''); setBusy(true);
  chrome.runtime.sendMessage({ type: 'auth:signIn' }).catch(() => {});
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  const displayName = $('name').value.trim(), email = $('email').value.trim();
  const password = $('password').value, confirmPassword = $('confirm').value;
  if (mode === 'up' && displayName.length < 2) return showError('Enter your full name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Enter a valid email address.');
  if (!password) return showError('Enter your password.');
  if (mode === 'up') {
    if (password.length < 8) return showError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return showError('Passwords do not match.');
  }
  showError(''); setBusy(true);
  try {
    const r = await chrome.runtime.sendMessage({
      type: mode === 'up' ? 'auth:register' : 'auth:login',
      payload: { displayName, email, password, confirmPassword },
    });
    if (!r?.ok) showError(r?.error || 'Something went wrong. Please try again.');
    else $('password').value = $('confirm').value = '';
  } catch { showError('Something went wrong. Please try again.'); }
  setBusy(false);
});

$('signOut').addEventListener('click', () => {
  $('signOut').disabled = true;
  chrome.runtime.sendMessage({ type: 'auth:signOut' }).finally(() => { $('signOut').disabled = false; });
});
