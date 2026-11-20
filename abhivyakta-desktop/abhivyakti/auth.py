"""Google sign-in for the desktop app (stdlib only).

Flow (uses the Abhivyakti backend's existing endpoints):
  1. GET  /auth/google?redirect_uri=http://127.0.0.1:PORT/callback  -> Google consent URL
  2. open the URL in the user's browser; a tiny loopback server receives ?code=...&state=...
  3. GET  /auth/google/callback?code=...&redirect_uri=...          -> access + refresh JWTs
  4. GET  /auth/me                                                  -> profile

The redirect URI below must be listed under "Authorized redirect URIs" of the Google OAuth web
client in Google Cloud Console.  Tokens are kept in <config dir>/auth.json (owner-only on POSIX).
"""
import html
import json
import os
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

from .settings import config_dir

API_BASE = os.environ.get("ABHIVYAKTI_API",
                          "https://abhivyakti-backend-486350221693.asia-south1.run.app").rstrip("/")
LOOPBACK_HOST = "127.0.0.1"
LOOPBACK_PORT = int(os.environ.get("ABHIVYAKTI_AUTH_PORT", "53682"))
REDIRECT_URI = f"http://{LOOPBACK_HOST}:{LOOPBACK_PORT}/callback"
SIGNIN_TIMEOUT = 180  # seconds the user has to finish in the browser


class AuthError(Exception):
    """Message is safe to show to the user."""


_PAGE = """<!doctype html><meta charset="utf-8"><title>Abhivyakti</title>
<style>body{{font:16px system-ui,Segoe UI,sans-serif;display:grid;place-items:center;height:100vh;margin:0;
background:#fafafa;color:#18181b}}div{{text-align:center;max-width:380px;padding:24px}}
h1{{font-size:20px;margin:0 0 8px;color:{color}}}p{{color:#71717a;margin:0}}</style>
<div><h1>{title}</h1><p>{body}</p></div>"""


def _http(method, path, body=None, token=None, timeout=20):
    req = urllib.request.Request(API_BASE + path, method=method)
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data=data, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode())
        except Exception:
            payload = {}
        return e.code, payload
    except (urllib.error.URLError, TimeoutError, OSError):
        raise AuthError("Can't reach the Abhivyakti server. Check your internet connection.")


def _detail(payload, default):
    d = payload.get("detail") if isinstance(payload, dict) else None
    if isinstance(d, str) and d:
        return d
    if isinstance(d, list) and d and isinstance(d[0], dict) and d[0].get("msg"):   # FastAPI validation error
        loc = d[0].get("loc") or []
        field = str(loc[-1]).replace("_", " ").capitalize() + ": " if loc else ""
        return field + str(d[0]["msg"]).replace("Value error, ", "")
    return default


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        srv = self.server
        if q.get("state") != srv.expected_state:
            # Unexpected state — could be a stale browser tab.  Reply and bail
            # but do NOT set srv.done so the real callback can still arrive.
            self._reply(400, "Sign-in failed",
                        "This sign-in request isn't valid (state mismatch). "
                        "Please try again from the app.", "#dc2626")
            return
        if "error" in q:
            srv.result = ("error", "Sign-in was cancelled." if q["error"] == "access_denied"
                          else f"Google sign-in failed ({html.escape(q['error'])}).")
            self._reply(200, "Sign-in cancelled", "You can close this tab and return to Abhivyakti.", "#71717a")
        elif q.get("code"):
            srv.result = ("code", q["code"])
            self._reply(200, "You're signed in!", "You can close this tab and return to Abhivyakti.", "#16a34a")
        else:
            srv.result = ("error", "No authorisation code was received from Google.")
            self._reply(400, "Sign-in failed", "No authorisation code was received.", "#dc2626")
        srv.done.set()

    def _reply(self, status, title, body, color):
        data = _PAGE.format(title=html.escape(title), body=html.escape(body), color=color).encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


