Logo
====

- Update Logo to Game:Play (with Gamepad-Buttons instead of dots)

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
  GamePlay.
- Add a gamepad configurator for new gamepads
- Add an icon for each recognized gamepad at the bottom right edge

GamePlay
========

- Add ability to stop / interrupt / re-focus game

Frontend
========

- Rename 'select' to 'focus'
- Select explicity with button press
- Don't start game directly but open a dialog on select
- Add support for categories
- Add support for sorting and hiding apps
