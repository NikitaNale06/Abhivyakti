"""Main Abhivyakti window: start/stop, what to watch, and settings."""
import queue
import threading
import tkinter as tk

from .auth import AuthClient, AuthError
from .engine import Engine, app_dir, list_monitors
from .overlay import CaptionOverlay
from .region import RegionPicker
from .settings import FIXED, Settings
from .theme import F, enable_dpi_awareness, init_fonts, init_scale, palette, px, system_is_dark
from .widgets import Button, Dot, Field, GoogleButton, Logo, Segmented, Slider, Toggle


class App:
    def __init__(self):
        enable_dpi_awareness()
        self.root = tk.Tk()
        self.root.withdraw()
        init_scale(self.root)
        init_fonts(self.root)
        self.settings = Settings()
        self._sys_dark = system_is_dark()
        self.q = queue.Queue()
        self.monitors = list_monitors() or [dict(left=0, top=0, width=self.root.winfo_screenwidth(),
                                                 height=self.root.winfo_screenheight())]
        self.running = False
        self.started_once = False
        self.eng_state, self.eng_msg = "loading", "Loading models..."
        self.cap_error = None
        self.live = None
        self.hands = 0
        self.page = "home"
        self.auth = AuthClient()
        self.auth_busy = False
        self.view = None
        self.login_mode = "in"      # in | up
        self.login_error = None
        self._save_job = None
        self.cfg = {}
        self.sync_cfg()
        self.engine = Engine(self.q, self.cfg)
        self.engine.start()

        self.root.title("Abhivyakti")
        self.root.resizable(False, False)
        try:
            self.icon = tk.PhotoImage(file=str(app_dir() / "assets" / "icon.png"))
            self.root.iconphoto(True, self.icon)
        except tk.TclError:
            pass
        self.overlay = CaptionOverlay(self)
        self.build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.quit)
        self.root.deiconify()
        self.root.after(30, self._poll)
        self.root.after(2000, self._keep_top)
        if self.auth.signed_in:
            self._auth_worker(self.auth.restore)   # drops back to the login screen if the session expired

    # ------------------------------------------------------------ helpers
    def dark(self):
        t = self.settings["theme"]
        return t == "dark" or (t == "system" and self._sys_dark)

    def virtual_bounds(self):
        m = self.monitors
        return (min(x["left"] for x in m), min(x["top"] for x in m),
                max(x["left"] + x["width"] for x in m), max(x["top"] + x["height"] for x in m))

    def capture_rect(self):
        s = self.settings
        if s["source"] == "area" and s["area"]:
            return {k: int(s["area"][k]) for k in ("left", "top", "width", "height")}
        i = min(max(int(s["monitor"]), 0), len(self.monitors) - 1)
        return dict(self.monitors[i])

    def capture_bounds(self):
        r = self.capture_rect()
        return r["left"], r["top"], r["left"] + r["width"], r["top"] + r["height"]

    def sync_cfg(self):
        s = self.settings
        self.cfg.update(FIXED, mirror=bool(s["mirror"]), rect=self.capture_rect())

    def set(self, key, value):
        self.settings[key] = value
        self.sync_cfg()
        self.save_soon()
        if key == "textSize":
            self.overlay.apply_font()

    def save_soon(self):
        if self._save_job:
            self.root.after_cancel(self._save_job)
        self._save_job = self.root.after(400, self._save_now)

    def _save_now(self):
        self._save_job = None
        self.settings.save()

    # ------------------------------------------------------------ run control
    def toggle_running(self):
        if not self.auth.signed_in:      # the app does nothing without an account
            return
        if self.running:
            self.running = False
            self.engine.stop_capture()
            self.update_run_ui()
            return
        if self.eng_state == "error":
            return
        if self.settings["source"] == "area" and not self.settings["area"]:
            self.select_area(then=self.toggle_running)
            return
        self.cap_error = None
        self.monitors = list_monitors() or self.monitors
        self.sync_cfg()
        self.running = True
        self.started_once = True
        self.engine.start_capture()
        if not self.overlay.visible:
            self.overlay.show()
        self.update_run_ui()

    def update_run_ui(self):
        self.overlay.set_running(self.running)
        if hasattr(self, "btn_run") and self.btn_run.winfo_exists():
            if self.running:
                self.btn_run.set("Stop translating", "field", "stop")
            else:
                self.btn_run.set("Start translating", "accent", "play")
        self.refresh_status()

    def status(self):
        if self.eng_state == "error":
            return ("err", "Setup needed", self.eng_msg)
        if self.cap_error:
            return ("err", "Capture problem", self.cap_error)
        if self.eng_state == "loading":
            return ("load", "Loading...", self.eng_msg or "Loading hand model...")
        if not self.running:
            return ("idle", "Stopped" if self.started_once else "Ready", None)
        if self.hands > 0:
            return ("ok", "2 hands detected" if self.hands > 1 else "1 hand detected", None)
        return ("idle", "Looking for hands...", None)

    def refresh_status(self):
        k, short, msg = self.status()
        self.overlay.set_status(k, short, msg)
        if not hasattr(self, "m_dot") or not self.m_dot.winfo_exists():
            return
        P = self.P
        self.m_dot.set({"ok": P["ok"], "load": P["warn"], "err": P["err"]}.get(k, P["muted"]))
        self.m_status.configure(text=short)
        if msg:
            self.m_note.configure(text=msg, bg=P["errbg"] if k == "err" else P["soft"],
                                  fg=P["err"] if k == "err" else P["accent"])
            if not self.m_note.winfo_ismapped():
                self.m_note.pack(fill="x", pady=(px(10), 0))
        elif self.m_note.winfo_ismapped():
            self.m_note.pack_forget()

    def refresh_live(self):
        live = self.live
        self.overlay.set_live(live)
        if hasattr(self, "m_live") and self.m_live.winfo_exists():
            P = self.P
            self.m_live.configure(text=(f"{live[0]}  {round(live[1] * 100)}%" if live else "-"),
                                  fg=P["accent"] if live else P["muted"])

    # ------------------------------------------------------------ engine messages
    def _poll(self):
        live_msg = None
        status_dirty = False
        try:
            while True:
                m = self.q.get_nowait()
                kind = m[0]
                if kind == "status":
                    self.eng_state, self.eng_msg = m[1], m[2]
                    status_dirty = True
                elif kind == "live":
                    live_msg = m
                elif kind == "letter":
                    self.overlay.insert(m[1])
                elif kind == "capture_error":
                    self.cap_error = m[1]
                    self.running = False
                    self.live, self.hands = None, 0
                    live_msg = None
                    self.update_run_ui()
                    self.refresh_live()
        except queue.Empty:
            pass
        if live_msg is not None:
            _k, label, conf, hands = live_msg
            new_live = (label, conf) if label and conf >= 0.5 else None
            hands_changed = hands != self.hands
            self.hands = hands
            new_key = (new_live[0], round(new_live[1] * 100)) if new_live else None
            old_key = (self.live[0], round(self.live[1] * 100)) if self.live else None
            if new_key != old_key:
                self.live = new_live
                self.refresh_live()
            status_dirty = status_dirty or hands_changed
        if status_dirty:
            self.refresh_status()
        self.root.after(30, self._poll)

    def _keep_top(self):
        self.overlay.keep_on_top()
        self.root.after(2000, self._keep_top)

    # ------------------------------------------------------------ area picker
    def select_area(self, then=None):
        self.root.withdraw()
        self.overlay.suspend()

        def done(rect):
            self.root.deiconify()
            self.overlay.resume()
            if rect:
                self.settings["area"] = rect
                self.settings["source"] = "area"
                self.sync_cfg()
                self.save_soon()
                self.fill_capture_sub()
                if then:
                    then()

        self.root.after(180, lambda: RegionPicker(self.root, self.P, self.virtual_bounds(), done))

    # ------------------------------------------------------------ UI
    def build_ui(self):
        """Signed out -> login screen. Signed in -> the main window."""
        if hasattr(self, "shell"):
            self.shell.destroy()
        P = self.P = palette(self.dark())
        self.root.configure(bg=P["bg"])
        self.shell = tk.Frame(self.root, bg=P["bg"])
        self.shell.pack(fill="both", expand=True, padx=px(20), pady=px(18))
        self.view = "main" if self.auth.signed_in else "login"
        if self.view == "login":
            self._build_login()
        else:
            self._build_main()

    def card(self, parent, title=None):
        P = self.P
        outer = tk.Frame(parent, bg=P["card"], highlightbackground=P["border"], highlightcolor=P["border"],
                         highlightthickness=1)
        outer.pack(fill="x", pady=(0, px(12)))
        inner = tk.Frame(outer, bg=P["card"])
        inner.pack(fill="x", padx=px(16), pady=px(14))
        if title:
            tk.Label(inner, text=title.upper(), bg=P["card"], fg=P["muted"], font=F(8, "bold")).pack(
                anchor="w", pady=(0, px(10)))
        return inner

    def label(self, parent, text, muted=False, bold=False, size=10):
        P = self.P
        return tk.Label(parent, text=text, bg=parent["bg"], fg=P["muted"] if muted else P["text"],
                        font=F(size, "bold" if bold else "normal"), anchor="w", justify="left")

    # ----- Login / create account
    def _build_login(self):
        P, sh = self.P, self.shell
        self.root.title("Abhivyakti - Sign in")
        W = px(340)
        col = tk.Frame(sh, bg=P["bg"], width=W)
        col.pack()
        Logo(col, 120, P, bg=P["bg"], name="logo.png").pack(pady=(0, px(2)))
        tk.Label(col, text="Sign in to start translating Indian Sign Language.", bg=P["bg"], fg=P["muted"],
                 font=F(10), wraplength=W, justify="center").pack(pady=(0, px(14)))

        mode = self.login_mode
        Segmented(col, P, [("in", "Sign in"), ("up", "Create account")], mode, self._set_login_mode,
                  bg=P["bg"]).pack(fill="x", pady=(0, px(14)))

        self.l_google = GoogleButton(col, "Continue with Google", self.google_sign_in, P, height=44, bg=P["bg"])
        self.l_google.pack(fill="x")

        sep = tk.Frame(col, bg=P["bg"])
        sep.pack(fill="x", pady=px(14))
        tk.Frame(sep, bg=P["border"], height=1).pack(side="left", fill="x", expand=True, pady=px(1))
        tk.Label(sep, text="or use email", bg=P["bg"], fg=P["muted"], font=F(9)).pack(side="left", padx=px(10))
        tk.Frame(sep, bg=P["border"], height=1).pack(side="left", fill="x", expand=True, pady=px(1))

        self.f_name = self.f_confirm = None
        if mode == "up":
            self.f_name = Field(col, P, "Full name", bg=P["bg"], on_enter=self.submit_login)
            self.f_name.pack(fill="x", pady=(0, px(10)))
        self.f_email = Field(col, P, "Email", bg=P["bg"], on_enter=self.submit_login)
        self.f_email.pack(fill="x", pady=(0, px(10)))
        self.f_pass = Field(col, P, "Password", show="•", bg=P["bg"], on_enter=self.submit_login)
        self.f_pass.pack(fill="x", pady=(0, px(10)))
        if mode == "up":
            self.f_confirm = Field(col, P, "Confirm password", show="•", bg=P["bg"], on_enter=self.submit_login)
            self.f_confirm.pack(fill="x", pady=(0, px(10)))

        self.l_err = tk.Label(col, text="", bg=P["errbg"], fg=P["err"], font=F(9), anchor="w", justify="left",
                              wraplength=W - px(16), padx=px(8), pady=px(6))
        self.l_submit = Button(col, "Create account" if mode == "up" else "Sign in", self.submit_login, P,
                               variant="accent", height=44, size=11, bg=P["bg"])
        self.l_submit.pack(fill="x", pady=(px(4), 0))
        self.show_login_error(self.login_error)
        (self.f_name or self.f_email).focus()

    def _set_login_mode(self, v):
        if v != self.login_mode and not self.auth_busy:
            self.login_mode, self.login_error = v, None
            self.build_ui()

    def show_login_error(self, msg):
        self.login_error = msg
        if not hasattr(self, "l_err") or not self.l_err.winfo_exists():
            return
        if msg:
            self.l_err.configure(text=msg)
            self.l_err.pack(fill="x", before=self.l_submit, pady=(0, px(8)))
        else:
            self.l_err.pack_forget()

    def _set_login_busy(self, busy, google=False):
        if not hasattr(self, "l_submit") or not self.l_submit.winfo_exists():
            return
        if google:
            self.l_google.text = "Waiting for Google...  (click to cancel)" if busy else "Continue with Google"
            self.l_google.cmd = self.auth.cancel if busy else self.google_sign_in
            self.l_google._draw()
        elif busy:
            self.l_submit.set("Please wait...")

    def google_sign_in(self):
        if self.auth_busy:
            return
        self.show_login_error(None)
        self._set_login_busy(True, google=True)
        self._auth_worker(self.auth.sign_in, google=True)

    def submit_login(self):
        if self.auth_busy:
            return
        email, pw = self.f_email.get().strip(), self.f_pass.get()
        up = self.login_mode == "up"
        name = self.f_name.get().strip() if up else ""
        confirm = self.f_confirm.get() if up else ""
        err = None
        if up and len(name) < 2:
            err = "Enter your full name."
        elif "@" not in email or "." not in email.split("@")[-1]:
            err = "Enter a valid email address."
        elif not pw:
            err = "Enter your password."
        elif up and len(pw) < 8:
            err = "Password must be at least 8 characters."
        elif up and pw != confirm:
            err = "Passwords do not match."
        if err:
            self.show_login_error(err)
            return
        self.show_login_error(None)
        self._set_login_busy(True)
        if up:
            self._auth_worker(lambda: self.auth.register(name, email, pw, confirm))
        else:
            self._auth_worker(lambda: self.auth.login(email, pw))

    # ----- Auth plumbing
    def _auth_worker(self, fn, google=False):
        """Run a blocking auth call off the UI thread, then update the UI."""
        self.auth_busy = True

        def run():
            err = None
            try:
                fn()
            except AuthError as e:
                err = str(e)
            except Exception:
                err = "Something went wrong. Please try again."
            self.root.after(0, lambda: self._auth_done(err, google))

        threading.Thread(target=run, daemon=True).start()

    def _auth_done(self, err, google=False):
        self.auth_busy = False
        was = self.view
        now = "main" if self.auth.signed_in else "login"
        if now != was:
            self.login_error = None if err in (None, "Sign-in cancelled.") else err
            self.enforce_gate()
            self.build_ui()
            self.update_run_ui()
            return
        if now == "login":
            self._set_login_busy(False, google=google)
            if not google:
                self.l_submit.set("Create account" if self.login_mode == "up" else "Sign in")
            self.show_login_error(None if err in (None, "Sign-in cancelled.") else err)
        elif hasattr(self, "acct_name"):
            self.fill_account()

    def enforce_gate(self):
        """Nothing runs while signed out: stop translating and hide the caption box."""
        if self.auth.signed_in:
            return
        if self.running:
            self.running = False
            self.engine.stop_capture()
        self.overlay.suspend()
        self.overlay.visible = False

    def sign_out(self):
        if not self.auth_busy:
            self.login_error = None
            self._auth_worker(self.auth.sign_out)

    # ----- Main window
    def _build_main(self):
        P, sh = self.P, self.shell
        self.root.title("Abhivyakti")
        head = tk.Frame(sh, bg=P["bg"])
        head.pack(fill="x", pady=(0, px(16)))
        Logo(head, 44, P, bg=P["bg"]).pack(side="left")
        col = tk.Frame(head, bg=P["bg"])
        col.pack(side="left", padx=px(12))
        tk.Label(col, text="Abhivyakti", bg=P["bg"], fg=P["text"], font=F(16, "bold")).pack(anchor="w")
        tk.Label(col, text="Screen translator  ·  Offline  ·  ISL", bg=P["bg"], fg=P["muted"],
                 font=F(9)).pack(anchor="w")

        self.tabs = Segmented(sh, P, [("home", "Translate"), ("display", "Display"), ("account", "Account")],
                              self.page, self.show_page, bg=P["bg"])
        self.tabs.pack(fill="x", pady=(0, px(14)))

        self.host = tk.Frame(sh, bg=P["bg"], width=px(372))
        self.host.pack(fill="both", expand=True)
        self.host.pack_propagate(False)
        self.pages = {"home": self._page_home(), "display": self._page_display(), "account": self._page_account()}

        # make the window tall enough for the tallest tab, so it never jumps when switching
        tallest = 0
        for f in self.pages.values():
            f.pack(fill="x", anchor="n")
            self.root.update_idletasks()
            tallest = max(tallest, f.winfo_reqheight())
            f.pack_forget()
        self.host.configure(height=tallest + px(4))
        if self.page not in self.pages:
            self.page = "home"
        self.show_page(self.page)
        self.update_run_ui()
        self.refresh_live()

    def show_page(self, name):
        self.page = name
        for n, f in self.pages.items():
            if n == name:
                f.pack(fill="x", anchor="n")
            else:
                f.pack_forget()

    # ----- Translate tab
    def _page_home(self):
        P = self.P
        f = tk.Frame(self.host, bg=P["bg"])
        hero = self.card(f)
        self.btn_run = Button(hero, "Start translating", self.toggle_running, P, variant="accent", height=52,
                              icon="play", size=12, bg=P["card"])
        self.btn_run.pack(fill="x")
        row = tk.Frame(hero, bg=P["card"])
        row.pack(fill="x", pady=(px(14), 0))
        self.m_dot = Dot(row, P["muted"], P["card"], 9)
        self.m_dot.pack(side="left")
        self.m_status = tk.Label(row, text="", bg=P["card"], fg=P["muted"], font=F(10), anchor="w")
        self.m_status.pack(side="left", padx=(px(8), 0))
        chip = tk.Frame(row, bg=P["soft"])
        chip.pack(side="right")
        self.m_live = tk.Label(chip, text="-", width=8, bg=P["soft"], fg=P["muted"], font=F(10, "bold"),
                               pady=px(2))
        self.m_live.pack()
        self.m_note = tk.Label(hero, text="", bg=P["soft"], fg=P["accent"], font=F(9), anchor="w", justify="left",
                               wraplength=px(300), padx=px(8), pady=px(6))

        cap = self.card(f, "What to watch")
        Segmented(cap, P, [("screen", "Full screen"), ("area", "Selected area")], self.settings["source"],
                  self._on_source, bg=P["card"]).pack(fill="x")
        self.cap_sub = tk.Frame(cap, bg=P["card"], height=px(70))
        self.cap_sub.pack(fill="x", pady=(px(12), 0))
        self.cap_sub.pack_propagate(False)
        self.fill_capture_sub()
        return f

    def _on_source(self, v):
        self.settings["source"] = v
        self.sync_cfg()
        self.save_soon()
        self.fill_capture_sub()

    def _on_monitor(self, v):
        self.settings["monitor"] = v
        self.sync_cfg()
        self.save_soon()
        self.fill_capture_sub()

    def fill_capture_sub(self):
        if not hasattr(self, "cap_sub") or not self.cap_sub.winfo_exists():
            return
        P = self.P
        for c in self.cap_sub.winfo_children():
            c.destroy()
        s = self.settings
        if s["source"] == "screen":
            if len(self.monitors) > 1:
                Segmented(self.cap_sub, P, [(i, f"Screen {i + 1}") for i in range(min(4, len(self.monitors)))],
                          min(int(s["monitor"]), len(self.monitors) - 1), self._on_monitor, height=30,
                          bg=P["card"]).pack(fill="x", pady=(0, px(6)))
            r = self.capture_rect()
            self.label(self.cap_sub, f"Watching the whole screen  ·  {r['width']} × {r['height']}",
                       muted=True, size=9).pack(anchor="w")
            self.label(self.cap_sub, "Tip: 'Selected area' around the video tile is much more accurate.",
                       muted=True, size=9).pack(anchor="w", pady=(px(2), 0))
        else:
            row = tk.Frame(self.cap_sub, bg=P["card"])
            row.pack(fill="x")
            a = s["area"]
            txt = (f"{a['width']} × {a['height']}  at  {a['left']}, {a['top']}" if a else "No area chosen yet")
            self.label(row, txt, size=10, bold=bool(a)).pack(side="left")
            Button(row, "Choose area" if not a else "Change", self.select_area, P, variant="soft", height=30,
                   icon="crop", size=9, bg=P["card"]).pack(side="right")
            self.label(self.cap_sub, "Draw a box around the person signing or their video tile.",
                       muted=True, size=9).pack(anchor="w", pady=(px(8), 0))

    # ----- Display tab
    def _slider_row(self, parent, text, key, lo, hi, step, fmt):
        P = self.P
        row = tk.Frame(parent, bg=P["card"])
        row.pack(fill="x", pady=(0, px(12)))
        top = tk.Frame(row, bg=P["card"])
        top.pack(fill="x")
        self.label(top, text, bold=True).pack(side="left")
        val = tk.Label(top, text=fmt(self.settings[key]), bg=P["card"], fg=P["accent"], font=F(10, "bold"))
        val.pack(side="right")

        def on(v, _final=False):
            val.configure(text=fmt(v))
            self.set(key, v)

        Slider(row, P, lo, hi, step, self.settings[key], on, bg=P["card"]).pack(fill="x", pady=(px(4), 0))

    def _page_display(self):
        P = self.P
        f = tk.Frame(self.host, bg=P["bg"])
        c = self.card(f, "Display")
        s = self.settings

        def block(title):
            self.label(c, title, bold=True).pack(anchor="w", pady=(0, px(5)))

        block("Appearance")
        Segmented(c, P, [("system", "System"), ("light", "Light"), ("dark", "Dark")], s["theme"],
                  self._on_theme, height=30, bg=P["card"]).pack(fill="x", pady=(0, px(12)))
        block("Caption box starts in the")
        Segmented(c, P, [("tl", "Top left"), ("tr", "Top right")], s["corner"], self._on_corner, height=30,
                  bg=P["card"]).pack(fill="x", pady=(0, px(12)))
        self._slider_row(c, "Caption text size", "textSize", 12, 40, 1, lambda v: f"{int(v)} px")
        row = tk.Frame(c, bg=P["card"])
        row.pack(fill="x")
        self.label(row, "Mirror frames", bold=True).pack(side="left")
        Toggle(row, P, s["mirror"], lambda v: self.set("mirror", bool(v)), bg=P["card"]).pack(side="right")
        self.label(c, "Try this if the letters come out wrong.", muted=True, size=9).pack(anchor="w")
        return f

    # ----- Account tab
    def _page_account(self):
        P = self.P
        f = tk.Frame(self.host, bg=P["bg"])
        c = self.card(f, "Account")
        u = self.auth.user or {}
        name = u.get("display_name") or u.get("email") or "Signed in"
        row = tk.Frame(c, bg=P["card"])
        row.pack(fill="x")
        s = px(46)
        av = tk.Canvas(row, width=s, height=s, bg=P["card"], highlightthickness=0, bd=0)
        av.create_oval(0, 0, s - 1, s - 1, fill=P["soft"], outline="")
        av.create_text(s / 2, s / 2, text=name[:1].upper(), fill=P["accent"], font=F(15, "bold"))
        av.pack(side="left")
        col = tk.Frame(row, bg=P["card"])
        col.pack(side="left", padx=px(12))
        self.acct_name = tk.Label(col, text=name, bg=P["card"], fg=P["text"], font=F(11, "bold"), anchor="w")
        self.acct_name.pack(anchor="w")
        if u.get("email"):
            tk.Label(col, text=u["email"], bg=P["card"], fg=P["muted"], font=F(9), anchor="w").pack(anchor="w")
        self.btn_out = Button(c, "Sign out", self.sign_out, P, variant="field", height=40, size=10, bg=P["card"])
        self.btn_out.pack(fill="x", pady=(px(16), 0))
        return f

    def fill_account(self):
        pass

    def _on_theme(self, v):
        self.settings["theme"] = v
        self._sys_dark = system_is_dark()
        self.save_soon()
        self.root.after(20, self.restyle)

    def _on_corner(self, v):
        self.settings["corner"] = v
        o = self.settings["overlay"]
        o["x"] = o["y"] = None
        self.save_soon()
        self.overlay.apply_geometry()

    def restyle(self):
        text = self.overlay.get_text()
        self.build_ui()
        self.overlay.build(text)
        self.overlay.pill.build()
        self.update_run_ui()
        self.refresh_status()

    # ------------------------------------------------------------ lifecycle
    def quit(self):
        self.engine.shutdown()
        self.settings.save()
        try:
            self.root.destroy()
        except tk.TclError:
            pass

    def run(self):
        self.root.mainloop()
