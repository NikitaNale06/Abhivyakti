ABHIVYAKTI FOR DESKTOP  (Python app - Windows / macOS / Linux)

It watches your screen (or just a box you choose), reads Indian Sign Language
fingerspelling (A-Z, 0-9) and shows the letters in a floating caption box in the
top corner of your screen. Same model and letter logic as the Chrome extension.
Everything runs on your computer.

INSTALL (needs Python 3.10 - 3.12)
  Windows:    double-click  run_windows.bat
  Mac/Linux:  ./run_mac_linux.sh      (Linux also needs:  sudo apt install python3-tk)
The first run creates a private environment and installs the packages (a few minutes).
On the first start the app downloads the small hand model (hand_landmarker.task, ~8 MB)
into the "models" folder. If you are offline, copy that file there yourself (the same
file the extension uses) and start again.

SIGN IN
  The app needs an account: sign in with Google, or with email + password (use "Create account"
  the first time). Sign out is on the Account tab.

USE
  1. Press "Start translating".
  2. Under "What to watch" pick Full screen, or "Selected area" and drag a box around
     the person signing / their video tile.  A tight box is much more accurate, because
     a full screen makes the hands very small.
  3. Sign in front of the camera / video - letters appear in the caption box.
  4. "Stop translating" pauses it; press Start again any time.

THE CAPTION BOX
  - Drag the header to move it anywhere. Double-click the header (or the dock button) to
    send it back to the corner.
  - Drag the bottom-right corner to resize.
  - Click inside to edit like normal text. Enter = new line.
  - Buttons: play/pause, backspace, clear, copy, save, minimize.
  - Save writes a .txt file into  Documents/Abhivyakti  and shows the path.
  - Minimize turns it into an orange pill at the bottom-left of what you are watching.
    It keeps translating; click the pill to reopen it (drag it to move it).

SETTINGS (Display tab)
  Theme (System / Light / Dark), caption corner, text size, mirror frames.
  Detection tuning is built in (confidence 0.70, hold 300 ms, space pause 1500 ms, frame 512).
  Settings are remembered in  %APPDATA%\Abhivyakti\settings.json  (or ~/.config/abhivyakti).

IF SOMETHING FAILS
  - "Setup needed": read the message in the app - usually a missing package or the
    hand model could not be downloaded.
  - Letters wrong: switch "Mirror frames", or draw a tighter area.
  - macOS: allow Screen Recording for Terminal / Python in System Settings > Privacy.
  - Linux: screen capture works on X11; Wayland desktops usually block it.
