"""Full-screen drag-to-select overlay used to choose the part of the screen to watch."""
import tkinter as tk

from .theme import F, px


def geo(w, h, x, y):
    return f"{int(w)}x{int(h)}{int(x):+d}{int(y):+d}"


class RegionPicker:
    MIN_SIZE = 64

    def __init__(self, root, pal, bounds, on_done):
        """bounds = (left, top, right, bottom) of the whole desktop in screen pixels.
        on_done(rect_or_None) is called once, with {'left','top','width','height'} or None."""
        self.on_done = on_done
        self.left, self.top_, right, bottom = bounds
        self.pal = pal
        self.start = None
        self.rect_id = None
        self.done = False
        t = self.win = tk.Toplevel(root)
        t.overrideredirect(True)
        try:
            t.attributes("-topmost", True)
            t.attributes("-alpha", 0.5)
        except tk.TclError:
            pass
        t.configure(bg="#000000")
        t.geometry(geo(right - self.left, bottom - self.top_, self.left, self.top_))
        c = self.canvas = tk.Canvas(t, bg="#000000", highlightthickness=0, cursor="crosshair")
        c.pack(fill="both", expand=True)
        c.create_text(px(24), px(24), anchor="nw", fill="#ffffff", font=F(14, "bold"),
                      text="Drag a box around the signer's hands / video   -   Esc to cancel")
        c.bind("<ButtonPress-1>", self._down)
        c.bind("<B1-Motion>", self._move)
        c.bind("<ButtonRelease-1>", self._up)
        t.bind("<Escape>", lambda e: self._finish(None))
        t.update_idletasks()
        t.focus_force()

    def _down(self, e):
        self.start = (e.x, e.y)
        if self.rect_id:
            self.canvas.delete(self.rect_id)
        self.rect_id = self.canvas.create_rectangle(e.x, e.y, e.x, e.y, outline=self.pal["accent"], width=px(3))

    def _move(self, e):
        if self.start and self.rect_id:
            self.canvas.coords(self.rect_id, self.start[0], self.start[1], e.x, e.y)

    def _up(self, e):
        if not self.start:
            return
        x0, x1 = sorted((self.start[0], e.x))
        y0, y1 = sorted((self.start[1], e.y))
        w, h = x1 - x0, y1 - y0
        if w < self.MIN_SIZE or h < self.MIN_SIZE:
            self.start = None
            if self.rect_id:
                self.canvas.delete(self.rect_id)
                self.rect_id = None
            return
        self._finish(dict(left=int(self.left + x0), top=int(self.top_ + y0), width=int(w), height=int(h)))

    def _finish(self, rect):
        if self.done:
            return
        self.done = True
        try:
            self.win.destroy()
        except tk.TclError:
            pass
        self.on_done(rect)
