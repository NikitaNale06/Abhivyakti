chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-isl') return;
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
});

// ───────────────────────── Google sign-in ─────────────────────────
// Flow:
//   1. Generate a random `state` token (CSRF protection).
//   2. Ask our backend for a Google consent URL, passing `state` and
//      the extension's chromiumapp.org redirect URI so the backend
//      embeds both into the URL it returns.  This prevents a duplicate
//      `state` param (Error 400: invalid_request).
//   3. Open the consent screen via chrome.identity.launchWebAuthFlow.
//      Chrome intercepts the redirect and returns the callback URL.
//   4. Verify `state`, extract `code`, call /auth/google/callback.
//   5. Store tokens and fetch the user profile.
//
// Prerequisites (Google Cloud Console → OAuth client):
//   • Add chrome.identity.getRedirectURL() to "Authorized redirect URIs".
//     It looks like: https://<extension-id>.chromiumapp.org/

// ── Single source of truth for the backend URL ─────────────────────
// Change this one constant to point at prod/staging/local as needed.
const API_BASE = 'http://localhost:8000';
const API = API_BASE + '/api/v1/auth';

async function api(method, path, { body, token } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the Abhivyakti server. Check your internet connection.");
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
const detail = (json, dflt) => {
  const d = json?.detail;
  if (typeof d === 'string' && d) return d;
  if (Array.isArray(d) && d[0]?.msg) { // FastAPI validation errors
    const field = String(d[0].loc?.[d[0].loc.length - 1] ?? '').replace(/_/g, ' ');
    return (field ? field[0].toUpperCase() + field.slice(1) + ': ' : '') + String(d[0].msg).replace(/^Value error, /, '');
  }
  return dflt;
};

async function saveTokens(d) {
  const { auth = {} } = await chrome.storage.local.get('auth');
  await chrome.storage.local.set({
    auth: { ...auth, accessToken: d.access_token, refreshToken: d.refresh_token,
            expiresAt: Date.now() + (d.expires_in || 3600) * 1000 - 30000 },
  });
}

async function refreshTokens() {
  const { auth } = await chrome.storage.local.get('auth');
  if (!auth?.refreshToken) return false;
  const { status, json } = await api('POST', '/refresh', { body: { refresh_token: auth.refreshToken } });
  if (status === 200 && json.data) { await saveTokens(json.data); return true; }
  if (status >= 400 && status < 500) await chrome.storage.local.remove('auth'); // session is over
  return false;
}

// Authenticated call; refreshes the access token when expired or rejected.
async function authed(method, path) {
  let { auth } = await chrome.storage.local.get('auth');
  if (!auth?.refreshToken) return { status: 401, json: {} };
  if (Date.now() >= (auth.expiresAt || 0) && !(await refreshTokens())) return { status: 401, json: {} };
  ({ auth } = await chrome.storage.local.get('auth'));
  let r = await api(method, path, { token: auth?.accessToken });
  if (r.status === 401 && (await refreshTokens())) {
    ({ auth } = await chrome.storage.local.get('auth'));
    r = await api(method, path, { token: auth?.accessToken });
  }
  return r;
}

async function signIn() {
  // The redirect URI Chrome uses for extensions — must be registered in Google Cloud Console.
  const redirect = chrome.identity.getRedirectURL();
  // Random state token for CSRF protection; verified when the callback returns.
  const state = crypto.randomUUID();

  // Ask the backend for a Google consent URL.
  // We pass `state` HERE so the backend forwards it into the Google URL via
  // flow.authorization_url(state=…).  If we appended it ourselves afterward
  // the URL would contain `state` twice → Google Error 400: invalid_request.
  const start = await api(
    'GET',
    '/google?redirect_uri=' + encodeURIComponent(redirect) + '&state=' + encodeURIComponent(state),
  );
  if (start.status !== 200 || !start.json.url) {
    throw new Error(detail(start.json, "Couldn't start Google sign-in."));
  }
  const url = start.json.url; // already contains state= and redirect_uri=

  // Open the Google consent screen.  Chrome intercepts the chromiumapp.org
  // redirect and returns the full callback URL to us (never hits a real server).
  let callbackUrl;
  try {
    callbackUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  } catch (e) {
    // User closed the window or cancelled — not an error we surface.
    if (/did not approve|closed|cancel/i.test(e?.message || '')) return { cancelled: true };
    throw new Error('Google sign-in failed. Please try again.');
  }

  if (!callbackUrl) return { cancelled: true };

  const q = new URL(callbackUrl).searchParams;

  // CSRF check — state must match what we generated.
  if (q.get('state') !== state) {
    throw new Error('Sign-in could not be verified (state mismatch). Please try again.');
  }

  if (q.get('error')) {
    if (q.get('error') === 'access_denied') return { cancelled: true };
    throw new Error('Google sign-in failed (' + q.get('error') + ').');
  }

  const code = q.get('code');
  if (!code) throw new Error('No authorisation code was received from Google.');

  // Exchange the code for backend JWTs.
  // redirect_uri must match exactly what was used to build the consent URL.
  const cb = await api(
    'GET',
    '/google/callback?code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(redirect),
  );
  if (cb.status !== 200 || !cb.json.data) {
    throw new Error(detail(cb.json, 'Google sign-in failed on the server.'));
  }
  await saveTokens(cb.json.data);

  const me = await authed('GET', '/me');
  if (me.status !== 200 || !me.json.data) {
    throw new Error(detail(me.json, "Couldn't load your profile."));
  }
  const { auth } = await chrome.storage.local.get('auth');
  await chrome.storage.local.set({ auth: { ...auth, user: me.json.data } });
  return { ok: true };
}

// Email + password: login, or register (creates the account and signs in).
async function finishAuth(r, fallback) {
  if (r.status !== 200 && r.status !== 201) throw new Error(detail(r.json, fallback));
  if (!r.json.data) throw new Error(fallback);
  await saveTokens(r.json.data);
  const me = await authed('GET', '/me');
  if (me.status !== 200 || !me.json.data) throw new Error(detail(me.json, "Couldn't load your profile."));
  const { auth } = await chrome.storage.local.get('auth');
  await chrome.storage.local.set({ auth: { ...auth, user: me.json.data } });
  return { ok: true };
}
async function emailLogin({ email, password }) {
  return finishAuth(await api('POST', '/login', { body: { email, password } }), 'Login failed.');
}
async function emailRegister({ displayName, email, password, confirmPassword }) {
  return finishAuth(await api('POST', '/register', {
    body: { display_name: displayName, email, password, confirm_password: confirmPassword },
  }), 'Could not create your account.');
}

async function signOut() {
  try { await authed('POST', '/logout'); } catch { /* best effort */ }
  await chrome.storage.local.remove('auth');
}

// Validate the stored session at startup; keep it on network errors (offline support).
async function restoreSession() {
  const { auth } = await chrome.storage.local.get('auth');
  if (!auth?.refreshToken) return;
  try {
    const me = await authed('GET', '/me');
    if (me.status === 200 && me.json.data) {
      const cur = (await chrome.storage.local.get('auth')).auth;
      if (cur) await chrome.storage.local.set({ auth: { ...cur, user: me.json.data } });
    } else if (me.status === 401) {
      await chrome.storage.local.remove('auth');
    }
  } catch { /* offline — keep the session */ }
}

let signingIn = false;
// Reset pending flag in case the service worker was killed mid-flow.
chrome.storage.local.set({ authPending: false });

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg?.type === 'auth:signIn') {
    if (signingIn) { send({ ok: false, error: 'Sign-in already in progress.' }); return; }
    signingIn = true;
    chrome.storage.local.set({ authPending: true, authError: null });
    signIn()
      .then((r) => {
        if (r?.cancelled) {
          // User cancelled — clear pending state; don't treat as an error.
          return chrome.storage.local.set({ authPending: false, authError: null })
            .then(() => send({ cancelled: true }));
        }
        return chrome.storage.local.set({ authError: null }).then(() => send(r));
      })
      .catch((e) =>
        chrome.storage.local.set({ authError: e.message }).then(() =>
          send({ ok: false, error: e.message }),
        ),
      )
      .finally(() => {
        signingIn = false;
        chrome.storage.local.set({ authPending: false });
      });
    return true; // keep message channel open for async response
  }
  if (msg?.type === 'auth:login' || msg?.type === 'auth:register') {
    (msg.type === 'auth:login' ? emailLogin : emailRegister)(msg.payload || {})
      .then(send, (e) => send({ ok: false, error: e.message }));
    return true;
  }
  if (msg?.type === 'auth:signOut') {
    signOut().then(() => send({ ok: true }));
    return true;
  }
});

chrome.runtime.onStartup.addListener(restoreSession);
chrome.runtime.onInstalled.addListener(restoreSession);