class AuthClient:
    def __init__(self):
        self.path = config_dir() / "auth.json"
        self.tokens = None   # {"access_token","refresh_token","expires_at"}
        self.user = None     # UserProfile dict from /auth/me
        self._cancel = threading.Event()
        self._load()

    # ------------------------------------------------------------ storage
    def _load(self):
        try:
            d = json.loads(self.path.read_text(encoding="utf-8"))
            if d.get("refresh_token"):
                self.tokens = {k: d[k] for k in ("access_token", "refresh_token", "expires_at") if k in d}
                self.user = d.get("user")
        except (OSError, ValueError, AttributeError):
            self.tokens = self.user = None

    def _save(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps({**(self.tokens or {}), "user": self.user}), encoding="utf-8")
            try:
                os.chmod(tmp, 0o600)
            except OSError:
                pass
            tmp.replace(self.path)
        except OSError:
            pass

    def _clear(self):
        self.tokens = self.user = None
        try:
            self.path.unlink()
        except OSError:
            pass

    @property
    def signed_in(self):
        return bool(self.tokens and self.tokens.get("refresh_token"))

    def _store_tokens(self, data):
        self.tokens = {"access_token": data["access_token"], "refresh_token": data["refresh_token"],
                       "expires_at": time.time() + int(data.get("expires_in", 3600)) - 30}

    # ------------------------------------------------------------ sign in
    def cancel(self):
        self._cancel.set()

    def sign_in(self):
        """Blocking - run in a worker thread. Raises AuthError with a user-friendly message."""
        self._cancel.clear()
        state = secrets.token_urlsafe(24)
        try:
            server = HTTPServer((LOOPBACK_HOST, LOOPBACK_PORT), _Handler)
        except OSError:
            raise AuthError(f"Port {LOOPBACK_PORT} is busy (is another sign-in open?). Close it and try again.")
        server.expected_state, server.result, server.done = state, None, threading.Event()
        server.timeout = 0.25
        try:
            # Pass state to the backend so it embeds it in the Google URL —
            # avoids a duplicate `state` param that causes Error 400.
            st, p = _http("GET", "/api/v1/auth/google?" + urllib.parse.urlencode(
                {"redirect_uri": REDIRECT_URI, "state": state}))
            url = p.get("url") if st == 200 else None
            if not url:
                raise AuthError(_detail(p, "Couldn't start Google sign-in."))
            if not webbrowser.open(url):
                raise AuthError("Couldn't open your browser.")
            deadline = time.time() + SIGNIN_TIMEOUT
            while not server.done.is_set():
                if self._cancel.is_set():
                    raise AuthError("Sign-in cancelled.")
                if time.time() > deadline:
                    raise AuthError("Sign-in timed out. Please try again.")
                server.handle_request()
        finally:
            server.server_close()
        if server.result is None:
            raise AuthError("Sign-in failed: no response was received from Google.")
        kind, val = server.result
        if kind == "error":
            raise AuthError(val)
        st, p = _http("GET", "/api/v1/auth/google/callback?" +
                      urllib.parse.urlencode({"code": val, "redirect_uri": REDIRECT_URI}), timeout=30)
        if st != 200 or not p.get("data"):
            raise AuthError(_detail(p, "Google sign-in failed on the server."))
        self._store_tokens(p["data"])
        self._fetch_profile()
        return self.user

    def _finish(self, st, p, fallback):
        if st not in (200, 201) or not p.get("data"):
            raise AuthError(_detail(p, fallback))
        self._store_tokens(p["data"])
        self._fetch_profile()
        return self.user

    def login(self, email, password):
        """Email + password sign-in. Blocking."""
        st, p = _http("POST", "/api/v1/auth/login", {"email": email, "password": password})
        return self._finish(st, p, "Sign-in failed.")

    def register(self, name, email, password, confirm):
        """Create an account (and sign in). Blocking."""
        st, p = _http("POST", "/api/v1/auth/register", {
            "display_name": name, "email": email, "password": password, "confirm_password": confirm})
        return self._finish(st, p, "Could not create your account.")

    # ------------------------------------------------------------ session
    def _fetch_profile(self):
        st, p = self._authed("GET", "/api/v1/auth/me")
        if st == 200 and p.get("data"):
            self.user = p["data"]
            self._save()
        else:
            raise AuthError(_detail(p, "Couldn't load your profile."))

    def _refresh(self):
        st, p = _http("POST", "/api/v1/auth/refresh", {"refresh_token": self.tokens["refresh_token"]})
        if st == 200 and p.get("data"):
            self._store_tokens(p["data"])
            self._save()
            return True
        if st in (400, 401, 403):
            self._clear()           # refresh token rejected: session is really over
        return False

    def _authed(self, method, path, body=None):
        if not self.signed_in:
            return 401, {}
        if time.time() >= self.tokens.get("expires_at", 0) and not self._refresh():
            return 401, {}
        st, p = _http(method, path, body, self.tokens["access_token"])
        if st == 401 and self._refresh():
            st, p = _http(method, path, body, self.tokens["access_token"])
        return st, p

    def restore(self):
        """Blocking. Validate the saved session at startup. Returns True if still signed in.
        Network failures keep the saved session (so the app works offline)."""
        if not self.signed_in:
            return False
        try:
            st, p = self._authed("GET", "/api/v1/auth/me")
        except AuthError:
            return True
        if st == 200 and p.get("data"):
            self.user = p["data"]
            self._save()
            return True
        if st == 401:
            self._clear()
            return False
        return True

    def sign_out(self):
        """Blocking, best-effort server-side revoke; always clears local state."""
        try:
            self._authed("POST", "/api/v1/auth/logout")
        except AuthError:
            pass
        self._clear()
