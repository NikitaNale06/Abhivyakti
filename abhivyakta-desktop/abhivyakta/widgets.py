"""Small canvas-drawn widgets (rounded buttons, segmented control, slider, toggle, icon buttons)."""
import tkinter as tk
from tkinter import font as tkfont

from .theme import F, FD, px, shade

# 24x24 line icons, same shapes as the extension. Names in FILLED are drawn as solid shapes.
ICONS = {
    "back": [[(21, 5), (9, 5), (3, 12), (9, 19), (21, 19), (21, 5)], [(17, 9.5), (12, 14.5)], [(12, 9.5), (17, 14.5)]],
    "trash": [[(4, 7), (20, 7)], [(9, 7), (9, 4.5), (15, 4.5), (15, 7)], [(6, 7), (7, 20), (17, 20), (18, 7)],
              [(10, 11), (10, 16)], [(14, 11), (14, 16)]],
    "copy": [[(9, 9), (20, 9), (20, 20), (9, 20), (9, 9)], [(5, 15), (5, 4), (16, 4)]],
    "save": [[(12, 4), (12, 15)], [(7.5, 10.5), (12, 15), (16.5, 10.5)], [(5, 20), (19, 20)]],
    "min": [[(6, 12), (18, 12)]],
    "check": [[(5, 12.5), (9.5, 17), (19, 7.5)]],
    "dock": [[(4, 5), (20, 5), (20, 19), (4, 19), (4, 5)], [(4, 9), (20, 9)]],
    "play": [[(8, 5), (19, 12), (8, 19)]],
    "stop": [[(7, 7), (17, 7), (17, 17), (7, 17)]],
    "pause": [[(9, 5), (9, 19)], [(15, 5), (15, 19)]],
    "crop": [[(7, 3), (7, 17), (21, 17)], [(3, 7), (17, 7), (17, 21)]],
}
FILLED = {"play", "stop"}


def round_rect(c, x1, y1, x2, y2, r, **kw):
    r = max(0, min(r, (x2 - x1) / 2, (y2 - y1) / 2))
    pts = [x1 + r, y1, x1 + r, y1, x2 - r, y1, x2 - r, y1, x2, y1, x2, y1 + r, x2, y1 + r, x2, y2 - r,
           x2, y2 - r, x2, y2, x2 - r, y2, x2 - r, y2, x1 + r, y2, x1 + r, y2, x1, y2, x1, y2 - r,
           x1, y2 - r, x1, y1 + r, x1, y1 + r, x1, y1]
    return c.create_polygon(pts, smooth=True, **kw)


def draw_icon(c, name, color, x, y, size, tag="ic"):
    k = size / 24.0
    for pts in ICONS[name]:
        flat = []
        for (a, b) in pts:
            flat += [x + a * k, y + b * k]
        if name in FILLED:
            c.create_polygon(flat, fill=color, outline=color, width=max(1, round(1.6 * k)),
                             joinstyle="round", tags=tag)
        else:
            c.create_line(*flat, fill=color, width=max(1.0, 1.9 * k), capstyle="round",
                          joinstyle="round", tags=tag)


# ---------------------------------------------------------------- tooltip
class Tooltip:
    def __init__(self, widget, text):
        self.w, self.text, self.tip, self.job = widget, text, None, None
        widget.bind("<Enter>", self._enter, add="+")
        widget.bind("<Leave>", self._leave, add="+")
        widget.bind("<ButtonPress>", self._leave, add="+")

    def _enter(self, _e):
        self._leave()
        self.job = self.w.after(450, self._show)

    def _leave(self, _e=None):
        if self.job:
            self.w.after_cancel(self.job)
            self.job = None
        if self.tip:
            self.tip.destroy()
            self.tip = None

    def _show(self):
        self.job = None
        try:
            x = self.w.winfo_rootx()
            y = self.w.winfo_rooty() + self.w.winfo_height() + px(6)
            tip = tk.Toplevel(self.w)
            tip.overrideredirect(True)
            try:
                tip.attributes("-topmost", True)
            except tk.TclError:
                pass
            tk.Label(tip, text=self.text, bg="#18181b", fg="#f4f4f5", font=F(9), padx=px(8), pady=px(3)).pack()
            tip.geometry(f"{x:+d}{y:+d}")
            self.tip = tip
        except tk.TclError:
            self.tip = None


# ---------------------------------------------------------------- logo
class Logo(tk.Canvas):
    def __init__(self, parent, size, pal, bg=None):
        s = px(size)
        super().__init__(parent, width=s, height=s, bg=bg or pal["bg"], highlightthickness=0, bd=0)
        round_rect(self, 0, 0, s, s, s * 0.28, fill=pal["accent"], outline="")
        self.create_text(s / 2, s / 2 - 1, text="अ", fill="#ffffff", font=FD(max(7, size * 0.38)))


