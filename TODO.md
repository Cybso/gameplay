Paths
=====

- Validate paths on windows
- Prefer QFile and QDir over os.path where possible

QWebEngine
==========

- Check at runtime wether QWebView or QWebEngine exists. When both libraries are available prefer QWebView.


GamePlay
========

- Add ability to stop / interrupt / re-focus game
- Write app status into logfile
- Add the ability to restart the program
- Add a local icon directory and a fallback directory (for UI icons)

Setup
=====
- Create a setup screen that appears on the first start
- As a first implementation: show configuration paths
  and current configuration.

Frontend
========

- Rename 'select' to 'focus'
- Add support for favourites
- Add support for sorting
- Provide access to settings and configuration paths from the browser
- Add 'Setup' button
- Use 'icon://' for UI icons
