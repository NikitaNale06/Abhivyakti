ABHIVYAKTA  (Chrome / Edge extension, Manifest V3)

INSTALL
1. Copy your hand_landmarker.task into the  models/  folder (next to isl_mlp.bin).
2. Open chrome://extensions (or edge://extensions) and turn on Developer mode.
3. Click "Load unpacked" and pick this folder.
   (Updating from the older zip? Remove the old "ISL Video Translator" first, then load this.)
4. Open a YouTube video / Google Meet and play it. The Abhivyakta panel appears under the video.
   After editing any file: click the reload arrow on the extension AND refresh the page.

SIGN IN
- Click the extension icon and sign in (Google or email + password, or "Create account").
  Abhivyakti does nothing until you are signed in.

THE PANEL
- Type / edit freely in the text box; Enter = new line. Detected letters are inserted at your cursor.
- Drag the header to move it anywhere. Double-click the header (or the dock button) to snap it back under the video.
- Drag the bottom-right corner to resize. The size follows the video when its size changes (e.g. Meet tiles).
- Buttons: backspace, clear, copy, save (.txt download), minimize.
- Minimize turns it into an orange pill at the video's bottom-left; it keeps translating. Click it to reopen.
- Click the extension icon for settings: theme (System/Light/Dark), which videos, mirror frames.
- Alt+Shift+I turns Abhivyakta on/off.

IF SOMETHING FAILS
- Panel says "Setup needed" -> read the message; usually hand_landmarker.task is missing from models/.
- Letters look wrong -> toggle "Mirror frames" in the popup.
- Open the page console (F12) and look for "[Abhivyakta]" lines.
