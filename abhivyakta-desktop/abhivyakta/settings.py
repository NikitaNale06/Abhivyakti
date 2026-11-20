"""Persistent user settings (JSON in the per-user config folder)."""
import copy
import json
import os
import sys
from pathlib import Path

DEFAULTS = {
    "theme": "system",        # system | light | dark
    "source": "screen",       # screen | area
    "monitor": 0,             # index into the monitor list
    "area": None,             # {"left","top","width","height"} in screen pixels
    "minConf": 0.75,
    "holdMs": 300,
    "spaceMs": 1500,
    "maxSide": 1280,          # longest side of the frame sent to the hand model
    "mirror": False,
    "textSize": 18,           # caption text size in px
    "corner": "tr",           # tr | tl  (where the caption box starts)
    "overlay": {"x": None, "y": None, "w": None, "h": None},
    "pill": None,             # {"x","y"} of the minimized pill
}


def config_dir() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA") or (Path.home() / "AppData" / "Roaming"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME") or (Path.home() / ".config"))
    return base / "Abhivyakta"


class Settings(dict):
    def __init__(self):
        super().__init__(copy.deepcopy(DEFAULTS))
        self.path = config_dir() / "settings.json"
        self.load()

    def load(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        if not isinstance(data, dict):
            return
        for k, v in data.items():
            if k not in DEFAULTS:
                continue
            if k == "overlay" and isinstance(v, dict):
                self[k] = {**DEFAULTS["overlay"], **v}
            else:
                self[k] = v
        # keep numbers sane even if the file was edited by hand
        try:
            self["minConf"] = min(0.95, max(0.4, float(self["minConf"])))
            self["holdMs"] = int(min(900, max(100, float(self["holdMs"]))))
            self["spaceMs"] = int(min(4000, max(600, float(self["spaceMs"]))))
            self["maxSide"] = int(min(2000, max(384, float(self["maxSide"]))))
            self["textSize"] = int(min(40, max(12, float(self["textSize"]))))
        except (TypeError, ValueError):
            for k in ("minConf", "holdMs", "spaceMs", "maxSide", "textSize"):
                self[k] = DEFAULTS[k]
        if self["theme"] not in ("system", "light", "dark"):
            self["theme"] = "system"
        if self["corner"] not in ("tr", "tl"):
            self["corner"] = "tr"

    def save(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self, indent=2), encoding="utf-8")
            tmp.replace(self.path)
        except OSError:
            pass