# ---------------------------------------------------------------- status dot
class Dot(tk.Canvas):
    def __init__(self, parent, color, bg, size=8):
        s = px(size)
        super().__init__(parent, width=s, height=s, bg=bg, highlightthickness=0, bd=0)
        self.s = s
        self.item = self.create_oval(0, 0, s - 1, s - 1, fill=color, outline="")

    def set(self, color):
        self.itemconfigure(self.item, fill=color)


# ---------------------------------------------------------------- icon button
class IconButton(tk.Canvas):
    def __init__(self, parent, icon, command, pal, tip=None, size=26, icon_px=14, bg=None):
        s = px(size)
        super().__init__(parent, width=s, height=s, bg=bg or pal["bg"], highlightthickness=0, bd=0, cursor="hand2")
        self.p, self.icon, self.cmd, self.s, self.ip = pal, icon, command, s, px(icon_px)
        self.hover = False
        self.ok = False
        self._job = None
        self.bind("<Enter>", lambda e: self._set_hover(True))
        self.bind("<Leave>", lambda e: self._set_hover(False))
        self.bind("<ButtonRelease-1>", self._release)
        if tip:
            Tooltip(self, tip)
        self._draw()

    def _set_hover(self, v):
        self.hover = v
        self._draw()

    def _release(self, _e):
        if self.hover and self.cmd:
            self.cmd()

    def _draw(self):
        self.delete("all")
        p = self.p
        if self.hover:
            round_rect(self, 0, 0, self.s, self.s, px(7), fill=p["field"], outline="")
        color = p["ok"] if self.ok else (p["text"] if self.hover else p["muted"])
        off = (self.s - self.ip) / 2
        draw_icon(self, "check" if self.ok else self.icon, color, off, off, self.ip)

    def set_icon(self, name):
        self.icon = name
        self._draw()

    def flash_ok(self, ms=1200):
        self.ok = True
        self._draw()
        if self._job:
            self.after_cancel(self._job)
        self._job = self.after(ms, self._unflash)

    def _unflash(self):
        self.ok = False
        self._job = None
        self._draw()


# ---------------------------------------------------------------- rounded button
class Button(tk.Canvas):
    def __init__(self, parent, text, command, pal, variant="accent", height=40, icon=None, size=10, bg=None, radius=10):
        self.h = px(height)
        super().__init__(parent, width=px(120), height=self.h, bg=bg or pal["card"], highlightthickness=0, bd=0,
                         cursor="hand2")
        self.p, self.text, self.cmd, self.variant, self.icon = pal, text, command, variant, icon
        self.fsize, self.radius, self.w, self.hover = size, px(radius), px(120), False
        self.font = tkfont.Font(root=self, font=F(size, "bold"))
        self.bind("<Configure>", self._cfg)
        self.bind("<Enter>", lambda e: self._set_hover(True))
        self.bind("<Leave>", lambda e: self._set_hover(False))
        self.bind("<ButtonRelease-1>", self._release)

    def _cfg(self, e):
        self.w = e.width
        self._draw()

    def _set_hover(self, v):
        self.hover = v
        self._draw()

    def _release(self, _e):
        if self.hover and self.cmd:
            self.cmd()

    def _colors(self):
        p = self.p
        if self.variant == "accent":
            return (p["accent_hover"] if self.hover else p["accent"]), p["onaccent"]
        if self.variant == "soft":
            return (shade(p["soft"], -0.05) if self.hover else p["soft"]), p["accent"]
        return (shade(p["field"], -0.04) if self.hover else p["field"]), p["text"]

    def _draw(self):
        self.delete("all")
        fill, fg = self._colors()
        round_rect(self, 0, 0, self.w, self.h, self.radius, fill=fill, outline="")
        tw = self.font.measure(self.text)
        isz = px(16) if self.icon else 0
        gap = px(8) if self.icon else 0
        x = (self.w - (isz + gap + tw)) / 2
        if self.icon:
            draw_icon(self, self.icon, fg, x, (self.h - isz) / 2, isz)
        self.create_text(x + isz + gap, self.h / 2, text=self.text, fill=fg, font=self.font, anchor="w")

    def set(self, text=None, variant=None, icon="keep"):
        if text is not None:
            self.text = text
        if variant is not None:
            self.variant = variant
        if icon != "keep":
            self.icon = icon
        self._draw()


