"""Abhivyakta for desktop - run this file:  python main.py"""
import sys


def _check_tk():
    try:
        import tkinter  # noqa: F401
    except ImportError:
        sys.exit("Tkinter is missing. On Ubuntu/Debian run:  sudo apt install python3-tk\n"
                 "On Windows/macOS, reinstall Python from python.org (tick 'tcl/tk').")


if __name__ == "__main__":
    _check_tk()
    from abhivyakti.app import App
    App().run()
