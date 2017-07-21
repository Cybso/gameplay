Paths
=====

- Validate paths on windows
- Prefer QFile and QDir over os.path where possible

QWebEngine
==========

- Check at runtime wether QWebView or QWebEngine exists. When both libraries are available prefer QWebView.

Gamepad.js
==========

- Don't suspend button query in hidden mode but restrict it to the check
  for some Hotkeys (e.g. START+SELECT for more than 3 seconds).
  If found, trigger an event that interrups the current game and focuses
  Yagala.

Yagala
======

- Add ability to stop / interrupt / re-focus game

Frontend
========

- Rename 'select' to 'focus'
- Select explicity with button press
- Don't start game directly but open a dialog on select
- Add support for categories