# ---------------------------------------------------------------- segmented control
class Segmented(tk.Canvas):
    def __init__(self, parent, pal, options, value, command, height=34, bg=None, size=9):
        self.h = px(height)
        super().__init__(parent, width=px(100), height=self.h, bg=bg or pal["card"], highlightthickness=0, bd=0,
                         cursor="hand2")
        self.p, self.options, self.value, self.cmd, self.w = pal, list(options), value, command, px(100)
        self.pad = px(3)
        self.font = tkfont.Font(root=self, font=F(size, "bold"))
        self.bind("<Configure>", self._cfg)
        self.bind("<Button-1>", self._click)

    def _cfg(self, e):
        self.w = e.width
        self._draw()

    def _draw(self):
        self.delete("all")
        p, pad = self.p, self.pad
        round_rect(self, 0, 0, self.w, self.h, px(10), fill=p["field"], outline="")
        n = max(1, len(self.options))
        sw = (self.w - 2 * pad) / n
        for i, (val, label) in enumerate(self.options):
            x1 = pad + i * sw
            x2 = x1 + sw
            sel = val == self.value
            if sel:
                round_rect(self, x1, pad, x2, self.h - pad, px(8), fill=p["accent"], outline="")
            self.create_text((x1 + x2) / 2, self.h / 2, text=label, font=self.font,
                             fill=p["onaccent"] if sel else p["muted"])

    def _click(self, e):
        n = max(1, len(self.options))
        sw = (self.w - 2 * self.pad) / n
        i = min(n - 1, max(0, int((e.x - self.pad) // sw)))
        val = self.options[i][0]
        if val != self.value:
            self.value = val
            self._draw()
            if self.cmd:
                self.cmd(val)

    def set(self, value):
        self.value = value
        self._draw()


# ---------------------------------------------------------------- toggle switch
class Toggle(tk.Canvas):
    def __init__(self, parent, pal, value, command, bg=None):
        self.w, self.h = px(44), px(26)
        super().__init__(parent, width=self.w, height=self.h, bg=bg or pal["card"], highlightthickness=0, bd=0,
                         cursor="hand2")
        self.p, self.value, self.cmd = pal, bool(value), command
        self.bind("<Button-1>", self._click)
        self._draw()

    def _draw(self):
        self.delete("all")
        p = self.p
        if self.value:
            round_rect(self, 0, 0, self.w, self.h, self.h / 2, fill=p["accent"], outline="")
        else:
            round_rect(self, 0, 0, self.w, self.h, self.h / 2, fill=p["field"], outline=p["border"])
        r = px(9)
        cx = self.w - px(2) - r - px(1) if self.value else px(2) + r + px(1)
        cy = self.h / 2
        self.create_oval(cx - r, cy - r, cx + r, cy + r, fill="#ffffff" if self.value else p["muted"], outline="")

    def _click(self, _e):
        self.value = not self.value
        self._draw()
        if self.cmd:
            self.cmd(self.value)


# ---------------------------------------------------------------- slider
class Slider(tk.Canvas):
    """command(value, final) is called while dragging (final=False) and on release (final=True)."""

    def __init__(self, parent, pal, lo, hi, step, value, command, bg=None):
        self.h = px(22)
        super().__init__(parent, width=px(100), height=self.h, bg=bg or pal["card"], highlightthickness=0, bd=0,
                         cursor="hand2")
        self.p, self.lo, self.hi, self.step, self.value, self.cmd = pal, lo, hi, step, value, command
        self.w, self.pad = px(100), px(10)
        self.bind("<Configure>", self._cfg)
        self.bind("<Button-1>", lambda e: self._move(e.x, False))
        self.bind("<B1-Motion>", lambda e: self._move(e.x, False))
        self.bind("<ButtonRelease-1>", lambda e: self._move(e.x, True))

    def _cfg(self, e):
        self.w = e.width
        self._draw()

    def _x(self):
        frac = (self.value - self.lo) / float(self.hi - self.lo)
        return self.pad + max(0.0, min(1.0, frac)) * (self.w - 2 * self.pad)

    def _draw(self):
        self.delete("all")
        p, cy, t = self.p, self.h / 2, px(3)
        x = self._x()
        round_rect(self, self.pad, cy - t, self.w - self.pad, cy + t, t, fill=p["field"], outline=p["border"])
        round_rect(self, self.pad, cy - t, max(self.pad + 1, x), cy + t, t, fill=p["accent"], outline="")
        r = px(8)
        self.create_oval(x - r, cy - r, x + r, cy + r, fill=p["accent"], outline=p["card"], width=px(2))

    def _move(self, x, final):
        span = max(1.0, self.w - 2 * self.pad)
        frac = max(0.0, min(1.0, (x - self.pad) / span))
        v = self.lo + frac * (self.hi - self.lo)
        v = round(v / self.step) * self.step
        v = round(v, 4)
        if isinstance(self.step, int):
            v = int(v)
        v = max(self.lo, min(self.hi, v))
        if v != self.value:
            self.value = v
            self._draw()
            if self.cmd:
                self.cmd(v, False)
        if final and self.cmd:
            self.cmd(self.value, True)
