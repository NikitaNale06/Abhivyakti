"""Colours, fonts and DPI helpers - the same orange/neutral look as the Abhivyakti extension."""
import subprocess
import sys
import tkinter as tk
from tkinter import font as tkfont

LIGHT = dict(
    name="light", bg="#ffffff", card="#ffffff", field="#f5f5f6", border="#e8e8ec",
    text="#18181b", muted="#8a8a93", accent="#ea580c", accent_hover="#d94f08",
    soft="#fff1e8", onaccent="#ffffff", ok="#16a34a", warn="#f59e0b", err="#dc2626", errbg="#fdecec",
)
DARK = dict(
    name="dark", bg="#0d0d0f", card="#17171a", field="#202024", border="#2b2b30",
    text="#f5f5f6", muted="#9c9ca5", accent="#fb7a3c", accent_hover="#ff8c52",
    soft="#2b2119", onaccent="#ffffff", ok="#22c55e", warn="#f59e0b", err="#f87171", errbg="#2a1718",
)
# the floating caption box uses slightly different surfaces (same as the extension panel)
OV_LIGHT = dict(bg="#ffffff", card="#ffffff", field="#f4f4f5", border="#e4e4e7", muted="#71717a")
OV_DARK = dict(bg="#18181b", card="#18181b", field="#232327", border="#34343a", muted="#a1a1aa")


def palette(dark, surface="app"):
    p = dict(DARK if dark else LIGHT)
    if surface == "overlay":
        p.update(OV_DARK if dark else OV_LIGHT)
    return p


def shade(hex_color, amount):
    """amount > 0 lightens towards white, amount < 0 darkens towards black."""
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    t = 255 if amount > 0 else 0
    a = abs(amount)
    r, g, b = (int(round(c + (t - c) * a)) for c in (r, g, b))
    return "#%02x%02x%02x" % (r, g, b)


def system_is_dark():
    try:
        if sys.platform == "win32":
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            )
            return winreg.QueryValueEx(key, "AppsUseLightTheme")[0] == 0
        if sys.platform == "darwin":
            r = subprocess.run(["defaults", "read", "-g", "AppleInterfaceStyle"],
                               capture_output=True, text=True, timeout=2)
            return "dark" in r.stdout.lower()
        r = subprocess.run(["gsettings", "get", "org.gnome.desktop.interface", "color-scheme"],
                           capture_output=True, text=True, timeout=2)
        return "dark" in r.stdout.lower()
    except Exception:
        return False


# ---------------------------------------------------------------- DPI / scale
_SCALE = 1.0


def enable_dpi_awareness():
    """Must run before the first Tk window so screen pixels match the capture pixels."""
    if sys.platform != "win32":
        return
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def init_scale(root):
    global _SCALE
    try:
        _SCALE = max(1.0, root.winfo_fpixels("1i") / 96.0)
    except tk.TclError:
        _SCALE = 1.0


def px(v):
    return int(round(v * _SCALE))


# ---------------------------------------------------------------- fonts
_UI = "TkDefaultFont"
_DEV = "TkDefaultFont"


def init_fonts(root):
    global _UI, _DEV
    fams = set(tkfont.families(root))
    for c in ("Segoe UI", "SF Pro Text", "Helvetica Neue", "Inter", "Noto Sans", "DejaVu Sans"):
        if c in fams:
            _UI = c
            break
    for c in ("Nirmala UI", "Noto Sans Devanagari", "Kohinoor Devanagari", "Mangal",
              "Lohit Devanagari", "DejaVu Sans"):
        if c in fams:
            _DEV = c
            break


def F(size, weight="normal"):
    """UI font. size is in points (a 13px web font is about 10pt)."""
    return (_UI, int(round(size)), weight)


def FD(size, weight="bold"):
    """Devanagari-capable font for the 'अ' logo."""
    return (_DEV, int(round(size)), weight)
