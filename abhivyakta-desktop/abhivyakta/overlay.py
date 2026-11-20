"""The floating caption box (editable, draggable, resizable, minimizable) and its minimized pill."""
import datetime
import sys
import tkinter as tk
from pathlib import Path

from .region import geo
from .theme import F, FD, palette, px
from .widgets import IconButton, Logo, Dot, Tooltip, round_rect

PLACEHOLDER = "Letters you sign appear here - click to edit, Enter for a new line."


def round_corners(top):
    """Windows 11: ask DWM for rounded corners on our borderless window (harmless elsewhere)."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        top.update_idletasks()
        hwnd = ctypes.windll.user32.GetAncestor(top.winfo_id(), 2)
        pref = ctypes.c_int(2)  # DWMWCP_ROUND
        ctypes.windll.dwmapi.DwmSetWindowAttribute(hwnd, 33, ctypes.byref(pref), ctypes.sizeof(pref))
    except Exception:
        pass


class CaptionOverlay:
    def __init__(self, app):
        self.app = app
        self.root = app.root
        self.top = tk.Toplevel(self.root)
        self.top.withdraw()
        self.top.overrideredirect(True)
        self._topmost(self.top)
        self.visible = False
        self.minimized = False
        self._suspended = None
        self._drag = None
        self._rs = None
        self._toast = None
        self._toast_job = None
        self.status = ("idle", "Ready", None)
        self.live = None
        self.running = False
        self.narrow = False
        self.pill = MiniPill(self)
        self.apply_geometry()
        self.build("")
        round_corners(self.top)

    @staticmethod
    def _topmost(w):
        try:
            w.attributes("-topmost", True)
        except tk.TclError:
            pass

    # ------------------------------------------------------------ build
    def build(self, text=""):
        for c in self.top.winfo_children():
            c.destroy()
        P = self.P = palette(self.app.dark(), "overlay")
        self.top.configure(bg=P["border"])
        inner = tk.Frame(self.top, bg=P["bg"])
        inner.pack(fill="both", expand=True, padx=1, pady=1)
        self.inner = inner

        head = self.head = tk.Frame(inner, bg=P["bg"], height=px(34))
        head.pack(fill="x")
        head.pack_propagate(False)
        logo = Logo(head, 18, P, bg=P["bg"])
        logo.pack(side="left", padx=(px(8), px(7)))
        self.title = tk.Label(head, text="Abhivyakta", bg=P["bg"], fg=P["text"], font=F(10, "bold"))
        self.title.pack(side="left")

        btns = tk.Frame(head, bg=P["bg"])
        btns.pack(side="right", padx=(0, px(6)))
        mk = lambda icon, tip, cmd: IconButton(btns, icon, cmd, P, tip=tip, bg=P["bg"])
        self.b_run = mk("pause" if self.running else "play", "Start / stop translating", self.app.toggle_running)
        self.b_back = mk("back", "Backspace (delete last character)", self.backspace)
        self.b_clear = mk("trash", "Clear everything", self.clear)
        self.b_copy = mk("copy", "Copy text", self.copy)
        self.b_save = mk("save", "Save as .txt (Documents/Abhivyakta)", self.save)
        self.b_dock = mk("dock", "Move back to the corner", self.snap_corner)
        self.b_min = mk("min", "Minimize", self.minimize)
        for b in (self.b_run, self.b_back, self.b_clear, self.b_copy, self.b_save, self.b_dock, self.b_min):
            b.pack(side="left", padx=1)

        self.chip = tk.Frame(head, bg=P["soft"])
        self.chip.pack(side="right", padx=(px(4), px(6)), pady=px(5))
        self.live_l = tk.Label(self.chip, text="-", width=2, bg=P["soft"], fg=P["accent"], font=F(11, "bold"))
        self.live_p = tk.Label(self.chip, text="", width=4, bg=P["soft"], fg=P["accent"], font=F(8))
        self.live_l.pack(side="left", padx=(px(6), 0))
        self.live_p.pack(side="left", padx=(0, px(4)))

        stat = self.stat = tk.Frame(head, bg=P["bg"])
        stat.pack(side="left", fill="x", expand=True, padx=(px(10), 0))
        self.dot = Dot(stat, P["muted"], P["bg"], 7)
        self.dot.pack(side="left")
        self.stat_lbl = tk.Label(stat, text="", bg=P["bg"], fg=P["muted"], font=F(9), anchor="w")
        self.stat_lbl.pack(side="left", padx=(px(6), 0))

        tk.Frame(inner, bg=P["border"], height=1).pack(fill="x")
        self.note = tk.Label(inner, text="", bg=P["soft"], fg=P["accent"], font=F(9), anchor="w", justify="left",
                             padx=px(8), pady=px(4))
        self.body = tk.Frame(inner, bg=P["bg"])
        self.body.pack(fill="both", expand=True, padx=px(8), pady=(px(6), px(8)))

        self.text = tk.Text(
            self.body, wrap="word", undo=True, relief="flat", bd=0, bg=P["field"], fg=P["text"],
            insertbackground=P["accent"], selectbackground=P["accent"], selectforeground="#ffffff",
            inactiveselectbackground=P["soft"], highlightthickness=1, highlightbackground=P["field"],
            highlightcolor=P["accent"], padx=px(8), pady=px(5), font=F(self.app.settings["textSize"] * 0.75),
            insertwidth=px(2), takefocus=True,
        )
        self.text.pack(fill="both", expand=True)
        self.ph = tk.Label(self.body, text=PLACEHOLDER, bg=P["field"], fg=P["muted"], font=F(10), anchor="nw",
                           justify="left", wraplength=px(300))
        self.ph.bind("<Button-1>", lambda e: self.text.focus_force())
        self.text.bind("<Button-1>", lambda e: self.text.focus_force(), add="+")
        self.text.bind("<KeyRelease>", lambda e: self._sync_ph(), add="+")
        for seq in ("<<Paste>>", "<<Cut>>", "<<Undo>>", "<<Redo>>"):
            self.text.bind(seq, lambda e: self.top.after_idle(self._sync_ph), add="+")
        for seq in ("<Control-a>", "<Control-A>", "<Command-a>"):
            self.text.bind(seq, self._select_all)
        if text:
            self.text.insert("1.0", text)
        self._sync_ph()

        grip = self.grip = tk.Canvas(inner, width=px(16), height=px(16), bg=P["bg"], highlightthickness=0, bd=0)
        for i in (4, 8, 12):
            grip.create_line(px(15), px(i), px(i), px(15), fill=P["muted"], width=max(1, px(1)))
        try:
            grip.configure(cursor="size_nw_se" if sys.platform == "win32" else "bottom_right_corner")
        except tk.TclError:
            pass
        grip.place(relx=1.0, rely=1.0, anchor="se", x=-px(2), y=-px(2))
        grip.lift()
        grip.bind("<ButtonPress-1>", self._rs_start)
        grip.bind("<B1-Motion>", self._rs_move)
        grip.bind("<ButtonRelease-1>", self._rs_end)

        for w in (head, logo, self.title, stat, self.dot, self.stat_lbl, self.chip, self.live_l, self.live_p):
            w.bind("<ButtonPress-1>", self._drag_start)
            w.bind("<B1-Motion>", self._drag_move)
            w.bind("<ButtonRelease-1>", self._drag_end)
            w.bind("<Double-Button-1>", lambda e: self.snap_corner())
        self.top.bind("<Configure>", self._on_configure)

        self.pill.build()
        self._on_configure(None)
        self.set_running(self.running)
        self.set_status(*self.status)
        self.set_live(self.live)
        self._refresh_note()
        if not self._moved():
            self.b_dock.pack_forget()

    # ------------------------------------------------------------ text operations
    def get_text(self):
        return self.text.get("1.0", "end-1c")

    def _focused(self):
        try:
            return self.root.focus_get() is self.text
        except (KeyError, tk.TclError):
            return False

    def _select_all(self, _e):
        self.text.tag_add("sel", "1.0", "end-1c")
        return "break"

    def _sync_ph(self):
        if self.text.get("1.0", "end-1c"):
            self.ph.place_forget()
        else:
            self.ph.place(in_=self.text, x=px(10), y=px(6))
            self.ph.lift()

    def insert(self, s):
        t = self.text
        focused = self._focused()
        if s == " ":
            prev = t.get("insert-1c", "insert") if focused else t.get("end-2c", "end-1c")
            if not t.get("1.0", "end-1c") or prev == "" or prev.isspace():
                return
        if focused:
            t.insert("insert", s)
        else:
            t.insert("end", s)
        t.see("end" if not focused else "insert")
        self._sync_ph()

    def backspace(self):
        t = self.text
        if t.tag_ranges("sel"):
            t.delete("sel.first", "sel.last")
        elif self._focused():
            t.delete("insert-1c", "insert")
        else:
            t.delete("end-2c", "end-1c")
        self._sync_ph()

    def clear(self):
        self.text.delete("1.0", "end")
        self.app.engine.reset_caption()
        self._sync_ph()

    def copy(self):
        v = self.get_text()
        if not v.strip():
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(v)
        self.root.update_idletasks()
        self.b_copy.flash_ok()

    def save(self):
        v = self.get_text()
        if not v.strip():
            self.toast("Nothing to save yet")
            return
        folder = Path.home() / "Documents" / "Abhivyakta"
        try:
            folder.mkdir(parents=True, exist_ok=True)
        except OSError:
            folder = Path.home()
        name = datetime.datetime.now().strftime("Abhivyakta-%Y%m%d-%H%M%S.txt")
        path = folder / name
        try:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(v.replace("\n", "\r\n") + "\r\n")
        except OSError as e:
            self.toast(f"Could not save: {e}")
            return
        self.b_save.flash_ok()
        self.toast(f"Saved - {path}")

    # ------------------------------------------------------------ notes / toast
    def toast(self, msg, ms=3500):
        self._toast = msg
        if self._toast_job:
            self.top.after_cancel(self._toast_job)
        self._toast_job = self.top.after(ms, self._end_toast)
        self._refresh_note()

    def _end_toast(self):
        self._toast = None
        self._toast_job = None
        self._refresh_note()

    def _refresh_note(self):
        k, _short, msg = self.status
        text = self._toast or msg
        if not text:
            self.note.pack_forget()
            return
        P = self.P
        err = (not self._toast) and k == "err"
        self.note.configure(text=text, bg=P["errbg"] if err else P["soft"], fg=P["err"] if err else P["accent"],
                            wraplength=max(px(200), self.top.winfo_width() - px(30)))
        self.note.pack(fill="x", padx=px(8), pady=(px(6), 0), before=self.body)

    # ------------------------------------------------------------ status
    def set_status(self, kind, short, msg):
        self.status = (kind, short, msg)
        P = self.P
        color = {"ok": P["ok"], "load": P["warn"], "err": P["err"]}.get(kind, P["muted"])
        self.dot.set(color)
        self.stat_lbl.configure(text="" if self.narrow else short)
        self._refresh_note()

    def set_live(self, live):
        """live: None or (label, conf)."""
        self.live = live
        P = self.P
        if live:
            self.live_l.configure(text=live[0], fg=P["accent"])
            self.live_p.configure(text=f"{round(live[1] * 100)}%")
        else:
            self.live_l.configure(text="-", fg=P["muted"])
            self.live_p.configure(text="")
        self.pill.set_live(live[0] if live else None)

    def set_running(self, running):
        self.running = running
        self.b_run.set_icon("pause" if running else "play")
        self.pill.redraw()

    def apply_font(self):
        self.text.configure(font=F(self.app.settings["textSize"] * 0.75))

    # ------------------------------------------------------------ geometry / visibility
    def _bounds(self):
        return self.app.virtual_bounds()

    def default_pos(self, w, h):
        l, t, r, b = self.app.capture_bounds()
        margin = px(16)
        x = l + margin if self.app.settings["corner"] == "tl" else r - w - margin
        y = t + px(52)
        return x, y

    def apply_geometry(self):
        o = self.app.settings["overlay"]
        w = int(o["w"]) if o.get("w") else px(460)
        h = int(o["h"]) if o.get("h") else px(190)
        if o.get("x") is None or o.get("y") is None:
            x, y = self.default_pos(w, h)
        else:
            x, y = int(o["x"]), int(o["y"])
        l, t, r, b = self._bounds()
        w, h = min(w, r - l), min(h, b - t)
        x = max(l, min(x, r - w))
        y = max(t, min(y, b - h))
        self.top.geometry(geo(w, h, x, y))

    def _moved(self):
        o = self.app.settings["overlay"]
        return o.get("x") is not None

    def snap_corner(self):
        o = self.app.settings["overlay"]
        o["x"] = o["y"] = None
        self.apply_geometry()
        self._save_geometry(keep_pos=False)
        try:
            self.b_dock.pack_forget()
        except tk.TclError:
            pass

    def _save_geometry(self, keep_pos=True):
        o = self.app.settings["overlay"]
        o["w"], o["h"] = self.top.winfo_width(), self.top.winfo_height()
        if keep_pos:
            o["x"], o["y"] = self.top.winfo_x(), self.top.winfo_y()
        self.app.save_soon()

    def _on_configure(self, e):
        if e is not None and e.widget is not self.top:
            return
        w = self.top.winfo_width()
        narrow = w < px(430)
        if narrow != self.narrow:
            self.narrow = narrow
            self.title.configure(text="" if narrow else "Abhivyakta")
            self.stat_lbl.configure(text="" if narrow else self.status[1])
        self.ph.configure(wraplength=max(px(120), w - px(50)))
        if self.note.winfo_ismapped():
            self.note.configure(wraplength=max(px(200), w - px(30)))

    def show(self):
        self.minimized = False
        self.pill.hide()
        self.top.deiconify()
        self._topmost(self.top)
        self.top.lift()
        self.visible = True

    def minimize(self):
        self.minimized = True
        self.top.withdraw()
        self.pill.show()

    def restore(self):
        self.show()

    def suspend(self):
        """Hide everything temporarily (while picking a screen area)."""
        self._suspended = (self.visible, self.minimized)
        self.top.withdraw()
        self.pill.hide()

    def resume(self):
        if not self._suspended:
            return
        vis, mini = self._suspended
        self._suspended = None
        if vis and mini:
            self.minimized = True
            self.pill.show()
        elif vis:
            self.show()

    def keep_on_top(self):
        if self.visible and not self.minimized:
            self._topmost(self.top)
            self.top.lift()
        elif self.minimized:
            self.pill.keep_on_top()

    # ------------------------------------------------------------ drag + resize
    def _drag_start(self, e):
        self._drag = (e.x_root - self.top.winfo_x(), e.y_root - self.top.winfo_y())

    def _drag_move(self, e):
        if not self._drag:
            return
        self.top.geometry(f"{e.x_root - self._drag[0]:+d}{e.y_root - self._drag[1]:+d}")

    def _drag_end(self, _e):
        if self._drag:
            self._drag = None
            self._save_geometry()
            if not self.b_dock.winfo_ismapped():
                self.b_dock.pack(side="left", padx=1, before=self.b_min)

    def _rs_start(self, e):
        self._rs = (e.x_root, e.y_root, self.top.winfo_width(), self.top.winfo_height())

    def _rs_move(self, e):
        if not self._rs:
            return
        w = max(px(320), self._rs[2] + e.x_root - self._rs[0])
        h = max(px(120), self._rs[3] + e.y_root - self._rs[1])
        self.top.geometry(geo(w, h, self.top.winfo_x(), self.top.winfo_y()))

    def _rs_end(self, _e):
        if self._rs:
            self._rs = None
            self._save_geometry()


class MiniPill:
    """The orange minimized chip. Click to reopen the caption box, drag to move it."""
    KEY = "#010203"

    def __init__(self, overlay):
        self.ov = overlay
        self.app = overlay.app
        self.label = None
        self.visible = False
        self._press = None
        t = self.top = tk.Toplevel(self.app.root)
        t.withdraw()
        t.overrideredirect(True)
        CaptionOverlay._topmost(t)
        self.clear_color = False
        try:
            t.attributes("-transparentcolor", self.KEY)   # Windows: gives a true rounded pill
            self.clear_color = True
        except tk.TclError:
            pass
        self.canvas = tk.Canvas(t, highlightthickness=0, bd=0, cursor="hand2")
        self.canvas.pack()
        self.canvas.bind("<ButtonPress-1>", self._down)
        self.canvas.bind("<B1-Motion>", self._move)
        self.canvas.bind("<ButtonRelease-1>", self._up)
        Tooltip(self.canvas, "Open Abhivyakta")
        self.build()

    def build(self):
        self.P = palette(self.app.dark())
        self.W, self.H = px(168), px(32)
        bg = self.KEY if self.clear_color else self.P["bg"]
        self.top.configure(bg=bg)
        self.canvas.configure(bg=bg, width=self.W, height=self.H)
        self.redraw()

    def redraw(self):
        c, P, W, H = self.canvas, self.P, self.W, self.H
        c.delete("all")
        round_rect(c, 1, 1, W - 1, H - 1, H / 2, fill=P["accent"], outline="")
        r = H / 2 - px(4)
        cx, cy = px(4) + r, H / 2
        c.create_oval(cx - r, cy - r, cx + r, cy + r, fill="#ffffff", outline="")
        c.create_text(cx, cy - 1, text="अ", fill=P["accent"], font=FD(10))
        c.create_text(px(36), H / 2, text="Abhivyakta", anchor="w", fill="#ffffff", font=F(10, "bold"))
        if self.label:
            x2, y1, y2 = W - px(8), px(5), H - px(5)
            round_rect(c, x2 - px(24), y1, x2, y2, px(8), fill="#ffffff", outline="")
            c.create_text(x2 - px(12), H / 2, text=self.label, fill=P["accent"], font=F(11, "bold"))
        elif self.ov.running:
            c.create_oval(W - px(18), H / 2 - px(4), W - px(10), H / 2 + px(4), fill="#ffffff", outline="")

    def set_live(self, label):
        if label != self.label:
            self.label = label
            self.redraw()

    def place_default(self):
        s = self.app.settings
        if s.get("pill"):
            x, y = int(s["pill"]["x"]), int(s["pill"]["y"])
        else:
            l, t, r, b = self.app.capture_bounds()
            x, y = l + px(16), b - self.H - px(84)
        vl, vt, vr, vb = self.app.virtual_bounds()
        x = max(vl, min(x, vr - self.W))
        y = max(vt, min(y, vb - self.H))
        self.top.geometry(f"{x:+d}{y:+d}")

    def show(self):
        self.place_default()
        self.top.deiconify()
        CaptionOverlay._topmost(self.top)
        self.top.lift()
        self.visible = True

    def hide(self):
        self.top.withdraw()
        self.visible = False

    def keep_on_top(self):
        if self.visible:
            CaptionOverlay._topmost(self.top)
            self.top.lift()

    def _down(self, e):
        self._press = (e.x_root, e.y_root, self.top.winfo_x(), self.top.winfo_y(), False)

    def _move(self, e):
        if not self._press:
            return
        x0, y0, wx, wy, moved = self._press
        dx, dy = e.x_root - x0, e.y_root - y0
        if not moved and abs(dx) + abs(dy) < px(5):
            return
        self._press = (x0, y0, wx, wy, True)
        self.top.geometry(f"{wx + dx:+d}{wy + dy:+d}")

    def _up(self, _e):
        if not self._press:
            return
        moved = self._press[4]
        self._press = None
        if moved:
            self.app.settings["pill"] = {"x": self.top.winfo_x(), "y": self.top.winfo_y()}
            self.app.save_soon()
        else:
            self.ov.restore()
